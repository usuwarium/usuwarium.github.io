import { getThumbnailUrl } from "@/lib/db";
import { humanizeDatetime } from "@/lib/humanize";
import type { Video } from "@/lib/types";

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <article className="cursor-pointer group" onClick={() => onClick(video)}>
      <div className="relative overflow-hidden rounded-md aspect-video">
        <img
          src={getThumbnailUrl(video, "hqdefault")}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="pt-2 space-y-1">
        <div className="relative">
          <div className="text-sm line-clamp-1 md:line-clamp-2">{video.title}</div>
        </div>
        <p className="text-xs leading-tight">{humanizeDatetime(video.published_at)}</p>
      </div>
    </article>
  );
}
