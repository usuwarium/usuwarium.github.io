import { type Playlist, type PlaylistId, getAllPlaylists, getPlaylistSongs } from "@/lib/db";
import type { Song, SongId } from "@/lib/types";
import { useEffect, useState } from "react";

export interface UsePlaylistsResult {
  playlists: Playlist[];
  playlistSongMap: Map<PlaylistId, Song[]>;
  playlistSongIdMap: Map<PlaylistId, Set<SongId>>;
  reload: () => void;
  loading: boolean;
  error: string | null;
}

export function usePlaylists(): UsePlaylistsResult {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSongMap, setPlaylistSongMap] = useState<Map<PlaylistId, Song[]>>(new Map());
  const [playlistSongIdMap, setPlaylistSongIdMap] = useState<Map<PlaylistId, Set<SongId>>>(
    new Map()
  );
  const [reloadTrigger, setReloadTrigger] = useState(0);
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
        const playlists = await getAllPlaylists();
        const allPlaylistSongs = await getPlaylistSongs();

        // 各プレイリストに含まれる曲を取得
        const songMap = new Map<PlaylistId, Song[]>();
        const songIdsMap = new Map<PlaylistId, Set<SongId>>();
        for (const ps of allPlaylistSongs) {
          if (!songMap.has(ps.playlist_id)) {
            songMap.set(ps.playlist_id, []);
          }
          songMap.get(ps.playlist_id)!.push(ps);
          if (!songIdsMap.has(ps.playlist_id)) {
            songIdsMap.set(ps.playlist_id, new Set());
          }
          songIdsMap.get(ps.playlist_id)!.add(ps.song_id);
        }

        setPlaylists(playlists);
        setPlaylistSongMap(songMap);
        setPlaylistSongIdMap(songIdsMap);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reloadTrigger]);

  return { playlists, playlistSongMap, playlistSongIdMap, reload, loading, error };
}
