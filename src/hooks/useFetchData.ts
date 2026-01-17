import { db } from "@/lib/db";
import type { Song, Video } from "@/lib/types";
import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import { config } from "../../config";

const TICKER_INTERVAL = 60000;
const REFRESH_INTERVAL = config.cache.duration;

export interface UseFetchDataResult {
  hasCache: boolean;
  loading: boolean;
  error: string | null;
}

// Google Spreadsheetsからデータを取得
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
          } as Video;
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
 * Google Spreadsheet からデータ CSV をダウンロードして IndexedDB に保存するカスタムフック
 * １時間に１回、最新データをダウンロードする
 */
export function useFetchData(): UseFetchDataResult {
  const [hasCache, setHasCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (fetchingPromiseRef.current) return;
      const videosCount = await db.videos.count();
      const songsCount = await db.songs.count();
      const lastFetched = (await db.metadata.get("lastFetch"))?.timestamp ?? 0;
      setHasCache(videosCount !== 0);
      if (videosCount === 0 || songsCount === 0 || Date.now() - lastFetched > REFRESH_INTERVAL) {
        const promise = performDataFetch();
        fetchingPromiseRef.current = promise;
        try {
          setLoading(true);
          setError(null);
          await promise;
        } catch (err) {
          console.error(err);
          setError("データの取得に失敗しました");
        } finally {
          setLoading(false);
          setHasCache(true);
          fetchingPromiseRef.current = null;
        }
      }
    };

    fetchData();

    const id = setInterval(fetchData, TICKER_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // データを更新しても利用元には通知せず自動更新はしない
  // 次回読込時に最新データが読み込まれるので十分
  return { hasCache, loading, error };
}
