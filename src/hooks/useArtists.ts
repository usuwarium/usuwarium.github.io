import { db } from "@/lib/db";
import { useContext, useEffect, useState } from "react";
import { FetchDataContext } from "./useFetchData";

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
      .filter((a): a is string => a != null && a !== ""),
  );
  return Array.from(artistSet).sort();
}

export function useArtists(): UseArtistsResult {
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loading: fetchDataLoading } = useContext(FetchDataContext);

  useEffect(() => {
    const fetchData = async () => {
      if (fetchDataLoading) return;
      setLoading(true);
      setError(null);
      try {
        const artistList = await getArtists();
        setArtists(artistList);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("アーティスト一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchDataLoading]);

  return { artists, loading: loading || fetchDataLoading, error };
}
