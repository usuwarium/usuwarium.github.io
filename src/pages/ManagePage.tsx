import { LoadingIcon } from "@/components/LoadingIcon";
import { ManageVideoPlayer, type ManageVideoPlayerRef } from "@/components/ManageVideoPlayer";
import { useManageData } from "@/hooks/useManage";
import { VideoClassifier } from "@/lib/classifier";
import { GAS_API_KEY } from "@/lib/gas-client";
import { formatTime } from "@/lib/humanize";
import {
  completeVideo,
  importVideo,
  saveSongs,
  setSingingFalse,
  YOUTUBE_API_KEY,
  type SingingPart,
} from "@/lib/manage";
import type { Video, VideoId } from "@/lib/types";
import React, { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaCheckCircle, FaLightbulb, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { GiSwan } from "react-icons/gi";

export interface SingingPartInput {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  artist: string;
}

function parseTimeString(timeStr: string): number | null {
  // hh:mm:ss または mm:ss 形式をパース
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  }
  return null;
}

export function ManagePage() {
  const [videoInput, setVideoInput] = useState("");
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [singingParts, setSingingParts] = useState<SingingPartInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [completedVideoIds, setCompletedVideoIds] = useState<Set<VideoId>>(new Set());

  const videoPlayerRef = useRef<ManageVideoPlayerRef>(null);

  const { videos, songs, artists, titles, reload, loading, error } = useManageData();

  const incompletedVideos = useMemo(() => {
    const filtered = videos
      .filter((v) => !v.completed)
      .filter((v) => !completedVideoIds.has(v.video_id));

    if (!searchQuery.trim()) {
      return filtered;
    }

    const query = searchQuery.toLowerCase();
    return filtered.filter((v) => {
      // タイトルで検索
      if (v.title.toLowerCase().includes(query)) return true;

      // 動画IDで検索
      if (v.video_id.toLowerCase().includes(query)) return true;

      // タグで検索
      if (v.tags && v.tags.some((tag) => tag.toLowerCase().includes(query))) return true;

      return false;
    });
  }, [videos, searchQuery, completedVideoIds]);

  const sortedSingingParts = useMemo(() => {
    return [...singingParts].sort((a, b) => {
      const timeA = parseTimeString(a.startTime) || 99999;
      const timeB = parseTimeString(b.startTime) || 99999;
      return timeB - timeA;
    });
  }, [singingParts]);

  const loadVideoById = useCallback(
    (videoId: string) => {
      const video = videos.find((v) => v.video_id === videoId);
      if (!video) {
        return;
      }
      setCurrentVideo(video);

      // この動画に紐づく曲データをロード
      const videoSongs = songs.filter((s) => s.video_id === videoId);
      if (videoSongs.length > 0) {
        const loadedParts: SingingPartInput[] = videoSongs.map((song) => ({
          id: song.song_id,
          startTime: formatTime(song.start_time),
          endTime: song.end_time ? formatTime(song.end_time) : "",
          title: song.title,
          artist: song.artist,
        }));
        setSingingParts(loadedParts);
      } else {
        setSingingParts([]);
      }
      setSelectedPartId(null);
    },
    [songs, videos]
  );

  const handleImportVideo = async () => {
    await importVideo(videoInput);
    toast.success("動画をインポートしました");
    await reload();
  };

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
  };

  const markStartTime = (currentTime: number) => {
    if (!selectedPartId) {
      const newPart: SingingPartInput = {
        id: VideoClassifier.generateSongId(songs),
        startTime: formatTime(Math.floor(currentTime)),
        endTime: "",
        title: "",
        artist: "",
      };
      setSingingParts([...singingParts, newPart]);
      setSelectedPartId(newPart.id);
      return;
    }

    setSingingParts(
      singingParts.map((part) =>
        part.id === selectedPartId
          ? { ...part, startTime: formatTime(Math.floor(currentTime)) }
          : part
      )
    );
  };

  const markEndTime = (currentTime: number) => {
    if (!selectedPartId) return;

    setSingingParts(
      singingParts.map((part) =>
        part.id === selectedPartId
          ? { ...part, endTime: formatTime(Math.floor(currentTime)) }
          : part
      )
    );
  };

  const updateLastStartTime = (currentTime: number) => {
    if (!selectedPartId) return;

    setSingingParts(
      singingParts.map((part) =>
        part.id === selectedPartId
          ? { ...part, startTime: formatTime(Math.floor(currentTime)) }
          : part
      )
    );
  };

  const updateLastEndTime = (currentTime: number) => {
    if (!selectedPartId) return;

    setSingingParts(
      singingParts.map((part) =>
        part.id === selectedPartId
          ? { ...part, endTime: formatTime(Math.floor(currentTime)) }
          : part
      )
    );
  };

  const addEmptyPart = () => {
    const newPart: SingingPartInput = {
      id: VideoClassifier.generateSongId(songs),
      startTime: "",
      endTime: "",
      title: "",
      artist: "",
    };
    setSingingParts([...singingParts, newPart]);
    setSelectedPartId(newPart.id);
  };

  const autoFillFromTitle = (part: SingingPartInput): SingingPartInput => {
    const title = part.title.trim();
    if (!title) return part;

    const matchingSongs = songs.filter(
      (song) => song.title === title && !!song.start_time && !!song.end_time
    );

    if (matchingSongs.length === 0) return part;

    // 複数の曲が見つかった場合、最も短い曲を選択
    const matchingSong = matchingSongs.reduce((shortest, current) => {
      const shortestDuration = shortest.end_time! - shortest.start_time!;
      const currentDuration = current.end_time! - current.start_time!;
      return currentDuration < shortestDuration ? current : shortest;
    });

    const updatedPart = { ...part, artist: matchingSong.artist };

    // 開始時間が入力されていて終了時間が空の場合、曲の長さから終了時間を自動補完
    if (
      part.startTime &&
      !part.endTime &&
      matchingSong.start_time !== undefined &&
      matchingSong.end_time !== undefined
    ) {
      const songDuration = matchingSong.end_time - matchingSong.start_time;
      const startTimeSeconds = parseTimeString(part.startTime);
      if (startTimeSeconds !== null && songDuration > 0) {
        const endTimeSeconds = startTimeSeconds + songDuration;
        updatedPart.endTime = formatTime(endTimeSeconds);
      }
    }

    return updatedPart;
  };

  const handleAutoFillFromTitle = (id: string) => {
    setSingingParts(singingParts.map((part) => (part.id === id ? autoFillFromTitle(part) : part)));
  };

  const handleUpdatePart = (id: string, field: keyof SingingPart) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setSingingParts(
        singingParts.map((part) => {
          if (part.id !== id) return part;

          const updatedPart = { ...part, [field]: value };

          // タイトルが変更された場合、既存の曲からアーティストと終了時間を自動設定
          if (field === "title" && value.trim()) {
            return autoFillFromTitle(updatedPart);
          }

          return updatedPart;
        })
      );
    };
  };

  const handleTimeKeyDown = (id: string, field: "startTime" | "endTime") => {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const value = e.currentTarget.value;
        const currentSeconds = parseTimeString(value);

        if (currentSeconds !== null) {
          const adjustment = e.key === "ArrowUp" ? 1 : -1;
          const newSeconds = Math.max(0, currentSeconds + adjustment);
          const newTimeStr = formatTime(newSeconds);

          setSingingParts((prev) =>
            prev.map((part) => (part.id === id ? { ...part, [field]: newTimeStr } : part))
          );
        }
      }
    };
  };

  const handleDeletePart = (id: string) => {
    const deletedPart = singingParts.find((part) => part.id === id);
    if (!deletedPart) return;

    const previousParts = [...singingParts];
    setSingingParts(singingParts.filter((part) => part.id !== id));

    toast.success(
      (t) => (
        <div className="flex items-center gap-2">
          <span>歌唱パートを削除しました</span>
          <button
            onClick={() => {
              setSingingParts(previousParts);
              toast.dismiss(t.id);
            }}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition"
          >
            元に戻す
          </button>
        </div>
      ),
      { duration: 5000 }
    );
  };

  const handleSaveSongs = async () => {
    if (!currentVideo) return;

    const validParts = singingParts.filter(
      (part) => part.title && part.artist && part.endTime !== null
    );

    if (validParts.length === 0) {
      toast.error("保存できる歌唱パートがありません（タイトル、アーティスト、終了時間が必要です）");
      return;
    }

    setIsSaving(true);
    try {
      const songs = validParts.map((part) => ({
        id: part.id,
        startTime: parseTimeString(part.startTime) || 0,
        endTime: parseTimeString(part.endTime) || undefined,
        title: String(part.title),
        artist: String(part.artist),
      }));
      await saveSongs(currentVideo, songs);
      toast.success(`${validParts.length}曲を保存しました`);
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSongsAndComplete = async () => {
    if (!currentVideo) return;

    const validParts = singingParts.filter(
      (part) => part.title && part.artist && part.endTime !== null
    );

    if (validParts.length === 0) {
      toast.error("保存できる歌唱パートがありません（タイトル、アーティスト、終了時間が必要です）");
      return;
    }

    setIsSaving(true);
    try {
      const songs = validParts.map((part) => ({
        id: part.id,
        startTime: parseTimeString(part.startTime) || 0,
        endTime: parseTimeString(part.endTime) || undefined,
        title: String(part.title),
        artist: String(part.artist),
      }));
      await saveSongs(currentVideo, songs, true);
      toast.success(`${validParts.length}曲を保存し、動画を完了状態にしました`);
      // 保存後、現在の動画をクリア
      setCurrentVideo((cv) => (cv === currentVideo ? null : cv));
      setCompletedVideoIds(new Set(completedVideoIds).add(currentVideo.video_id));
      // setSingingParts([]);
    } catch (error) {
      console.error(error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteVideo = async (videoId: string) => {
    if (!confirm("この動画を完了状態にしますか?")) {
      return;
    }

    try {
      await completeVideo(videoId);
      toast.success("動画を完了状態にしました");
    } catch (error) {
      console.error(error);
      toast.error("完了処理に失敗しました");
    }
  };

  const handleSetSingingFalse = async (videoId: string) => {
    if (
      !confirm(
        "この動画を歌枠ではない動画として設定しますか?\n紐づく歌唱パートがあれば削除されます。"
      )
    ) {
      return;
    }

    try {
      const result = await setSingingFalse(videoId);
      toast.success(
        `singingをfalseに設定しました${
          result.deletedCount > 0 ? `（${result.deletedCount}曲削除）` : ""
        }`
      );
      setCompletedVideoIds(new Set(completedVideoIds).add(videoId));
    } catch (error) {
      console.error(error);
      toast.error("処理に失敗しました");
    }
  };

  const seekToTime = (timestamp: string) => {
    videoPlayerRef.current?.seekToTime(parseTimeString(timestamp) || 0);
  };

  const seekAndCheckEnd = (timestamp: string, offset: number) => {
    const endTimeSeconds = parseTimeString(timestamp);
    if (endTimeSeconds !== null) {
      videoPlayerRef.current?.seekAndCheckEnd(endTimeSeconds, offset);
    }
  };

  if (error) {
    toast.error(error);
  }

  return (
    <>
      <header className="absolute px-8 py-4 mb-2 w-full flex items-center justify-between">
        <h1 className="text-3xl">
          <GiSwan size={36} className="inline mr-3 text-blue-400" />
          管理ページ
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem(YOUTUBE_API_KEY);
            localStorage.removeItem(GAS_API_KEY);
          }}
          className="btn text-sm"
        >
          ログアウト
        </button>
      </header>

      <main className="pt-16 px-4 h-full flex flex-rows gap-2">
        <div className="w-[40%] overflow-y-auto">
          {/* 動画インポート */}
          <section className="mb-3 px-4 py-2 bg-gray-800 rounded-lg">
            <h2 className="text-xl mb-2">動画インポート</h2>
            <input
              type="text"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="YouTube動画URLまたはID"
              className="flex-1 px-4 py-2 mr-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleImportVideo}
              className="px-6 py-2 bg-green-700 hover:bg-green-600 rounded transition"
            >
              インポート
            </button>
          </section>

          {/* 未完了動画一覧 */}
          <section className="mb-8 px-6 pt-2 bg-gray-800 rounded-lg">
            <h2 className="text-xl mb-2">未完了動画一覧: {incompletedVideos.length}件</h2>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル、タグ、動画IDで検索"
                className="input-text text-sm"
              />
              <button onClick={reload} className="btn btn-primary text-sm" disabled={loading}>
                {loading ? "読み込み中..." : "再読み込み"}
              </button>
            </div>

            {loading ? (
              <p className="text-center py-8">読み込み中...</p>
            ) : incompletedVideos.length === 0 ? (
              <p className="text-center py-8">未完了の動画はありません</p>
            ) : (
              <div className="space-y-2 overflow-hidden">
                {incompletedVideos.slice(0, 50).map((video) => (
                  <div
                    key={video.video_id}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                  >
                    <div className="flex flex-col">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setVideoInput(video.video_id);
                          loadVideoById(video.video_id);
                        }}
                      >
                        <h3 className="truncate">{video.title}</h3>
                        <p className="text-sm text-gray-400">
                          {new Date(video.published_at).toLocaleDateString()} · {video.video_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-400">
                          {songs.filter((s) => s.video_id === video.video_id).length}曲
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetSingingFalse(video.video_id);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-red-800 hover:bg-red-700 rounded transition text-sm"
                          title="歌枠ではない動画として設定"
                        >
                          NOT歌枠
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteVideo(video.video_id);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 rounded transition text-sm"
                          title="完了にする"
                        >
                          <FaCheck />
                          完了
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="w-[70%] flex flex-col overflow-hidden">
          {currentVideo && (
            <>
              <section className="p-4 mb-4 bg-gray-800 rounded-lg">
                <ManageVideoPlayer
                  ref={videoPlayerRef}
                  videoId={currentVideo.video_id}
                  onMarkStart={markStartTime}
                  onMarkEnd={markEndTime}
                  onUpdateLastStart={updateLastStartTime}
                  onUpdateLastEnd={updateLastEndTime}
                />
              </section>

              {/* 歌唱パート一覧 */}
              <section className="mb-8 p-6 bg-gray-800 rounded-lg overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">歌唱パート ({singingParts.length})</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={addEmptyPart}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded transition"
                    >
                      <FaPlus /> 追加
                    </button>

                    <button
                      onClick={handleSaveSongs}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition"
                      disabled={isSaving}
                    >
                      <FaSave /> 保存
                    </button>
                    <button
                      onClick={handleSaveSongsAndComplete}
                      className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded transition"
                      disabled={singingParts.length === 0 || isSaving}
                    >
                      <FaCheck /> 保存して完了
                    </button>
                    {isSaving && <LoadingIcon />}
                  </div>
                </div>

                <div className="space-y-3">
                  {singingParts.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">歌唱パートが登録されていません</p>
                  ) : (
                    sortedSingingParts.map((part) => (
                      <div
                        key={part.id}
                        onClick={() => handleSelectPart(part.id)}
                        className={`relative pl-4 pr-10 py-2 rounded-lg cursor-pointer transition ${
                          selectedPartId === part.id
                            ? "bg-gray-600 ring-2 ring-gray-400"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        <div className="grid grid-cols-6 gap-3 items-center">
                          <div className="col-span-1">
                            <div className="text-sm text-gray-400">開始</div>
                            <div className="flex gap-1">
                              <input
                                id={`input-startTime-${part.id}`}
                                type="text"
                                value={part.startTime}
                                onChange={handleUpdatePart(part.id, "startTime")}
                                onKeyDown={handleTimeKeyDown(part.id, "startTime")}
                                className="flex-1 px-2 py-1 bg-gray-800 rounded text-sm font-mono w-20"
                                placeholder="mm:ss"
                              />
                              <button
                                onClick={() => {
                                  seekToTime(part.startTime);
                                  document.getElementById(`input-startTime-${part.id}`)?.focus();
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition"
                                title="この位置から再生"
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                          <div className="col-span-1">
                            <div className="text-sm text-gray-400">終了</div>
                            <div className="flex gap-1">
                              <input
                                id={`input-endTime-${part.id}`}
                                type="text"
                                value={part.endTime}
                                onKeyDown={handleTimeKeyDown(part.id, "endTime")}
                                onChange={handleUpdatePart(part.id, "endTime")}
                                className="flex-1 px-2 py-1 bg-gray-800 rounded text-sm font-mono w-20"
                                placeholder="mm:ss"
                              />
                              {part.endTime !== null && (
                                <>
                                  <button
                                    onClick={() => {
                                      seekToTime(part.endTime!);
                                      document.getElementById(`input-endTime-${part.id}`)?.focus();
                                    }}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition"
                                    title="この位置から再生"
                                  >
                                    ▶
                                  </button>
                                  <button
                                    onClick={() => {
                                      seekAndCheckEnd(part.endTime!, 2);
                                      document.getElementById(`input-endTime-${part.id}`)?.focus();
                                    }}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs transition"
                                    title="終了位置の2秒前から再生して確認"
                                  >
                                    <FaCheckCircle size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm text-gray-400">タイトル</div>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={part.title}
                                onChange={handleUpdatePart(part.id, "title")}
                                list="titles-list"
                                className="flex-1 px-2 py-1 bg-gray-800 rounded text-sm"
                                placeholder="曲名"
                              />
                              <button
                                onClick={() => handleAutoFillFromTitle(part.id)}
                                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs transition"
                                title="タイトルから終了位置を推定"
                              >
                                <FaLightbulb size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm text-gray-400">アーティスト</div>
                            <input
                              type="text"
                              value={part.artist}
                              onChange={handleUpdatePart(part.id, "artist")}
                              list="artists-list"
                              className="w-full px-2 py-1 bg-gray-800 rounded text-sm"
                              placeholder="歌手名"
                            />
                          </div>
                        </div>
                        <div className="absolute top-4 right-1.5 flex justify-end">
                          <button
                            onClick={() => handleDeletePart(part.id)}
                            className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-600 rounded transition"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* datalist for autocomplete */}
        {!loading && (
          <>
            <datalist id="titles-list">
              {titles.map((title, index) => (
                <option key={index} value={title} />
              ))}
            </datalist>
            <datalist id="artists-list">
              {artists.map((artist, index) => (
                <option key={index} value={artist} />
              ))}
            </datalist>
          </>
        )}
      </main>
    </>
  );
}
