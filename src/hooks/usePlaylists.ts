import { getAllPlaylists, getPlaylistSongs } from "@/lib/playlist";
import type { Playlist, PlaylistId, PlaylistSong, SongId } from "@/lib/types";
import useSWR from "swr";

export interface UsePlaylistsResult {
  playlists: Playlist[];
  playlistSongMap: Map<PlaylistId, PlaylistSong[]>;
  playlistSongIdMap: Map<PlaylistId, Set<SongId>>;
  reload: () => void;
  loading: boolean;
  isValidating: boolean;
  error: string | null;
}

interface PlaylistData {
  playlists: Playlist[];
  playlistSongMap: Map<PlaylistId, PlaylistSong[]>;
  playlistSongIdMap: Map<PlaylistId, Set<SongId>>;
}

// プレイリストデータ取得関数
async function fetchPlaylistData(): Promise<PlaylistData> {
  const playlists = await getAllPlaylists();
  const allPlaylistSongs = await getPlaylistSongs();

  // 各プレイリストに含まれる曲を取得
  const songMap = new Map<PlaylistId, PlaylistSong[]>();
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

  return {
    playlists,
    playlistSongMap: songMap,
    playlistSongIdMap: songIdsMap,
  };
}

export function usePlaylists(): UsePlaylistsResult {
  const { data, error, isLoading, isValidating, mutate } = useSWR("playlists", fetchPlaylistData, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    keepPreviousData: true,
  });

  if (error) {
    console.error("usePlaylists error:", error);
  }

  return {
    playlists: data?.playlists || [],
    playlistSongMap: data?.playlistSongMap || new Map(),
    playlistSongIdMap: data?.playlistSongIdMap || new Map(),
    reload: () => mutate(),
    loading: isLoading,
    isValidating,
    error: error ? (error instanceof Error ? error.message : "データの取得に失敗しました") : null,
  };
}
