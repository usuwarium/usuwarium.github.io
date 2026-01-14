import { useEffect, useRef } from "react";

import { useSongsByVideoId } from "@/hooks/useSongsByVideoId";
import { humanizeDatetime, timestampSpan } from "@/lib/humanize";
import { IoMdMusicalNote } from "react-icons/io";
import { BiLike } from "react-icons/bi";
import type { Video } from "@/lib/types";
import { FaTimesCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

interface VideoModalProps {
  video: Video;
  onClose: () => void;
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { songs, loading, error } = useSongsByVideoId(video.video_id);
  const { Player: YouTubePlayer, seekTo } = useYouTubePlayer({
    videoId: video.video_id,
    width: "100%",
    height: "100%",
    controls: true,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  const closeByOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ref.current === e.target) {
      onClose();
    }
  };

  const handleSongClick = (startTime: number) => {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (startTime !== undefined) {
        seekTo(startTime);
      }
    };
  };

  if (error) {
    toast.error("歌唱情報の読み込みに失敗しました");
  }

  return (
    <div
      id="video-modal"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      ref={ref}
      onClick={closeByOutside}
    >
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end p-2 mr-3">
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <FaTimesCircle className="text-2xl text-white" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {YouTubePlayer}

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white mb-2">{video.title}</h2>

            <div>
              <p className="text-sm text-gray-300">
                <span className="mr-4">{humanizeDatetime(video.published_at)}</span>
                <BiLike className="inline" /> {video.like_count.toLocaleString()}
              </p>
            </div>

            {!loading && !error && songs.length > 0 && (
              <div className="pt-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  <IoMdMusicalNote className="inline" /> 歌唱曲
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {songs.map((song, idx) => (
                    <div key={idx} className="bg-gray-800 rounded p-2 text-sm">
                      <a
                        href="#"
                        className="block hover:bg-gray-700 rounded p-1 -m-1 transition-colors cursor-pointer"
                        onClick={handleSongClick(song.start_time)}
                      >
                        <p className="text-white">
                          <span>{song.title}</span>
                          {song.artist && (
                            <>
                              <span>&nbsp;/&nbsp;</span>
                              <span>{song.artist}</span>
                            </>
                          )}
                        </p>

                        {song.start_time !== undefined && (
                          <p className="text-gray-300 text-xs">
                            {timestampSpan(song.start_time, song.end_time)}
                          </p>
                        )}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
