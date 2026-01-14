import { useState, useEffect } from "react";
import type { Video } from "@/lib/types";
import { queryVideos } from "@/lib/db";

export interface QueryVideosParams {
  searchQuery?: string;
  selectedFilter?: string | null;
  sortBy?: "published_at" | "like_count" | "view_count" | null;
  sortOrder?: "asc" | "desc";
  page: number;
  itemsPerPage: number;
}

export interface UseQueryVideosResult {
  videos: Video[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export function useQueryVideos(params: QueryVideosParams): UseQueryVideosResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [fetchedVideos, count] = await queryVideos({
          searchQuery: params.searchQuery,
          selectedFilter: params.selectedFilter,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          page: params.page,
          itemsPerPage: params.itemsPerPage,
        });
        setVideos(fetchedVideos);
        setTotalCount(count);
      } catch (err) {
        console.error(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    params.searchQuery,
    params.selectedFilter,
    params.sortBy,
    params.sortOrder,
    params.page,
    params.itemsPerPage,
    setVideos,
    setTotalCount,
    setLoading,
    setError,
  ]);

  return { videos, totalCount, loading, error };
}
