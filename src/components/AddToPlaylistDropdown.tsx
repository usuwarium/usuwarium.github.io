import { useState, useEffect, useRef } from "react";
import { FaPlus, FaBookmark, FaRegBookmark } from "react-icons/fa";
import {
  createPlaylist,
  addSongsToPlaylist,
  removeSongsFromPlaylist,
  type PlaylistId,
} from "@/lib/db";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { Song } from "@/lib/types";
import toast from "react-hot-toast";

interface AddToPlaylistDropdownProps {
  songs: Song[];
  onAdded?: () => void;
  onClose?: () => void;
}

export function AddToPlaylistDropdown({ songs, onAdded, onClose }: AddToPlaylistDropdownProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { playlists, playlistSongIdMap, loading, error } = usePlaylists();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const isInPlaylist = (playlistId: PlaylistId): boolean => {
    const songIdSet = playlistSongIdMap.get(playlistId);
    if (!songIdSet) return false;
    return songs.every((song) => songIdSet.has(song.song_id));
  };

  const handleAddToPlaylist = async (playlistId: PlaylistId) => {
    try {
      if (isInPlaylist(playlistId)) {
        await removeSongsFromPlaylist(
          playlistId,
          songs.map((s) => s.song_id)
        );
      } else {
        const songIdSet = playlistSongIdMap.get(playlistId);
        await addSongsToPlaylist(
          playlistId,
          songs.filter((song) => !songIdSet?.has(song.song_id)).map((s) => s.song_id)
        );
      }
      onAdded?.();
      onClose?.();
    } catch (error) {
      console.error("Failed to add to playlist:", error);
      toast.error("プレイリストへの追加に失敗しました");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const playlistId = await createPlaylist(newPlaylistName);
      await addSongsToPlaylist(
        playlistId,
        songs.map((s) => s.song_id)
      );
      onAdded?.();
      onClose?.();
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast.error("プレイリストの作成に失敗しました");
    }
  };

  if (loading) {
    return;
  }

  if (error) {
    toast.error(error);
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-12 z-200 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50"
    >
      <div className="p-2 max-h-64 overflow-y-auto">
        {playlists.length === 0 ? (
          <p className="text-center py-2 text-sm">プレイリストがありません</p>
        ) : (
          <div className="space-y-1">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 rounded transition grid grid-cols-[1fr_auto]"
              >
                <span className="truncate">{playlist.name}</span>
                {isInPlaylist(playlist.id) ? (
                  <FaBookmark size={14} className="mt-1" />
                ) : (
                  <FaRegBookmark size={14} className="mt-1" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 p-2">
        {isCreating ? (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateAndAdd();
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                  setNewPlaylistName("");
                }
              }}
              placeholder="プレイリスト名"
              className="input-text w-full"
              autoFocus
            />
            <button onClick={handleCreateAndAdd} className="btn btn-primary whitespace-nowrap">
              作成
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded transition"
          >
            <FaPlus size={12} /> 新規プレイリスト
          </button>
        )}
      </div>
    </div>
  );
}
