import { db } from "@/lib/db";
import useSWR from "swr";

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
  const lastUpdatedAt = localStorage.getItem("lastUpdatedAt");
  const { data: syncStatus, isLoading: isSyncLoading } = useSWR("usuwarium-db");
  const { data, isLoading, error } = useSWR(
    ["getArtistSongs", syncStatus?.updatedAt, selectedArtist],
    async () => {
      if (lastUpdatedAt === null && !syncStatus) {
        return undefined;
      }
      if (selectedArtist.length > 0) {
        return await getTitlesForArtist(selectedArtist);
      } else {
        return await getAllTitles();
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const isInitialLoading = lastUpdatedAt === null && (isSyncLoading || !syncStatus);

  if (error) {
    console.error("useArtistSongs error:", error);
  }

  return {
    availableTitles: data ?? [],
    loading: isInitialLoading || (isLoading && !data),
    error: error ? "曲タイトル一覧の取得に失敗しました" : null,
  };
}
