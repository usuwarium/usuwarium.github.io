import type { VideoId } from "@/lib/types";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import useLocalStorage from "./useLocalStorage";
import toast from "react-hot-toast";

interface YTPlayerController {
  volume: number;
  isMuted: boolean;
}

export interface SongEndEvent {
  controller: Pick<UseYouTubePlayerResult, "startVideo" | "stopVideo">;
}

export interface YouTubePlayerParams {
  videoId?: VideoId;
  width?: string | number;
  height?: string | number;
  visible?: boolean;
  controls?: boolean;
  onSongEnd?: (event: SongEndEvent) => void;
}

/**
 * YouTube Iframe API を読み込む
 */
async function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve();
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        reject(new Error("Failed to load YouTube Iframe API"));
      };
      tag.onabort = () => {
        reject(new Error("YouTube Iframe API loading aborted"));
      };
      document.head.appendChild(tag);
    }
  });
}

export interface UseYouTubePlayerResult {
  isPlaying: boolean;
  videoId: VideoId | undefined;
  startTime: number;
  endTime: number;
  currentTime: number;
  duration: number;
  isVisible: boolean;
  volume: number;
  isMuted: boolean;
  seekTo: (time: number) => void;
  startVideo: (videoId: VideoId, startTime?: number, endTime?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  changeVolume: (vol: number) => void;
  toggleMute: () => void;
  setIsVisible: (visible: boolean) => void;
  isReady: () => boolean;
  resetEndTime: (endTime?: number) => void;
  Player: JSX.Element;
}

export function useYouTubePlayer({
  videoId: initialVideoId,
  width = 320,
  height = 180,
  visible = true,
  controls = false,
  onSongEnd,
}: YouTubePlayerParams): UseYouTubePlayerResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player>(null);
  const [isVisible, setIsVisible] = useState(visible);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoId, setVideoId] = useState<VideoId | undefined>(initialVideoId);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Number.MAX_SAFE_INTEGER);
  const [duration, setDuration] = useState(Number.MAX_SAFE_INTEGER);
  const [controller, setController] = useLocalStorage<YTPlayerController>("yt-controller", {
    volume: 100,
    isMuted: false,
  });
  const [isAPIReady, setIsAPIReady] = useState(false);
  // 操作するたびにプレイヤーが再生成されるのを防ぐため参照をrefで保持
  const controllerRef = useRef(controller);
  const onSongEndRef = useRef<() => void>(() => {});
  const startTimeRef = useRef<number>(0);

  // YT Player API の初期化
  useEffect(() => {
    (async () => {
      try {
        await loadYouTubeAPI();
        setIsAPIReady(true);
      } catch (error) {
        console.error(error);
        toast.error("YouTube APIの読み込みに失敗しました。");
      }
    })();
  }, []);

  // startTime の変更を ref に同期
  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    if (!containerRef.current || !isAPIReady) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: initialVideoId ?? "",
      width,
      height,
      playerVars: {
        autoplay: 0,
        enablejsapi: 1,
        controls: controls ? 1 : 0,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event) => {
          setStartTime(0);
          setEndTime(event.target.getDuration());
          setDuration(event.target.getDuration());
          playerRef.current?.setVolume(controllerRef.current.volume);
          if (controllerRef.current.isMuted) {
            playerRef.current?.mute();
          } else {
            playerRef.current?.unMute();
          }
        },
        onStateChange: (event) => {
          if (playerRef.current?.getDuration) {
            setDuration(playerRef.current.getDuration());
          }
          if (event.data === window.YT.PlayerState.UNSTARTED) {
            setIsPlaying(false);
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);

            // シークバーを末尾まで移動させ次動画に移動したときに
            // 現在位置が startTime ではなく 0 秒から開始されることがある問題の暫定対処
            if (playerRef.current && playerRef.current.getCurrentTime() < startTimeRef.current) {
              playerRef.current.seekTo(startTimeRef.current, true);
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            if (onSongEndRef.current) {
              onSongEndRef.current();
            }
          }
        },
      },
    });

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isAPIReady, initialVideoId, controls, width, height]);

  // プレイヤー状態を監視
  useEffect(() => {
    if (!isPlaying) return;

    const timerId = window.setInterval(() => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;

      // 再生時間の同期
      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);

      // 音量とミュート状態の同期
      const volume = playerRef.current.getVolume();
      const isMuted = playerRef.current.isMuted();
      setController((prev) => {
        return {
          ...prev,
          volume: volume,
          isMuted: isMuted,
        };
      });

      // 終了位置に達したかチェック
      if (isPlaying && endTime > 0 && time >= endTime && playerRef.current.getVideoData()) {
        playerRef.current.pauseVideo();
        if (onSongEndRef.current) {
          onSongEndRef.current();
        }
        setCurrentTime(startTime);
        setIsPlaying(false);
      }
    }, 100);

    return () => {
      clearInterval(timerId);
    };
  }, [isPlaying, startTime, endTime, setController]);

  /**
   * 動画内の範囲を指定して再生する
   */
  const startVideo = useCallback(
    (id: VideoId, startTime?: number, endTime?: number) => {
      if (!playerRef.current) return;
      if (!playerRef.current?.loadVideoById) return;
      // 再生する曲が同一動画内ならシークのみ行ったほうが良いが
      // 素早く操作したときに不具合が起きることがあるため毎回動画を読み込む
      // 原因不明だが seekTo で指定した位置にシークせず0秒に戻ってしまうことがある
      playerRef.current.loadVideoById(id, startTime ?? 0);
      setStartTime(startTime ?? 0);
      setVideoId(id);
      if (endTime !== undefined) {
        setEndTime(endTime);
      } else {
        setEndTime(duration);
      }
      playerRef.current.playVideo();
      setVideoId(id);
      setIsPlaying(true);
    },
    [duration],
  );

  const playVideo = useCallback(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (playerRef.current && playerRef.current.pauseVideo) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  }, []);

  const stopVideo = useCallback(() => {
    pauseVideo();
    setVideoId(undefined);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(Number.MAX_SAFE_INTEGER);
  }, [pauseVideo]);

  const seekTo = useCallback(
    (time: number) => {
      if (!playerRef.current || !playerRef.current.seekTo) return;
      if (startTime <= time || time < endTime) {
        playerRef.current.seekTo(time, true);
        setCurrentTime(time);
      }
    },
    [startTime, endTime],
  );

  const changeVolume = useCallback(
    (vol: number) => {
      if (!playerRef.current || !playerRef.current.setVolume) {
        return;
      }
      playerRef.current.setVolume(vol);
      if (vol === 0) {
        setController({ ...controller, volume: vol, isMuted: true });
        playerRef.current.mute();
      } else if (vol > 0) {
        setController({ ...controller, volume: vol, isMuted: false });
        playerRef.current.unMute();
      } else {
        setController({ ...controller, volume: vol });
      }
    },
    [controller, setController],
  );

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      if (controller.isMuted) {
        playerRef.current.unMute();
        if (controller.volume === 0) {
          playerRef.current.setVolume(100);
          setController({ ...controller, volume: 100, isMuted: false });
        } else {
          setController({ ...controller, isMuted: false });
        }
      } else {
        playerRef.current.mute();
        setController({ ...controller, isMuted: true });
      }
    }
  }, [controller, setController]);

  const resetEndTime = useCallback(
    (endTime?: number) => {
      if (endTime !== undefined) {
        setEndTime(endTime);
      } else {
        setEndTime(duration);
      }
    },
    [duration],
  );

  useEffect(() => {
    onSongEndRef.current = () => {
      if (onSongEnd) {
        onSongEnd({ controller: { startVideo, stopVideo } });
      }
    };
  }, [onSongEnd, startVideo, stopVideo]);

  const Player = (
    <div
      className={`aspect-video inline-block bg-black rounded-lg overflow-hidden w-full ${
        isVisible && videoId ? "opacity-100" : "opacity-0 h-0"
      }`}
    >
      <div ref={containerRef} />
    </div>
  );

  return {
    isReady: () => !!playerRef.current?.loadVideoById,
    isPlaying,
    videoId,
    startTime,
    endTime,
    currentTime,
    duration,
    isVisible,
    volume: controller.isMuted ? 0 : controller.volume,
    isMuted: controller.isMuted,
    seekTo,
    startVideo,
    playVideo,
    pauseVideo,
    stopVideo,
    changeVolume,
    toggleMute,
    setIsVisible,
    resetEndTime,
    Player,
  };
}
