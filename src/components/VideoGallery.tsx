import type { Video } from "@/lib/types";
import { VideoCard } from "./VideoCard";

interface VideoGalleryProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
}

export function VideoGallery({ videos, onVideoClick }: VideoGalleryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {videos.map((video) => (
        <div key={video.video_id}>
          <VideoCard video={video} onClick={onVideoClick} />
        </div>
      ))}
    </div>
  );
}
