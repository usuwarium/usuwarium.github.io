import { db } from "@/lib/db";
import useSWR from "swr";

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
  const lastUpdatedAt = localStorage.getItem("lastUpdatedAt");
  const { data: syncStatus, isLoading: isSyncLoading } = useSWR("usuwarium-db");
  const { data, isLoading, error } = useSWR(
    ["getArtists", syncStatus?.updatedAt],
    async () => {
      if (lastUpdatedAt === null && !syncStatus) {
        return undefined;
      }
      return await getArtists();
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const isInitialLoading = lastUpdatedAt === null && (isSyncLoading || !syncStatus);

  if (error) {
    console.error("useArtists error:", error);
  }

  return {
    artists: data ?? [],
    loading: isInitialLoading || (isLoading && !data),
    error: error ? "アーティスト一覧の取得に失敗しました" : null,
  };
}
