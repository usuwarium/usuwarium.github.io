import { useState, useEffect } from "react";
import type { Song, Video } from "@/lib/types";
import { getVideosAndSongs } from "@/lib/manage";

export interface UseVideosResult {
  videos: Video[];
  songs: Song[];
  artists: string[];
  titles: string[];
  reload: () => void;
  loading: boolean;
  error: string | null;
}

export function useManageData(): UseVideosResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);

  const [reloadtrigger, setReloadTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [videos, songs] = await getVideosAndSongs();
        setVideos(videos.filter((v) => v.available && v.singing));
        setSongs(songs);
        const artistSet = new Set<string>();
        const titleSet = new Set<string>();
        songs.forEach((song) => {
          artistSet.add(song.artist);
          titleSet.add(song.title);
        });
        setArtists(Array.from(artistSet));
        setTitles(Array.from(titleSet));
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "データの取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reloadtrigger]);

  return { videos, songs, artists, titles, reload, loading, error };
}
