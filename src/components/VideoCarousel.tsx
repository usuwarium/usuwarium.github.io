import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { VideoCard } from "@/components/VideoCard";
import { VideoModal } from "@/components/VideoModal";
import { LoadingIcon } from "@/components/LoadingIcon";
import { FaChevronRight, FaChevronLeft } from "react-icons/fa";
import type { Video } from "@/lib/types";
import { useQueryVideos } from "@/hooks/useQueryVideos";

export interface VideoSection {
  title: string;
  linkTo: string;
  linkText: string;
  filter: string;
  q?: string;
}

interface VideoCarouselProps {
  section: VideoSection;
  className?: string;
}

export function VideoCarousel({ section, className }: VideoCarouselProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const { videos, loading } = useQueryVideos({
    searchQuery: section.q,
    selectedFilter: section.filter,
    sortBy: "published_at",
    sortOrder: "desc",
    page: 1,
    itemsPerPage: 20,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
      skipSnaps: false,
      dragFree: false,
    },
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const onPrevButtonClick = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
  }, [emblaApi]);

  const onNextButtonClick = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  const handleCardClick = (video: Video) => {
    setSelectedVideo(video);
  };

  if (loading) {
    return (
      <section className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl py-2">{section.title}</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <LoadingIcon />
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex flex-wrap mb-4">
        <h2 className="text-3xl w-full md:w-auto py-2 mr-4">{section.title}</h2>
        <Link to={section.linkTo} className="link-btn text-sm self-center">
          {section.linkText}
          <FaChevronRight className="text-sm mb-0.5 ml-1" />
        </Link>
        <button
          onClick={onPrevButtonClick}
          className="link-btn ml-auto mr-4 p-0! pb-1! w-[40px] h-[40px] self-center"
        >
          <FaChevronLeft />
        </button>
        <button
          onClick={onNextButtonClick}
          className="link-btn p-0! pb-1! w-[40px] h-[40px] self-center"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="embla">
        <div ref={emblaRef} className="embla-viewport overflow-hidden">
          <div className="embla-container flex">
            {videos.map((video) => (
              <div
                key={video.video_id}
                className="glow-0 shrink-0 basis-1/1 md:basis-1/3 min-w-0 px-2"
              >
                <VideoCard video={video} onClick={() => handleCardClick(video)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedVideo && <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </section>
  );
}
