import { useState, useEffect } from "react";
import { querySongs } from "@/lib/db";
import type { Song } from "@/lib/types";

export interface QuerySongsParams {
  searchQuery?: string;
  artist?: string;
  title?: string;
  sortBy: "published_at" | "artist" | "title";
  sortOrder: "asc" | "desc";
}

export interface UseQuerySongsResult {
  songs: Song[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export function useQuerySongs(params: QuerySongsParams): UseQuerySongsResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { songs, count } = await querySongs({
          freeSearch: params.searchQuery,
          selectedArtist: params.artist,
          selectedTitle: params.title,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        });

        setSongs(songs);
        setLoading(false);
        setTotalCount(count);
      } catch (error) {
        console.error(error);
        setError(error instanceof Error ? error.message : "データの取得に失敗しました");
      }
    };

    fetchData();
  }, [
    params.searchQuery,
    params.artist,
    params.title,
    params.sortBy,
    params.sortOrder,
    params.page,
    params.itemsPerPage,
  ]);

  return { songs, totalCount, loading, error };
}
