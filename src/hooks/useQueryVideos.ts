import { db } from "@/lib/db";
import { applySearchQuery, matchesQuickFilter } from "@/lib/filter";
import type { Video } from "@/lib/types";
import useSWR from "swr";

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
  isValidating: boolean;
  error: string | null;
}

// 動画クエリ関数
async function queryVideos(params: {
  searchQuery?: string;
  selectedFilter?: string | null;
  sortBy?: "published_at" | "like_count" | "view_count" | null;
  sortOrder?: "asc" | "desc";
  page: number;
  itemsPerPage: number;
}): Promise<{ videos: Video[]; count: number }> {
  const { searchQuery, selectedFilter, sortBy, sortOrder = "desc", page, itemsPerPage } = params;

  let collection;

  // ソート処理
  if (sortBy === "published_at") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("published_at")
        : db.videos.orderBy("published_at").reverse();
  } else if (sortBy === "like_count") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("like_count")
        : db.videos.orderBy("like_count").reverse();
  } else if (sortBy === "view_count") {
    collection =
      sortOrder === "asc"
        ? db.videos.orderBy("view_count")
        : db.videos.orderBy("view_count").reverse();
  } else {
    collection = db.videos.toCollection();
  }

  // フィルタ処理
  let results = await collection.toArray();

  // クイックフィルタを適用
  if (selectedFilter) {
    results = results.filter((v) => matchesQuickFilter(v, selectedFilter));
  }

  // 検索クエリを適用
  results = applySearchQuery(results, searchQuery, (video) => [video.title, ...video.tags]);

  // 動画の総数
  const count = results.length;

  // ページネーション
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  return { videos: results.slice(start, end), count };
}

export function useQueryVideos(params: QueryVideosParams): UseQueryVideosResult {
  const lastUpdatedAt = localStorage.getItem("lastUpdatedAt");
  const { data: syncStatus, isLoading: isSyncLoading } = useSWR("usuwarium-db");
  const { data, isLoading, isValidating, error } = useSWR(
    ["queryVideos", syncStatus?.updatedAt, params],
    async () => {
      if (lastUpdatedAt === null && !syncStatus) {
        return undefined;
      }
      return await queryVideos(params);
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const isInitialLoading = lastUpdatedAt === null && (isSyncLoading || !syncStatus);

  if (error) {
    console.error("useQueryVideos error:", error);
  }

  return {
    videos: data?.videos ?? [],
    totalCount: data?.count ?? 0,
    loading: isInitialLoading || (isLoading && !data),
    isValidating,
    error: error ? "データの取得に失敗しました" : null,
  };
}
