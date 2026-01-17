import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { useFetchData } from "./useFetchData";

export interface UseArtistSongsResult {
  availableTitles: string[];
  loading: boolean;
  error: string | null;
}

// 特定のアーティストの楽曲タイトル一覧を取得
async function getTitlesForArtist(artist: string): Promise<string[]> {
  const songs = await db.songs.where("artist").equals(artist).toArray();
  const titleSet = new Set(songs.filter((s) => s.edited).map((s) => s.title));
  return Array.from(titleSet).sort();
}

// 全楽曲タイトル一覧を取得
async function getAllTitles(): Promise<string[]> {
  const songs = await db.songs.toArray();
  const titleSet = new Set(songs.filter((s) => s.edited).map((s) => s.title));
  return Array.from(titleSet).sort();
}

// 選択されたアーティストの楽曲タイトル一覧を取得
export function useArtistSongs(selectedArtist: string): UseArtistSongsResult {
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasCache, error: fdError } = useFetchData();

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

  return { availableTitles, loading: loading || !hasCache, error: error || fdError };
}
