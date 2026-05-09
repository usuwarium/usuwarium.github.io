import type { Video } from "@/lib/types";
import { VideoCard } from "./VideoCard";

interface VideoGalleryProps {
  videos: Video[];
  onVideoClick: (video: Video) => void;
  thumbnailSize?: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault";
}

export function VideoGallery({
  videos,
  onVideoClick,
  thumbnailSize = "hqdefault",
}: VideoGalleryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {videos.map((video) => (
        <div key={video.video_id}>
          <VideoCard video={video} onClick={onVideoClick} thumbnailSize={thumbnailSize} />
        </div>
      ))}
    </div>
  );
}
