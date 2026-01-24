import { YouTubePlayer, type YouTubePlayerRef } from "@/components/YouTubePlayer";
import { usePlaylists } from "@/hooks/usePlaylists";
import { timestampSpan } from "@/lib/humanize";
import {
  addSongToPlaylistAtPosition,
  createPlaylist,
  deletePlaylist,
  exportPlaylists,
  importPlaylists,
  removeSongsFromPlaylist,
  reorderPlaylistItems,
  restorePlaylist,
  updatePlaylist,
} from "@/lib/playlist";
import type { PlaylistId, SongId } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { createCallable } from "react-call";
import toast from "react-hot-toast";
import { BsThreeDots } from "react-icons/bs";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaDownload,
  FaEdit,
  FaPlay,
  FaPlus,
  FaRandom,
  FaTimesCircle,
  FaTrash,
  FaUndo,
  FaUpload,
} from "react-icons/fa";
import { IoMdMusicalNote } from "react-icons/io";

interface ConfirmDialogProps {
  message: string;
}

const ConfirmDialog = createCallable<ConfirmDialogProps, boolean>(({ message, call }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
      <p className="text-white mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={() => call.end(false)} className="btn">
          キャンセル
        </button>
        <button onClick={() => call.end(true)} className="btn bg-red-600 hover:bg-red-700">
          削除
        </button>
      </div>
    </div>
  </div>
));

export function PlaylistPage() {
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);
  const [playingSongId, setPlayingSongId] = useState<SongId | undefined>(undefined);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<PlaylistId | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isOptionMenuOpen, setIsOptionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { playlists, playlistSongMap, reload, error: playlistsError } = usePlaylists();

  const playlistSongs = playlistSongMap.get(selectedPlaylistId!) || [];

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const id = await createPlaylist(newPlaylistName);
    setNewPlaylistName("");
    setEditingName("");
    setIsCreating(false);
    setIsEditing(false);
    setSelectedPlaylistId(id);
    reload();
  };

  const handleUpdatePlaylist = async () => {
    if (!selectedPlaylistId || !editingName.trim()) return;
    await updatePlaylist(selectedPlaylistId, editingName);
    setIsEditing(false);
    reload();
  };

  const handleDeletePlaylist = async (id: PlaylistId) => {
    const confirmed = await ConfirmDialog.call({
      message: "このプレイリストを削除しますか？",
    });
    if (!confirmed) return;

    const playlist = playlists.find((p) => p.id === id);
    const songs = playlistSongMap.get(id) || [];
    const items = songs.map((s) => ({ song_id: s.song_id, order: s.order }));

    await deletePlaylist(id);
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(undefined);
    }
    reload();

    if (playlist) {
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <span>プレイリストを削除しました</span>
            <button
              onClick={async () => {
                await restorePlaylist(
                  playlist.id,
                  playlist.name,
                  items,
                  playlist.created_at,
                  playlist.updated_at,
                );
                reload();
                toast.dismiss(t.id);
                toast.success("元に戻しました");
              }}
              className="btn btn-primary text-sm"
            >
              <FaUndo className="text-white" />
            </button>
          </div>
        ),
        { duration: 5000 },
      );
    }
  };

  const handleSelectPlaylist = (id: PlaylistId) => {
    youtubePlayerRef.current?.close();
    setSelectedPlaylistId(id);
  };

  const handleRemoveSong = async (id: PlaylistId, songId: SongId) => {
    const song = playlistSongs.find((s) => s.song_id === songId);
    if (!song) return;

    const originalOrder = song.order;

    await removeSongsFromPlaylist(id, [songId]);
    if (songId === playingSongId) {
      youtubePlayerRef.current?.close();
    }
    reload();

    toast.success(
      (t) => (
        <div className="flex items-center gap-3">
          <span>プレイリストから削除しました</span>
          <button
            onClick={async () => {
              await addSongToPlaylistAtPosition(id, songId, originalOrder);
              reload();
              toast.dismiss(t.id);
              toast.success("元に戻しました");
            }}
            className="btn btn-primary text-sm"
          >
            <FaUndo className="text-white" />
          </button>
        </div>
      ),
      { duration: 5000 },
    );
  };

  const handleMove = async (index: number, direction: string) => {
    if (!selectedPlaylistId) return;
    const newOrder = [...playlistSongs];
    if (direction === "up") {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === "down") {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    await reorderPlaylistItems(
      selectedPlaylistId,
      newOrder.map((s) => s.song_id),
    );
    reload();
  };

  const handleExport = async () => {
    try {
      const data = await exportPlaylists();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `playlists_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsOptionMenuOpen(false);
    } catch (error) {
      toast.error("エクスポートに失敗しました");
      console.error(error);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      try {
        const errorMessage = await importPlaylists(text);
        if (errorMessage) {
          toast.error(errorMessage, { duration: 8000 });
        } else {
          toast.success("プレイリストをインポートしました");
        }
        reload();
      } catch (error) {
        toast.error("インポートに失敗しました");
        console.error(error);
      }
    };
    input.click();
    setIsOptionMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOptionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (playlistsError) {
    toast.error(playlistsError);
  }

  const selectedPlaylistName = playlists.find((p) => p.id === selectedPlaylistId)?.name || "";

  return (
    <>
      <main className="main">
        <header className="header">
          <h1 className="text-xl md:text-4xl">Playlists</h1>

          <section
            className={`relative justify-between mt-3 mb-3 ${
              selectedPlaylistId ? "hidden" : "flex"
            } md:flex`}
          >
            <button onClick={() => setIsCreating(true)} className="btn btn-primary">
              <FaPlus /> 新規作成
            </button>
            <div className="flex gap-2" ref={dropdownRef}>
              <button
                className="btn block md:hidden"
                onClick={() => setIsOptionMenuOpen(!isOptionMenuOpen)}
              >
                <BsThreeDots size={24} />
              </button>
              <div
                className={`absolute right-0 top-full flex flex-col md:flex-row bg-gray-700 rounded shadow p-2 gap-2 ${
                  isOptionMenuOpen ? "" : " hidden"
                }`}
              >
                <button onClick={handleExport} className="btn">
                  <FaDownload /> エクスポート
                </button>
                <button onClick={handleImport} className="btn">
                  <FaUpload /> インポート
                </button>
              </div>
            </div>
          </section>

          {isCreating && (
            <section
              className={`mb-6 p-4 bg-gray-800 rounded-lg ${
                selectedPlaylistId ? "hidden" : "block"
              } md:block`}
            >
              <h3 className="text-lg mb-3">新規プレイリスト</h3>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                  placeholder="プレイリスト名"
                  className="flex-1 input-text"
                  autoFocus
                />
                <button onClick={handleCreatePlaylist} className="px-4 py-2 btn btn-primary">
                  作成
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewPlaylistName("");
                  }}
                  className="px-4 py-2 btn"
                >
                  <FaTimesCircle /> キャンセル
                </button>
              </div>
            </section>
          )}
        </header>

        <div className="content pl-2 pr-1 md:pl-8 md:pr-6 scrollbar-stable">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 md:gap-6 h-full">
            {/* プレイリスト一覧 */}
            <section className={`${selectedPlaylistId ? "hidden" : "block"} md:block space-y-2`}>
              {playlists.length === 0 ? (
                <p className="text-gray-400 text-center py-8">プレイリストがありません</p>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedPlaylistId === playlist.id
                        ? "bg-gray-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => handleSelectPlaylist(playlist.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate mr-1">{playlist.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id);
                        }}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
            <section className={`${selectedPlaylistId ? "block" : "hidden"} md:hidden`}>
              <FaArrowLeft size={20} onClick={() => setSelectedPlaylistId(undefined)} />
            </section>

            {/* プレイリスト詳細 */}
            <section className={`${selectedPlaylistId ? "block" : "hidden"} md:block`}>
              {selectedPlaylistId ? (
                <>
                  {isEditing ? (
                    <div className="flex flex-wrap justify-between mb-3 gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdatePlaylist()}
                        className="input-text flex-1"
                        autoFocus
                      />
                      <button onClick={handleUpdatePlaylist} className="btn btn-primary">
                        保存
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn">
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center mb-3">
                      <h2 className="text-xl mr-1 truncate">
                        {selectedPlaylistName}
                        <span className="text-sm">（{playlistSongs.length} 曲）</span>
                      </h2>
                      <button
                        onClick={() => {
                          setEditingName(selectedPlaylistName);
                          setIsEditing(true);
                        }}
                        className="btn px-4 ml-auto"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => youtubePlayerRef.current?.playAll()}
                      className="btn w-32 ml-auto"
                    >
                      <FaPlay /> すべて再生
                    </button>
                    <button
                      onClick={() => youtubePlayerRef.current?.playShuffled()}
                      className="btn w-32"
                    >
                      <FaRandom /> シャッフル
                    </button>
                  </div>

                  <div className="space-y-2">
                    {playlistSongs.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">曲が登録されていません</p>
                    ) : (
                      playlistSongs.map((song, index) => {
                        const isPlaying = playingSongId === song.song_id;
                        return (
                          <div
                            key={song.song_id}
                            className={`p-3 rounded-lg transition ${
                              isPlaying ? "bg-blue-900/50" : "bg-gray-800 hover:bg-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleMove(index, "up")}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <FaArrowUp size={12} />
                                </button>
                                <button
                                  onClick={() => handleMove(index, "down")}
                                  disabled={index === playlistSongs.length - 1}
                                  className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <FaArrowDown size={12} />
                                </button>
                              </div>

                              <div className="flex-1">
                                <button
                                  onClick={() => youtubePlayerRef.current?.playSong(song.song_id)}
                                  className="text-left hover:text-blue-400 transition w-full"
                                >
                                  <div className="flex items-center gap-2">
                                    {isPlaying && (
                                      <IoMdMusicalNote className="text-blue-400 flex-shrink-0" />
                                    )}
                                    <span>
                                      {song.title}&nbsp;/&nbsp;{song.artist}
                                    </span>
                                  </div>
                                  <div className="text-xs md:text-sm text-gray-400">
                                    {song.video_title}
                                    <br />
                                    {timestampSpan(song.start_time, song.end_time)}
                                  </div>
                                </button>
                              </div>

                              <button
                                onClick={() => handleRemoveSong(selectedPlaylistId, song.song_id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400">プレイリストを選択してください</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="footer relative bg-gray-800 border-t border-gray-700 flex flex-col">
        {/* YouTubeプレイヤーコントローラー */}
        <YouTubePlayer
          ref={youtubePlayerRef}
          songs={playlistSongs}
          onSongChanged={(song) => setPlayingSongId(song?.song_id)}
        />
      </footer>
      <ConfirmDialog.Root />
    </>
  );
}
