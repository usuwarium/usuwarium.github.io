import { useState, useEffect } from "react";
import { getTitlesForArtist, getAllTitles } from "@/lib/db";

export interface UseArtistSongsResult {
  availableTitles: string[];
  loading: boolean;
  error: string | null;
}

// 選択されたアーティストの楽曲タイトル一覧を取得
export function useArtistSongs(selectedArtist: string): UseArtistSongsResult {
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const promise = selectedArtist.length > 0 ? getTitlesForArtist(selectedArtist) : getAllTitles();
    promise
      .then((titles) => {
        setAvailableTitles(titles);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error("タイトル一覧の取得エラー:", err);
        setAvailableTitles([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : "タイトル一覧の取得に失敗しました");
      });
  }, [selectedArtist]);

  return { availableTitles, loading, error };
}
