import { useState, useEffect } from "react";
import type { Song } from "@/lib/types";
import { db } from "@/lib/db";
import { useFetchData } from "./useFetchData";

export interface UseSongsByVideoIdResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
}

// 動画IDから歌唱情報を取得
export async function getSongsByVideoId(videoId: string): Promise<Song[]> {
  return (await db.songs.where("video_id").equals(videoId).sortBy("start_time")).filter(
    (s) => s.edited
  );
}

export function useSongsByVideoId(videoId: string): UseSongsByVideoIdResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasCache, error: fdError } = useFetchData();

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      try {
        const fetchedSongs = await getSongsByVideoId(videoId);
        setSongs(fetchedSongs);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("曲情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, [videoId]);

  return { songs, loading: loading || !hasCache, error: error || fdError };
}
