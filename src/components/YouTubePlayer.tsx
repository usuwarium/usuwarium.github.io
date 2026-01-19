import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { IoEye, IoEyeOff, IoClose } from "react-icons/io5";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { FaShuffle, FaRepeat, FaBackwardStep, FaForwardStep } from "react-icons/fa6";
import { useYouTubePlayer, type SongEndEvent } from "@/hooks/useYouTubePlayer";
import { formatTime } from "@/lib/humanize";
import { usePlayQueue } from "@/hooks/usePlayQueue";
import type { Song, SongId } from "@/lib/types";
import { RangeSlider } from "./RangeSlider";

export type YouTubePlayerRef = {
  isVisible: () => boolean;
  playSong: (playingSongId: SongId) => void;
  playAll: () => void;
  playShuffled: () => void;
  close: () => void;
};

interface YouTubePlayerProps {
  ref: React.Ref<YouTubePlayerRef>;
  songs: Song[];
  onSongChanged: (song: Song | undefined) => void;
}

export function YouTubePlayer({ ref, songs, onSongChanged }: YouTubePlayerProps) {
  const {
    playingSong,
    isRepeated,
    isShuffled,
    play,
    playAll,
    playShuffled,
    playBackward,
    playForward,
    clearQueue,
    toggleShuffle,
    toggleRepeat,
  } = usePlayQueue(songs);

  // 曲終了時のハンドラー
  const handleSongEnd = useCallback(
    (event: SongEndEvent) => {
      const nextSong = playForward();
      if (nextSong) {
        event.controller.startVideo(nextSong.video_id, nextSong.start_time, nextSong.end_time);
      }
    },
    [playForward],
  );

  const {
    videoId,
    isPlaying,
    startTime,
    endTime,
    currentTime,
    duration,
    isVisible,
    volume,
    isMuted,
    seekTo,
    startVideo,
    playVideo,
    pauseVideo,
    stopVideo,
    changeVolume,
    toggleMute,
    setIsVisible,
    isReady,
    Player,
  } = useYouTubePlayer({ width: 320, height: 180, onSongEnd: handleSongEnd });

  // YouTube Player で曲を再生する
  const playSong = useCallback(
    (playingSongId: SongId) => {
      if (!isReady()) return;
      const playingSong = songs.find((s) => s.song_id === playingSongId);
      if (playingSong) {
        startVideo(playingSong.video_id, playingSong.start_time, playingSong.end_time);
      }
    },
    [isReady, songs, startVideo],
  );

  // 外部に公開する操作メソッド
  useImperativeHandle(
    ref,
    () => ({
      isVisible: () => isVisible,
      playSong: (playingSongId: SongId) => {
        play(playingSongId);
        const playingSong = songs.find((s) => s.song_id === playingSongId);
        if (playingSong) {
          startVideo(playingSong.video_id, playingSong.start_time, playingSong.end_time);
        }
      },
      playAll: () => {
        playSong(playAll().song_id);
      },
      playShuffled: () => {
        playSong(playShuffled().song_id);
      },
      close: () => {
        clearQueue();
        stopVideo();
      },
    }),
    [songs, isVisible, startVideo, play, playAll, playShuffled, stopVideo, clearQueue, playSong],
  );

  const seekbarRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!seekbarRef.current) return;
    const seekbarElem = seekbarRef.current;

    const handleInput = (e: Event) => {
      const newTime = parseFloat((e.target as HTMLInputElement).value);
      seekTo(newTime);
    };
    seekbarElem.addEventListener("change", handleInput);
    return () => {
      seekbarElem.removeEventListener("change", handleInput);
    };
  }, [seekTo]);

  useEffect(() => {
    onSongChanged(playingSong);
  }, [playingSong, onSongChanged]);

  // 前の曲を再生
  const handlePlayBackward = () => {
    // 再生時間が 5 秒以上なら曲の先頭に戻り、5 秒未満なら前の曲へ
    if (currentTime - startTime >= 5) {
      seekTo(startTime);
    } else {
      const prevSong = playBackward();
      if (!prevSong) return;
      playSong(prevSong.song_id);
    }
  };

  // 次の曲を再生
  const handlePlayForward = () => {
    const nextSong = playForward();
    if (!nextSong) return;
    playSong(nextSong.song_id);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const handleSeek = (value: number) => {
    seekTo(value);
  };

  const handleVolumeChange = (value: number) => {
    changeVolume(Math.floor(value));
  };

  const handleMuteToggle = () => {
    toggleMute();
  };

  const handleClose = () => {
    clearQueue();
    stopVideo();
  };

  const actualEndTime = endTime || duration;
  const seekEndTime = actualEndTime - startTime;
  let seekTime = currentTime - startTime;
  if (currentTime < startTime || currentTime > actualEndTime) {
    seekTime = 0;
  }

  return (
    <>
      {/* YouTubeプレイヤー（フッターの上にフローティング） */}
      <div className="absolute top-[-182px] left-[50%] md:right-3 z-50 flex justify-center md:justify-end transform-[translate(-50%,0)] md:transform-none m-h-[180px] rounded-lg overflow-hidden shadow-2xl transition-all">
        <div className={`${videoId ? "" : "hidden"}`}>{Player}</div>
      </div>

      {/* コントローラー（親コンポーネントで配置） */}
      <div
        className={`w-full bg-gray-800 border-t border-gray-700 px-2 md:p-3 shadow-2xl ${
          videoId ? "" : "hidden"
        }`}
      >
        {/* シークバー */}
        <div className="md:mb-3 select-none">
          <RangeSlider
            value={currentTime <= actualEndTime ? currentTime : startTime}
            thumbSize={16}
            min={startTime}
            max={actualEndTime}
            step={0.1}
            onInput={handleSeek}
            color="#3b82f6"
            className="w-full h-2"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(seekTime)}</span>
            <span>{formatTime(seekEndTime)}</span>
          </div>
        </div>

        {/* タイトル/アーティスト、コントローラー */}
        <div className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] [grid-template-areas:'title_repeat''control_control'] gap-1 md:gap-2">
          {/* タイトル/アーティスト */}
          <div className="[grid-area:title]">
            <div className="text-sm text-white truncate">{playingSong?.title || "Unknown"}</div>
            <div className="text-xs text-gray-400 truncate">{playingSong?.artist || "Unknown"}</div>
          </div>

          {/* 表示/非表示切り替え・閉じる */}
          <div className="[grid-area:repeat] flex items-center gap-2">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
              aria-label={isVisible ? "プレイヤーを非表示" : "プレイヤーを表示"}
            >
              {isVisible ? <IoEyeOff /> : <IoEye />}
            </button>

            <button
              onClick={handleClose}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
              aria-label="プレイヤーを閉じる"
            >
              <IoClose />
            </button>
          </div>

          {/* コントローラー */}
          <div className="[grid-area:control] select-none flex flex-row justify-end items-center gap-2">
            {/* リピート */}
            <button
              onClick={toggleRepeat}
              className={`btn btn-control ${isRepeated && "btn-primary"}`}
              aria-label="リピート"
            >
              <FaRepeat />
            </button>

            {/* シャッフル*/}
            <button
              onClick={toggleShuffle}
              className={`btn btn-control ${isShuffled && "btn-primary"}`}
              aria-label="シャッフル"
            >
              <FaShuffle />
            </button>

            {/* 音量 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="btn btn-control"
                aria-label={isMuted ? "ミュート解除" : "ミュート"}
              >
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              <RangeSlider
                value={volume}
                thumbSize={12}
                min={0}
                max={100}
                onInput={handleVolumeChange}
                color="#dad9d5"
                className="w-20 h-1"
              />
            </div>

            {/* 前の曲 */}
            <button onClick={handlePlayBackward} className="btn btn-control" aria-label="前の曲">
              <FaBackwardStep />
            </button>

            {/* 再生/一時停止 */}
            <button
              onClick={handlePlayPause}
              className="btn btn-control"
              aria-label={isPlaying ? "一時停止" : "再生"}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            {/* 次の曲 */}
            <button onClick={handlePlayForward} className="btn btn-control" aria-label="次の曲">
              <FaForwardStep />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
