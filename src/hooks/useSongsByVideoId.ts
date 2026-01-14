import { useState, useEffect } from "react";
import type { Song } from "@/lib/types";
import { getSongsByVideoId } from "@/lib/db";

export interface UseSongsByVideoIdResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
}

export function useSongsByVideoId(videoId: string): UseSongsByVideoIdResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // モーダルが開いていて videoId がある場合のみ取得
    getSongsByVideoId(videoId)
      .then((songsData) => {
        setSongs(songsData);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "曲情報の取得に失敗しました"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [videoId]);

  return { songs, loading, error };
}
