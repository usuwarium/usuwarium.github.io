import { db } from "@/lib/db";
import type { Song } from "@/lib/types";
import useSWR from "swr";

export interface UseSongsByVideoIdResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
}

// 動画IDから歌唱情報を取得
export async function getSongsByVideoId(videoId: string): Promise<Song[]> {
  return (await db.songs.where("video_id").equals(videoId).sortBy("start_time")).filter(
    (s) => s.edited,
  );
}

export function useSongsByVideoId(videoId: string): UseSongsByVideoIdResult {
  const lastUpdatedAt = localStorage.getItem("lastUpdatedAt");
  const { data: syncStatus, isLoading: isSyncLoading } = useSWR("usuwarium-db");
  const { data, isLoading, error } = useSWR(
    ["getSongsByVideoId", syncStatus?.updatedAt, videoId],
    async () => {
      if (lastUpdatedAt === null && !syncStatus) {
        return undefined;
      }
      return await getSongsByVideoId(videoId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const isInitialLoading = lastUpdatedAt === null && (isSyncLoading || !syncStatus);

  if (error) {
    console.error("useSongsByVideoId error:", error);
  }

  return {
    songs: data ?? [],
    loading: isInitialLoading || (isLoading && !data),
    error: error ? "曲情報の取得に失敗しました" : null,
  };
}
