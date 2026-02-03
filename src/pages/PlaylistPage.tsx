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
import { useEffect, useId, useRef, useState } from "react";
import { createCallable } from "react-call";
import toast from "react-hot-toast";
import { useHotkeys } from "react-hotkeys-hook";
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
  FaTrash,
  FaUndo,
  FaUpload,
} from "react-icons/fa";
import { IoMdMusicalNote } from "react-icons/io";

interface ConfirmDialogProps {
  message: string;
}

const ConfirmDialog = createCallable<ConfirmDialogProps, boolean>(({ message, call }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const messageId = useId();

  useHotkeys("escape", () => call.end(false), { enableOnFormTags: true });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (overlayRef.current === e.target) {
      call.end(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
    >
      <div
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby={messageId}
      >
        <p id={messageId} className="text-white mb-6">
          {message}
        </p>
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
  );
});

interface TextInputModalProps {
  title: string;
  placeholder?: string;
  buttonText: string;
  initialValue?: string;
}

const TextInputModal = createCallable<TextInputModalProps, string | null>(
  ({ title, placeholder, buttonText, initialValue = "", call }) => {
    const [value, setValue] = useState(initialValue);
    const overlayRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    useHotkeys("escape", () => call.end(null), { enableOnFormTags: true });

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (overlayRef.current === e.target) {
        call.end(null);
      }
    };

    return (
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      >
        <div
          className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h3 id={titleId} className="text-lg mb-4">
            {title}
          </h3>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                call.end(value.trim());
              }
            }}
            placeholder={placeholder}
            className="input-text w-full mb-6"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => call.end(null)} className="btn">
              キャンセル
            </button>
            <button
              onClick={() => value.trim() && call.end(value.trim())}
              disabled={!value.trim()}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export function PlaylistPage() {
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);
  const [playingSongId, setPlayingSongId] = useState<SongId | undefined>(undefined);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<PlaylistId | undefined>(undefined);
  const [isOptionMenuOpen, setIsOptionMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<PlaylistId | undefined>(undefined);
  const [openSongDropdownId, setOpenSongDropdownId] = useState<SongId | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const playlistDropdownRefs = useRef<Map<PlaylistId, HTMLDivElement>>(new Map());
  const songDropdownRefs = useRef<Map<SongId, HTMLDivElement>>(new Map());
  const songElementRefs = useRef<Map<SongId, HTMLDivElement>>(new Map());
  const { playlists, playlistSongMap, reload, error: playlistsError } = usePlaylists();

  const playlistSongs = playlistSongMap.get(selectedPlaylistId!) || [];

  const handleCreatePlaylist = async () => {
    const name = await TextInputModal.call({
      title: "新規プレイリスト",
      placeholder: "プレイリスト名",
      buttonText: "作成",
    });
    if (!name) return;

    try {
      const id = await createPlaylist(name);
      setSelectedPlaylistId(id);
      reload();
      toast.success("プレイリストを作成しました");
    } catch (error) {
      toast.error("プレイリストの作成に失敗しました");
      console.error(error);
    }
  };

  const handleEditPlaylistName = async (id: PlaylistId) => {
    const playlist = playlists.find((p) => p.id === id);
    if (!playlist) return;

    const newName = await TextInputModal.call({
      title: "プレイリスト名を変更",
      buttonText: "保存",
      initialValue: playlist.name,
    });

    if (newName && newName !== playlist.name) {
      try {
        await updatePlaylist(id, newName);
        reload();
        toast.success("プレイリスト名を変更しました");
      } catch (error) {
        toast.error("プレイリスト名の変更に失敗しました");
        console.error(error);
      }
    }
    setOpenDropdownId(undefined);
  };

  const handleDeletePlaylist = async (id: PlaylistId) => {
    const confirmed = await ConfirmDialog.call({
      message: "このプレイリストを削除しますか？",
    });
    if (!confirmed) return;

    const playlist = playlists.find((p) => p.id === id);
    const songs = playlistSongMap.get(id) || [];
    const items = songs.map((s) => ({ song_id: s.song_id, order: s.order }));

    try {
      await deletePlaylist(id);
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(undefined);
      }
      setOpenDropdownId(undefined);
      reload();

      if (playlist) {
        toast.success(
          (t) => (
            <div className="flex items-center gap-3">
              <span>プレイリストを削除しました</span>
              <button
                onClick={async () => {
                  try {
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
                  } catch (error) {
                    toast.error("復元に失敗しました");
                    console.error(error);
                  }
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
    } catch (error) {
      toast.error("プレイリストの削除に失敗しました");
      console.error(error);
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

    try {
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
                try {
                  await addSongToPlaylistAtPosition(id, songId, originalOrder);
                  reload();
                  toast.dismiss(t.id);
                  toast.success("元に戻しました");
                } catch (error) {
                  toast.error("復元に失敗しました");
                  console.error(error);
                }
              }}
              className="btn btn-primary text-sm"
            >
              <FaUndo className="text-white" />
            </button>
          </div>
        ),
        { duration: 5000 },
      );
    } catch (error) {
      toast.error("プレイリストからの削除に失敗しました");
      console.error(error);
    }
  };

  const handleMove = async (index: number, direction: string) => {
    if (!selectedPlaylistId) return;
    const newOrder = [...playlistSongs];
    if (direction === "up") {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === "down") {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    try {
      await reorderPlaylistItems(
        selectedPlaylistId,
        newOrder.map((s) => s.song_id),
      );
      reload();
    } catch (error) {
      toast.error("曲順の変更に失敗しました");
      console.error(error);
    }
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

      if (openDropdownId !== undefined) {
        const dropdownElement = playlistDropdownRefs.current.get(openDropdownId);
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdownId(undefined);
        }
      }

      if (openSongDropdownId !== undefined) {
        const dropdownElement = songDropdownRefs.current.get(openSongDropdownId);
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenSongDropdownId(undefined);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId, openSongDropdownId]);

  useEffect(() => {
    if (playingSongId) {
      const element = songElementRefs.current.get(playingSongId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [playingSongId]);

  if (playlistsError) {
    toast.error(playlistsError);
  }

  const selectedPlaylistName = playlists.find((p) => p.id === selectedPlaylistId)?.name || "";

  return (
    <main className="main">
      <header className="header margin">
        <h1 className="text-xl md:text-4xl">Playlists</h1>
      </header>

      <div className="content-wrapper">
        <div className="content margin pl-2 pr-1 md:pl-8 md:pr-6 scrollbar-stable">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 md:gap-6 h-full">
            {/* プレイリスト一覧 */}
            <section
              className={`${selectedPlaylistId ? "hidden" : "block"} md:block space-y-2 min-w-0`}
            >
              <section
                className={`relative justify-between mb-3 ${
                  selectedPlaylistId ? "hidden" : "flex"
                } md:flex`}
              >
                <button onClick={handleCreatePlaylist} className="btn btn-primary">
                  <FaPlus /> 新規作成
                </button>
                <div className="flex gap-2" ref={dropdownRef}>
                  <button
                    className="btn block md:hidden"
                    onClick={() => setIsOptionMenuOpen(!isOptionMenuOpen)}
                    aria-label="エクスポートメニュー"
                  >
                    <BsThreeDots size={24} />
                  </button>
                  <div
                    role="menu"
                    className={`absolute right-0 top-full mt-1 flex flex-col md:flex-row bg-gray-700 rounded shadow p-2 gap-2 z-10 ${
                      isOptionMenuOpen ? "" : "hidden"
                    }`}
                  >
                    <button onClick={handleExport} className="btn" role="menuitem">
                      <FaDownload /> エクスポート
                    </button>
                    <button onClick={handleImport} className="btn" role="menuitem">
                      <FaUpload /> インポート
                    </button>
                  </div>
                </div>
              </section>

              {playlists.length === 0 ? (
                <p className="text-gray-400 text-center py-8">プレイリストがありません</p>
              ) : (
                playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedPlaylistId === playlist.id
                        ? "bg-gray-750"
                        : "bg-gray-800 hover:bg-gray-750"
                    }`}
                    onClick={() => handleSelectPlaylist(playlist.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate flex-1">{playlist.name}</span>
                      <div
                        ref={(el) => {
                          if (el) {
                            playlistDropdownRefs.current.set(playlist.id, el);
                          } else {
                            playlistDropdownRefs.current.delete(playlist.id);
                          }
                        }}
                        className="relative"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(
                              openDropdownId === playlist.id ? undefined : playlist.id,
                            );
                          }}
                          className="p-2 hover:bg-gray-500 rounded transition"
                          aria-label="プレイリストメニュー"
                        >
                          <BsThreeDots size={20} />
                        </button>
                        {openDropdownId === playlist.id && (
                          <div
                            role="menu"
                            className="absolute right-0 top-full mt-1 bg-gray-700 rounded shadow-lg py-1 z-10 min-w-[180px]"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPlaylistName(playlist.id);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-600 transition flex items-center gap-2"
                              role="menuitem"
                            >
                              <FaEdit /> 名前を変更
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-600 transition flex items-center gap-2 text-red-400"
                              role="menuitem"
                            >
                              <FaTrash /> 削除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
            <section className={`${selectedPlaylistId ? "block" : "hidden"} md:hidden`}>
              <FaArrowLeft size={20} onClick={() => setSelectedPlaylistId(undefined)} />
            </section>

            {/* プレイリスト詳細 */}
            <section className={`${selectedPlaylistId ? "block" : "hidden"} md:block min-w-0`}>
              {selectedPlaylistId ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xl mr-1 truncate">
                      {selectedPlaylistName}
                      <span className="text-sm">（{playlistSongs.length} 曲）</span>
                    </h2>
                    <button
                      onClick={() => youtubePlayerRef.current?.playAll()}
                      className="btn min-w-32 ml-auto"
                    >
                      <FaPlay /> すべて再生
                    </button>
                    <button
                      onClick={() => youtubePlayerRef.current?.playShuffled()}
                      className="btn min-w-32"
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
                            ref={(el) => {
                              if (el) {
                                songElementRefs.current.set(song.song_id, el);
                              } else {
                                songElementRefs.current.delete(song.song_id);
                              }
                            }}
                            className={`p-3 flex items-center gap-3 rounded-lg transition ${
                              isPlaying ? "bg-gray-750" : "bg-gray-800 hover:bg-gray-750"
                            }`}
                          >
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

                            <div
                              ref={(el) => {
                                if (el) {
                                  songDropdownRefs.current.set(song.song_id, el);
                                } else {
                                  songDropdownRefs.current.delete(song.song_id);
                                }
                              }}
                              className="relative"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenSongDropdownId(
                                    openSongDropdownId === song.song_id ? undefined : song.song_id,
                                  );
                                }}
                                className="p-2 hover:bg-gray-600 rounded transition"
                                aria-label="曲メニュー"
                              >
                                <BsThreeDots size={20} />
                              </button>
                              {openSongDropdownId === song.song_id && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full mt-1 bg-gray-700 rounded shadow-lg py-1 z-10 min-w-[120px]"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSong(selectedPlaylistId, song.song_id);
                                      setOpenSongDropdownId(undefined);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-600 transition flex items-center gap-2 text-red-400"
                                    role="menuitem"
                                  >
                                    <FaTrash /> 削除
                                  </button>
                                </div>
                              )}
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
      </div>

      <footer className="footer border-none">
        {/* YouTubeプレイヤーコントローラー */}
        <YouTubePlayer
          ref={youtubePlayerRef}
          songs={playlistSongs}
          onSongChanged={(song) => setPlayingSongId(song?.song_id)}
        />
      </footer>
      <ConfirmDialog.Root />
      <TextInputModal.Root />
    </main>
  );
}
