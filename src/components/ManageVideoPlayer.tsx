import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { formatTime } from "@/lib/humanize";
import { useImperativeHandle } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { FaPause, FaPlay, FaPlus } from "react-icons/fa";

export interface ManageVideoPlayerRef {
  seekToTime: (seconds: number, play?: boolean) => void;
  seekAndCheckEnd: (endTime: number, offset: number) => void;
}

interface ManageVideoPlayerProps {
  ref: React.Ref<ManageVideoPlayerRef>;
  videoId: string;
  onMarkStart: (currentTime: number) => void;
  onMarkEnd: (currentTime: number) => void;
  onUpdateLastStart: (currentTime: number) => void;
  onUpdateLastEnd: (currentTime: number) => void;
}

export function ManageVideoPlayer({
  ref,
  videoId,
  onMarkStart,
  onMarkEnd,
}: ManageVideoPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    seekTo,
    playVideo,
    pauseVideo,
    resetEndTime,
    Player: YouTubePlayer,
  } = useYouTubePlayer({
    videoId,
    width: 427,
    height: 240,
    controls: true,
    visible: true,
    onSongEnd: () => {
      // 終了位置チェック時の停止後にリセット
      resetEndTime(undefined);
    },
  });

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const seekSeconds = (seconds: number) => {
    seekToTime(Math.max(0, Math.min(duration, currentTime + seconds)));
  };

  const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekToTime(parseFloat(e.target.value));
  };

  const seekToTime = (seconds: number, play?: boolean) => {
    resetEndTime(undefined);
    seekTo(seconds);
    if (play) {
      playVideo();
    }
  };

  const seekAndCheckEnd = (endTime: number, offset: number) => {
    // 終了位置の offset 秒前から再生開始し、終了位置で自動停止
    const startTime = Math.max(0, endTime - offset);
    seekTo(startTime);
    resetEndTime(endTime);
    playVideo();
  };

  // 外部からseekToTimeを呼び出せるようにする
  useImperativeHandle(ref, () => ({
    seekToTime,
    seekAndCheckEnd,
  }));

  const handleMarkStart = () => {
    onMarkStart(currentTime);
  };

  const handleMarkEnd = () => {
    onMarkEnd(currentTime);
  };

  useHotkeys("space", togglePlayPause, { preventDefault: true });
  useHotkeys("s", handleMarkStart, { preventDefault: true });
  useHotkeys("e", handleMarkEnd, { preventDefault: true });
  useHotkeys("left", () => seekSeconds(-1), { preventDefault: true });
  useHotkeys("right", () => seekSeconds(1), { preventDefault: true });

  return (
    <section className="flex flex-row items-center gap-4">
      <div>
        <div className="mb-4 w-[427px]">{YouTubePlayer}</div>

        <div className="w-full">
          {/* シークバー */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeekBarChange}
              className="flex-1"
            />
            <span className="text-sm font-mono">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div>
        {/* コントロール */}
        <div>
          {/* 操作ボタン */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <button onClick={() => seekSeconds(-30)} className="btn">
              -30s
            </button>
            <button onClick={() => seekSeconds(-5)} className="btn">
              -5s
            </button>
            <button onClick={() => seekSeconds(-1)} className="btn">
              -1s
            </button>
            <button onClick={togglePlayPause} className="btn btn-primary">
              {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
            </button>
            <button onClick={() => seekSeconds(1)} className="btn">
              +1s
            </button>
            <button onClick={() => seekSeconds(5)} className="btn">
              +5s
            </button>
            <button onClick={() => seekSeconds(30)} className="btn">
              +30s
            </button>
          </div>

          {/* マークボタン */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleMarkStart}
                className="flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 rounded transition"
              >
                <FaPlus /> 開始位置マーク (S)
              </button>
              <button
                onClick={handleMarkEnd}
                className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-600 rounded transition"
              >
                <FaPlus /> 終了位置マーク (E)
              </button>
            </div>
          </div>

          <div className="text-center text-sm">
            <p>キーボードショートカット: Space=再生/停止, S=開始, E=終了, ←→=1秒シーク</p>
          </div>
        </div>
      </div>
    </section>
  );
}

ManageVideoPlayer.displayName = "ManageVideoPlayer";
