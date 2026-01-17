import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useFetchData } from "./useFetchData";

export interface UseArtistsResult {
  artists: string[];
  loading: boolean;
  error: string | null;
}

// アーティスト一覧を取得
async function getArtists(): Promise<string[]> {
  const songs = await db.songs.toArray();
  const artistSet = new Set(
    songs
      .filter((s) => s.edited)
      .map((s) => s.artist)
      .filter((a): a is string => a != null && a !== "")
  );
  return Array.from(artistSet).sort();
}

export function useArtists(): UseArtistsResult {
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasCache, error: fdError } = useFetchData();

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

  return { artists, loading: loading || !hasCache, error: error || fdError };
}
