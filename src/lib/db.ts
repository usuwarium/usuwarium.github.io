import Dexie, { type Table } from "dexie";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { config } from "../../config";
import { matchesQuickFilter } from "./filter";
import { type Song, type SongId, type Video, type VideoId } from "./types";

export type PlaylistId = string;

export interface Playlist {
  id: PlaylistId;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  playlist_id: PlaylistId;
  song_id: SongId;
  order: number;
}

export interface PlaylistSong extends PlaylistItem, Song {}

interface Metadata {
  key: string;
  timestamp: number;
}

// Dexieデータベースクラス
class UsuwariumDB extends Dexie {
  videos!: Table<Video, VideoId>;
  songs!: Table<Song, SongId>;
  metadata!: Table<Metadata>;
  playlists!: Table<Playlist>;
  playlistItems!: Table<PlaylistItem>;

  constructor() {
    super("UsuwariumDB");
    this.version(1).stores({
      videos: "&video_id, published_at, like_count, view_count",
      songs: "&song_id, video_id, video_published_at, artist, title, start_time",
      metadata: "key",
      playlists: "&id, name, created_at, updated_at",
      playlistItems: "[playlist_id+song_id], order",
    });
  }
}

const db = new UsuwariumDB();

// Google Sheetsからデータを取得
function fetchSheet(sheetPublicId: string, sheetGid: string): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/e/${sheetPublicId}/pub?output=csv&gid=${sheetGid}`;
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        console.error(`Error fetching sheet with gid ${sheetGid}:`, error);
        reject(error);
      },
    });
  });
}

// データ更新が必要かどうかをチェック
async function checkNeedsFetch(): Promise<boolean> {
  const metadata = await db.metadata.get("lastFetch");
  const videosCount = await db.videos.count();
  const songsCount = await db.songs.count();

  return (
    videosCount === 0 ||
    songsCount === 0 ||
    !metadata ||
    Date.now() - metadata.timestamp > config.cache.duration
  );
}

let fetchingPromise: Promise<void> | null = null;

async function fetchDataIfNeeded(): Promise<void> {
  const needsFetch = await checkNeedsFetch();
  if (!needsFetch) {
    return;
  }
  if (fetchingPromise) {
    return fetchingPromise;
  }
  fetchingPromise = performDataFetch().finally(() => {
    fetchingPromise = null;
  });
  return fetchingPromise;
}

// データ同期関数
async function performDataFetch(): Promise<void> {
  try {
    // 動画データを取得
    const videosRaw = await fetchSheet(
      config.spreadsheet.sheet_public_id,
      config.spreadsheet.videos_sheet_gid
    );

    if (!videosRaw || videosRaw.length === 0) {
      console.warn("動画がありません");
    } else {
      // 動画データを一括保存
      const videosData = videosRaw
        .map((video: Record<string, string>) => {
          // tagsが文字列の場合はパース、配列の場合はそのまま
          let tags: string[] = [];
          if (video.tags) {
            try {
              tags = typeof video.tags === "string" ? JSON.parse(video.tags) : video.tags;
            } catch {
              tags =
                typeof video.tags === "string"
                  ? video.tags.split(",").map((t: string) => t.trim())
                  : [];
            }
          }

          return {
            video_id: video.video_id || "",
            channel_id: video.channel_id || "",
            title: video.title || "",
            published_at: video.published_at || "",
            tags: tags,
            songs: [] as Song[],
            view_count: parseInt(video.view_count, 10) || 0,
            like_count: parseInt(video.like_count, 10) || 0,
            duration: parseInt(video.duration, 10) || 0,
            processed_at: video.processed_at,
            singing: video.singing === "true",
            available: video.available.toLowerCase() === "true",
            completed: video.completed.toLowerCase() === "true",
          };
        })
        .filter((video) => video.available);

      await db.videos.clear();
      await db.videos.bulkPut(videosData);
    }

    // 曲データを取得
    const songsRaw = await fetchSheet(
      config.spreadsheet.sheet_public_id,
      config.spreadsheet.songs_sheet_gid
    );

    if (songsRaw && songsRaw.length > 0) {
      // 曲データをフィルタリングして一括保存
      const songsData = songsRaw
        .filter((song: Record<string, string>) => {
          const artist = song.artist || "";
          return artist && artist !== "Opening" && artist !== "Closing";
        })
        .map((song: Record<string, string>) => {
          // tagsが文字列の場合はパース、配列の場合はそのまま
          let tags: string[] = [];
          if (song.tags) {
            try {
              tags = typeof song.tags === "string" ? JSON.parse(song.tags) : song.tags;
            } catch {
              tags =
                typeof song.tags === "string"
                  ? song.tags.split(",").map((t: string) => t.trim())
                  : [];
            }
          }
          return {
            song_id: song.song_id,
            video_id: song.video_id || "",
            video_title: song.video_title || "",
            video_published_at: song.video_published_at || "",
            title: song.title || "",
            artist: song.artist,
            start_time: parseInt(song.start_time, 10) || 0,
            end_time: parseInt(song.end_time, 10),
            tags: tags,
            edited: song.edited.toLowerCase() === "true",
          };
        });

      await db.songs.clear();
      await db.songs.bulkPut(songsData);
    }

    // 同期完了のタイムスタンプを保存
    await db.metadata.put({ key: "lastFetch", timestamp: Date.now() });
  } catch (error) {
    console.error("データ同期エラー:", error);
    // 古いキャッシュがあるかチェック
    const videosCount = await db.videos.count();
    const songsCount = await db.songs.count();
    if (videosCount > 0 || songsCount > 0) {
      throw new Error("データ取得に失敗しましたが、キャッシュされたデータを表示しています");
    }
    throw error;
  }
}

/**
 * 検索クエリを解析してフィルタリング条件を適用する
 * @param items フィルタ対象のアイテム配列
 * @param searchQuery 検索クエリ（スペース区切り、`-`で否定条件）
 * @param getSearchableText アイテムから検索対象のテキストを取得する関数
 * @returns フィルタリングされたアイテム配列
 */
function applySearchQuery<T>(
  items: T[],
  searchQuery: string | undefined,
  getSearchableText: (item: T) => string[]
): T[] {
  if (!searchQuery || !searchQuery.trim()) {
    return items;
  }

  // スペース区切りでトークンに分割
  const tokens = searchQuery.trim().split(/\s+/);

  // 肯定条件と否定条件に分ける
  const includeTokens = tokens
    .filter((token) => !token.startsWith("-"))
    .map((token) => token.toLowerCase());

  const excludeTokens = tokens
    .filter((token) => token.startsWith("-") && token.length > 1)
    .map((token) => token.slice(1).toLowerCase());

  return items.filter((item) => {
    const searchableTexts = getSearchableText(item).map((text) => text.toLowerCase());

    // 肯定条件: すべてのトークンが検索対象テキストのいずれかに含まれる必要がある
    const matchesInclude = includeTokens.every((token) =>
      searchableTexts.some((text) => text.includes(token))
    );

    // 否定条件: いずれかの除外トークンが検索対象テキストに含まれていたら除外
    const matchesExclude = excludeTokens.some((token) =>
      searchableTexts.some((text) => text.includes(token))
    );

    return matchesInclude && !matchesExclude;
  });
}

// 動画クエリ関数
export async function queryVideos(params: {
  searchQuery?: string;
  selectedFilter?: string | null;
  sortBy?: "published_at" | "like_count" | "view_count" | null;
  sortOrder?: "asc" | "desc";
  page: number;
  itemsPerPage: number;
}): Promise<[Video[], number]> {
  const { searchQuery, selectedFilter, sortBy, sortOrder = "desc", page, itemsPerPage } = params;

  await fetchDataIfNeeded();

  let collection;

  // ソート処理
  if (sortBy === "published_at") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("published_at")
        : db.videos.orderBy("published_at").reverse();
  } else if (sortBy === "like_count") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("like_count")
        : db.videos.orderBy("like_count").reverse();
  } else if (sortBy === "view_count") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("view_count")
        : db.videos.orderBy("view_count").reverse();
  } else {
    collection = db.videos.toCollection();
  }

  // フィルタ処理
  let results = await collection.toArray();

  // クイックフィルタを適用
  if (selectedFilter) {
    results = results.filter((v) => matchesQuickFilter(v, selectedFilter));
  }

  // 検索クエリを適用
  results = applySearchQuery(results, searchQuery, (video) => [video.title, ...video.tags]);

  // 動画の総数
  const count = results.length;

  // ページネーション
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  return [results.slice(start, end), count];
}

// 曲クエリ関数
export async function querySongs(params: {
  freeSearch?: string;
  selectedArtist?: string;
  selectedTitle?: string;
  sortBy: "published_at" | "artist" | "title";
  sortOrder: "asc" | "desc";
}): Promise<{ songs: Song[]; count: number }> {
  const { freeSearch, selectedArtist, selectedTitle, sortBy, sortOrder } = params;

  await fetchDataIfNeeded();

  let collection = db.songs.toCollection();

  // アーティストとタイトルのフィルタリング
  if (selectedArtist) {
    collection = collection.filter((song) => song.artist === selectedArtist);
  }
  if (selectedTitle) {
    collection = collection.filter((song) => song.title === selectedTitle);
  }

  let results = (await collection.toArray()).filter((s) => s.edited);

  // 検索クエリを適用
  results = applySearchQuery(results, freeSearch, (song) => [
    song.title,
    song.artist || "",
    song.video_title,
  ]);
  const count = results.length;

  // 指定順、歌唱順に並べ替える
  // IndexedDBの複合インデックスでは対応できないためArrayにしてからソートする
  results.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "published_at") {
      comparison = a.video_published_at.localeCompare(b.video_published_at);
      // 同じ動画内での歌唱順でソート
      // 降順指定でも歌唱順は昇順に固定
      if (comparison === 0) {
        return a.start_time - b.start_time;
      }
    } else if (sortBy === "artist") {
      const artistA = a.artist || "";
      const artistB = b.artist || "";
      comparison = artistA.localeCompare(artistB, "ja");
    } else if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title, "ja");
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { songs: results, count };
}

// アーティスト一覧を取得
export async function getArtists(): Promise<string[]> {
  await fetchDataIfNeeded();
  const songs = await db.songs.toArray();
  const artistSet = new Set(
    songs
      .filter((s) => s.edited)
      .map((s) => s.artist)
      .filter((a): a is string => a != null && a !== "")
  );
  return Array.from(artistSet).sort();
}

// 特定のアーティストの楽曲タイトル一覧を取得
export async function getTitlesForArtist(artist: string): Promise<string[]> {
  await fetchDataIfNeeded();
  const songs = await db.songs.where("artist").equals(artist).toArray();
  const titleSet = new Set(songs.filter((s) => s.edited).map((s) => s.title));
  return Array.from(titleSet).sort();
}

// 全楽曲タイトル一覧を取得
export async function getAllTitles(): Promise<string[]> {
  await fetchDataIfNeeded();
  const songs = await db.songs.toArray();
  const titleSet = new Set(songs.filter((s) => s.edited).map((s) => s.title));
  return Array.from(titleSet).sort();
}

export function getThumbnailUrl(
  video: Video,
  size: "default" | "mqdefault" | "hqdefault" = "mqdefault"
): string {
  return `https://i.ytimg.com/vi/${video.video_id}/${size}.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

// 動画IDから歌唱情報を取得
export async function getSongsByVideoId(videoId: string): Promise<Song[]> {
  await fetchDataIfNeeded();
  return (await db.songs.where("video_id").equals(videoId).sortBy("start_time")).filter(
    (s) => s.edited
  );
}

// キャッシュをリセット
export async function resetCache(): Promise<void> {
  await db.videos.clear();
  await db.songs.clear();
  await db.metadata.clear();
}

// ===== プレイリスト操作関数 =====

// プレイリスト一覧を取得
export async function getAllPlaylists(): Promise<Playlist[]> {
  return await db.playlists.orderBy("updated_at").reverse().toArray();
}

// プレイリストを作成
export async function createPlaylist(name: string): Promise<PlaylistId> {
  const now = new Date().toISOString();
  const id = nanoid();
  await db.playlists.add({
    id,
    name,
    created_at: now,
    updated_at: now,
  });
  return id;
}

// プレイリストを指定されたIDとアイテムで復元
export async function restorePlaylist(
  id: PlaylistId,
  name: string,
  items: Array<{ song_id: SongId; order: number }>,
  created_at: string,
  updated_at: string
): Promise<void> {
  await db.playlists.add({
    id,
    name,
    created_at,
    updated_at,
  });
  await db.playlistItems.bulkAdd(
    items.map((item) => ({
      playlist_id: id,
      song_id: item.song_id,
      order: item.order,
    }))
  );
}

// プレイリストを更新
export async function updatePlaylist(playlistId: PlaylistId, name: string): Promise<void> {
  await db.playlists.update(playlistId, {
    name,
    updated_at: new Date().toISOString(),
  });
}

// プレイリストを削除
export async function deletePlaylist(playlistId: PlaylistId): Promise<void> {
  await db.playlists.delete(playlistId);
  await db.playlistItems.where("playlist_id").equals(playlistId).delete();
}

// プレイリストに複数の曲を追加
export async function addSongsToPlaylist(playlistId: PlaylistId, songIds: SongId[]): Promise<void> {
  const songs = await db.playlistItems.where("playlist_id").equals(playlistId).toArray();
  let maxOrder = songs.length > 0 ? Math.max(...songs.map((s) => s.order)) : 0;

  for (const songId of songIds) {
    await db.playlistItems.add({
      playlist_id: playlistId,
      song_id: songId,
      order: ++maxOrder,
    });
  }

  await db.playlists.update(playlistId, {
    updated_at: new Date().toISOString(),
  });
}

// プレイリストに曲を特定の位置に追加
export async function addSongToPlaylistAtPosition(
  playlistId: PlaylistId,
  songId: SongId,
  position: number
): Promise<void> {
  const songs = await db.playlistItems.where("playlist_id").equals(playlistId).sortBy("order");

  // 指定された位置以降の曲の順序を+1する
  const updatesPromise = songs
    .filter((s) => s.order >= position)
    .map((s) => db.playlistItems.update([s.playlist_id, s.song_id], { order: s.order + 1 }));
  await Promise.all(updatesPromise);

  // 指定された位置に曲を追加
  await db.playlistItems.add({
    playlist_id: playlistId,
    song_id: songId,
    order: position,
  });

  await db.playlists.update(playlistId, {
    updated_at: new Date().toISOString(),
  });
}

// プレイリストから曲を削除
export async function removeSongsFromPlaylist(
  playlistId: PlaylistId,
  songIds: SongId[]
): Promise<void> {
  for (const songId of songIds) {
    const playlistItem = await db.playlistItems.get([playlistId, songId]);
    if (playlistItem) {
      await db.playlistItems.delete([playlistId, songId]);
    }
  }
  await db.playlists.update(playlistId, {
    updated_at: new Date().toISOString(),
  });
}

// プレイリスト内の曲の順序を変更
export async function reorderPlaylistItems(
  playlistId: PlaylistId,
  songIds: SongId[]
): Promise<void> {
  const playlistItems = await db.playlistItems.where("playlist_id").equals(playlistId).toArray();

  for (let i = 0; i < songIds.length; i++) {
    const item = playlistItems.find((pi) => pi.song_id === songIds[i]);
    if (item) {
      await db.playlistItems.update([playlistId, item.song_id!], {
        order: i + 1,
      });
    }
  }

  await db.playlists.update(playlistId, {
    updated_at: new Date().toISOString(),
  });
}

// プレイリスト内の曲を取得（楽曲情報も含む）
export async function getPlaylistSongs(): Promise<PlaylistSong[]> {
  const playlistItems = await db.playlistItems.toCollection().sortBy("order");
  const songs = await db.songs.bulkGet(playlistItems.map((pi) => pi.song_id));
  return playlistItems
    .map((item, index) => {
      if (songs[index]) {
        return { ...item, ...songs[index] } as PlaylistSong;
      } else {
        return undefined;
      }
    })
    .filter((ps) => !!ps);
}

// プレイリスト内の曲IDを取得
export async function getPlaylistItemIds(playlistId: PlaylistId): Promise<SongId[]> {
  const playlistItems = await db.playlistItems
    .where("playlist_id")
    .equals(playlistId)
    .sortBy("order");

  return playlistItems.map((pi) => pi.song_id!);
}

// 全プレイリストデータをエクスポート
export async function exportPlaylists(): Promise<string> {
  const playlists = await db.playlists.toArray();
  const playlistItems = await db.playlistItems.toArray();

  const data = {
    playlists,
    playlistItems,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

// プレイリストデータをインポート
export async function importPlaylists(jsonData: string): Promise<string | null> {
  const errors: string[] = [];
  let skippedPlaylists = 0;
  let skippedItems = 0;

  try {
    const data = JSON.parse(jsonData);

    if (!data.playlists || !data.playlistItems) {
      throw new Error("Invalid playlist data format");
    }

    // インポートされたプレイリストIDを記録
    const importedPlaylistIds = new Set<string>();
    const validPlaylists: Playlist[] = [];
    const playlistsToUpdate: { id: string; updates: Partial<Playlist> }[] = [];

    // プレイリストのバリデーション
    for (const playlist of data.playlists) {
      if (!playlist.id || typeof playlist.id !== "string") {
        skippedPlaylists++;
        errors.push(`プレイリスト: IDが不正です`);
        continue;
      }
      if (!playlist.name || typeof playlist.name !== "string") {
        skippedPlaylists++;
        errors.push(`プレイリスト「${playlist.id}」: 名前が不正です`);
        continue;
      }
      if (!playlist.created_at || typeof playlist.created_at !== "string") {
        skippedPlaylists++;
        errors.push(`プレイリスト「${playlist.name}」: 作成日時が不正です`);
        continue;
      }
      if (!playlist.updated_at || typeof playlist.updated_at !== "string") {
        skippedPlaylists++;
        errors.push(`プレイリスト「${playlist.name}」: 更新日時が不正です`);
        continue;
      }

      const playlistId = playlist.id;

      // 同じidを持つプレイリストを検索
      const existing = await db.playlists.get(playlistId);

      if (existing) {
        // 既存のプレイリストを上書き
        playlistsToUpdate.push({
          id: playlistId,
          updates: {
            name: playlist.name,
            created_at: playlist.created_at,
            updated_at: playlist.updated_at,
          },
        });
      } else {
        // 新規プレイリストを追加
        validPlaylists.push({
          id: playlistId,
          name: playlist.name,
          created_at: playlist.created_at,
          updated_at: playlist.updated_at,
        });
      }
      importedPlaylistIds.add(playlistId);
    }

    // プレイリストアイテムのバリデーション
    const validPlaylistItems: PlaylistItem[] = [];
    for (const playlistItem of data.playlistItems) {
      if (!playlistItem.playlist_id || typeof playlistItem.playlist_id !== "string") {
        skippedItems++;
        errors.push(`曲: プレイリストIDが不正です`);
        continue;
      }
      if (!playlistItem.song_id || typeof playlistItem.song_id !== "string") {
        skippedItems++;
        errors.push(`曲: 曲IDが不正です`);
        continue;
      }
      if (typeof playlistItem.order !== "number" || !Number.isFinite(playlistItem.order)) {
        skippedItems++;
        errors.push(`曲「${playlistItem.song_id}」: 順序が不正です`);
        continue;
      }

      // インポートされたプレイリストにのみ曲を追加
      if (!importedPlaylistIds.has(playlistItem.playlist_id)) {
        skippedItems++;
        continue;
      }

      validPlaylistItems.push({
        playlist_id: playlistItem.playlist_id,
        song_id: playlistItem.song_id,
        order: playlistItem.order,
      });
    }

    // データベースに一括登録
    try {
      // 既存のプレイリストアイテムを削除（更新対象のプレイリストのみ）
      for (const { id } of playlistsToUpdate) {
        await db.playlistItems.where("playlist_id").equals(id).delete();
      }

      // プレイリストを更新
      for (const { id, updates } of playlistsToUpdate) {
        await db.playlists.update(id, updates);
      }

      // 新規プレイリストを追加
      if (validPlaylists.length > 0) {
        await db.playlists.bulkAdd(validPlaylists);
      }

      // プレイリストアイテムを追加
      if (validPlaylistItems.length > 0) {
        await db.playlistItems.bulkPut(validPlaylistItems);
      }
    } catch (err) {
      console.error("Failed to import playlists:", err);
      throw new Error("データベースへの登録に失敗しました");
    }

    // エラーメッセージを生成
    if (errors.length > 0) {
      // 詳細はコンソールに出力
      console.error("インポート時に以下の問題が発生しました:");
      errors.forEach((error) => console.error(`  - ${error}`));

      // ユーザーには簡潔なメッセージを返す
      const messages: string[] = [];
      if (skippedPlaylists > 0) {
        messages.push(`${skippedPlaylists}個のプレイリストを読み込めませんでした`);
      }
      if (skippedItems > 0) {
        messages.push(`${skippedItems}曲を読み込めませんでした`);
      }
      return messages.join("。") + "。";
    }

    return null;
  } catch (error) {
    console.error("Failed to import playlists:", error);
    throw error;
  }
}
