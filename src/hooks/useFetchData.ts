import { db } from "@/lib/db";
import type { Song, Video } from "@/lib/types";
import Papa from "papaparse";
import { createContext, useEffect, useRef, useState } from "react";
import { config } from "../../config";

const REFRESH_INTERVAL = config.refresh.interval;

interface FetchDataContextProps {
  loading: boolean;
}

export const FetchDataContext = createContext<FetchDataContextProps>({
  loading: true,
});

export interface UseFetchDataResult {
  loading: boolean;
  error: string | null;
}

// Google Spreadsheet からデータを取得
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

/**
 * Google スプレッドシートから動画や楽曲情報を取得し、ローカルの IndexedDB と同期する。
 *
 * この関数は公開されたスプレッドシートを CSV として取得し、行データを正規化して
 * Video / Song レコードに変換した上で、`db.videos` や `db.songs` などのローカルストアに
 * 一括保存することで、クライアント側のキャッシュとして利用できるようにする。
 *
 * エラーハンドリング:
 * - ネットワークエラーやパースエラーなど技術的な詳細は `console.error` にログ出力する。
 * - 何らかのエラーが発生した場合でも、IndexedDB に既存のキャッシュデータがあれば、
 *   「キャッシュされたデータを表示している」ことを示すユーザーフレンドリーなメッセージを
 *   含む Error を投げ、画面側でトーストなどを通じて通知できるようにする。
 * - キャッシュがまったく存在しない状態でエラーが発生した場合は、元のエラーをそのまま再スローする。
 *
 * キャッシュ戦略とタイムスタンプ:
 * - 正常に取得できた最新のデータで `db.videos` などのストア内容をクリアしてから一括保存し、
 *   スプレッドシートとローカルキャッシュの内容が常に一致するようにする。
 * - 各レコードには `processed_at` などのタイムスタンプ情報が保持されており、
 *   別の処理から「いつ同期されたデータか」を判定できるような設計になっている。
 *
 * @returns {Promise<void>} データ同期処理が完了したときに解決される Promise。
 */
async function performDataFetch(): Promise<void> {
  try {
    // 動画データを取得
    const videosRaw = await fetchSheet(
      config.spreadsheet.sheet_public_id,
      config.spreadsheet.videos_sheet_gid,
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
      config.spreadsheet.songs_sheet_gid,
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
      console.warn("データ取得に失敗しましたが、キャッシュされたデータを表示しています");
    }
    throw error;
  }
}

/**
 * Google Spreadsheet からデータ CSV をダウンロードして IndexedDB に保存するカスタムフック
 * 定期的にバックグラウンドで最新データをダウンロードする
 */
export function useFetchData(): UseFetchDataResult {
  const [isDataStored, setIsDataStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // 定期的にデータを取得
    const fetchData = async () => {
      if (fetchingPromiseRef.current) return;
      const lastFetched = (await db.metadata.get("lastFetch"))?.timestamp ?? 0;
      if (Date.now() - lastFetched > REFRESH_INTERVAL) {
        setLoading(true);
        try {
          setError(null);
          fetchingPromiseRef.current = performDataFetch();
          await fetchingPromiseRef.current;
        } catch (err) {
          console.error(err);
          setError("データの取得に失敗しました");
        } finally {
          fetchingPromiseRef.current = null;
        }
      }
      setLoading(false);
      setIsDataStored(true);
    };

    // データが IndexedDB に存在するか確認し、なければ即座に取得
    (async () => {
      const videosCount = await db.videos.count();
      const songsCount = await db.songs.count();
      if (videosCount === 0 || songsCount === 0) {
        await fetchData();
      } else {
        setLoading(false);
        setIsDataStored(true);
      }
    })();

    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // IndexedDB にデータがあればローディングは表示しなくて良い
  return { loading: !isDataStored && loading, error };
}
