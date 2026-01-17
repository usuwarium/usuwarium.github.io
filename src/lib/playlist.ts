import { nanoid } from "nanoid";
import { db } from "./db";
import { type Song, type SongId } from "./types";

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
