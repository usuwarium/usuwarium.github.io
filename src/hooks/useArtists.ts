import { useState, useEffect } from "react";
import { getArtists } from "@/lib/db";

export interface UseArtistsResult {
  artists: string[];
  loading: boolean;
  error: string | null;
}

// アーティスト一覧を取得
export function useArtists(): UseArtistsResult {
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArtists()
      .then((artistList) => {
        setArtists(artistList);
        setError(null);
      })
      .catch((err) => {
        console.error("アーティスト一覧の取得エラー:", err);
        setError(err instanceof Error ? err.message : "アーティスト一覧の取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { artists, loading, error };
}
