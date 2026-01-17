import { db } from "@/lib/db";
import { useContext, useEffect, useState } from "react";
import { FetchDataContext } from "./useFetchData";

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
  const { loading: fetchDataLoading } = useContext(FetchDataContext);

  useEffect(() => {
    const fetchData = async () => {
      if (fetchDataLoading) return;
      setLoading(true);
      setError(null);
      try {
        let titles: string[];
        if (selectedArtist.length > 0) {
          titles = await getTitlesForArtist(selectedArtist);
        } else {
          titles = await getAllTitles();
        }
        setAvailableTitles(titles);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("曲タイトル一覧の取得に失敗しました");
        setAvailableTitles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedArtist, fetchDataLoading]);

  return { availableTitles, loading: loading || fetchDataLoading, error };
}
