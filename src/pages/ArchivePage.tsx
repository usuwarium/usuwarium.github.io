import { useState, useEffect, useRef, useMemo } from "react";
import type { Video } from "@/lib/types";
import { useQueryVideos } from "@/hooks/useQueryVideos";
import { VideoGallery } from "@/components/VideoGallery";
import { VideoModal } from "@/components/VideoModal";
import { Pagination } from "@/components/Pagination";
import { SortIcon } from "@/components/SortIcon";
import { QUICK_FILTER_ITEMS } from "@/lib/filter";
import toast from "react-hot-toast";
import { SearchInput } from "@/components/SearchInput";
import { LoadingIcon } from "@/components/LoadingIcon";
import { useDebouncedState } from "@/hooks/useDebouncedState";

const ITEMS_PER_PAGE = 32;

// ナビゲーション状態の型定義
interface NavigationState {
  page: number;
  sortBy: "published_at" | "like_count" | "view_count" | null;
  sortOrder: "asc" | "desc";
  searchQuery: string;
  selectedFilter: string | null;
}

// URLパラメータからナビゲーション状態を初期化
function initNavigationFromURL(): NavigationState {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page") || "1", 10);
  const sortParam = params.get("sort");
  const orderParam = params.get("order");
  const searchQuery = params.get("q") || "";
  const selectedFilter = params.get("filter") || null;

  let sortBy: "published_at" | "like_count" | "view_count" = "published_at";
  if (sortParam === "published_at" || sortParam === "like_count" || sortParam === "view_count") {
    sortBy = sortParam;
  }

  return {
    page: Math.max(1, page),
    sortBy,
    sortOrder: (orderParam as "asc" | "desc") || "desc",
    searchQuery,
    selectedFilter,
  };
}

// ナビゲーション状態をURLに反映
function updateURL(nav: NavigationState): void {
  const params = new URLSearchParams();

  if (nav.page > 1) {
    params.set("page", nav.page.toString());
  }

  if (nav.sortBy) {
    params.set("sort", nav.sortBy);
    params.set("order", nav.sortOrder);
  }

  if (nav.searchQuery) {
    params.set("q", nav.searchQuery);
  }

  if (nav.selectedFilter) {
    params.set("filter", nav.selectedFilter);
  }

  const newUrl = params.toString() ? `?${params.toString()}` : "/archives";
  window.history.replaceState(null, "", newUrl);
}

export function ArchivePage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [navigation, setNavigation] = useState<NavigationState>(() => initNavigationFromURL());

  // 検索クエリをdebounceしてnavigationを更新
  const [searchQuery, setSearchQuery] = useDebouncedState(
    navigation.searchQuery,
    300,
    (value: string) => {
      setNavigation((prev) => {
        if (prev.searchQuery !== value) {
          return { ...prev, searchQuery: value, page: 1 };
        }
        return prev;
      });
    },
  );

  // 動画データを取得
  const {
    videos: displayedVideos,
    totalCount,
    loading,
    error,
  } = useQueryVideos({
    searchQuery: navigation.searchQuery,
    selectedFilter: navigation.selectedFilter,
    sortBy: navigation.sortBy,
    sortOrder: navigation.sortOrder,
    page: navigation.page,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  // ナビゲーション変更時にURLを更新
  useEffect(() => {
    updateURL(navigation);
  }, [navigation]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSortToggle = (sortKey: "published_at" | "like_count" | "view_count") => {
    setNavigation((prev) => {
      if (prev.sortBy === sortKey) {
        // 同じ属性をクリックした場合は昇順・降順を切り替え
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      } else {
        // 異なる属性をクリックした場合は降順で設定
        return {
          ...prev,
          sortBy: sortKey,
          sortOrder: "desc",
        };
      }
    });
  };

  const handlePageChange = (page: number) => {
    setNavigation((prev) => ({ ...prev, page }));
  };

  const handleSearchChange = (searchQuery: string) => {
    setSearchQuery(searchQuery);
  };

  const handleFilterChange = (selectedFilter: string | null) => {
    setNavigation((prev) => ({ ...prev, selectedFilter, page: 1 }));
  };

  if (error) {
    toast.error(error);
  }

  return (
    <>
      <main className="main">
        <header className="header">
          <h1 className="text-xl md:text-4xl">Archives</h1>
          {/* クイックフィルタ */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
            <section className="flex flex-wrap">
              {QUICK_FILTER_ITEMS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() =>
                    handleFilterChange(navigation.selectedFilter === filter.key ? null : filter.key)
                  }
                  className={`quick-filter-btn ${
                    filter.hideOnMobile ? "hidden md:inline-block" : ""
                  } ${navigation.selectedFilter === filter.key ? "quick-filter-btn-active" : ""}`}
                >
                  {filter.label}
                </button>
              ))}
            </section>
          </div>

          <div className="flex flex-col md:flex-row gap-2 mb-1.5">
            <section>
              <SearchInput
                id="search"
                type="text"
                placeholder="動画を検索..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </section>

            {/* ソート選択 */}
            <section className="sort-btn-group ml-auto">
              <button
                onClick={() => handleSortToggle("published_at")}
                className={`sort-btn ${
                  navigation.sortBy === "published_at" ? "sort-btn-active" : ""
                }`}
              >
                投稿日時
                <SortIcon
                  state={navigation.sortBy === "published_at" ? navigation.sortOrder : "none"}
                />
              </button>
              <button
                onClick={() => handleSortToggle("like_count")}
                className={`sort-btn ${
                  navigation.sortBy === "like_count" ? "sort-btn-active" : ""
                }`}
              >
                高評価数
                <SortIcon
                  state={navigation.sortBy === "like_count" ? navigation.sortOrder : "none"}
                />
              </button>
              <button
                onClick={() => handleSortToggle("view_count")}
                className={`sort-btn ${
                  navigation.sortBy === "view_count" ? "sort-btn-active" : ""
                }`}
              >
                再生数
                <SortIcon
                  state={navigation.sortBy === "view_count" ? navigation.sortOrder : "none"}
                />
              </button>
            </section>
          </div>

          <section>
            検索結果：&nbsp;
            <span className="font-bold text-blue-400">{totalCount}</span>
            &nbsp;件
          </section>
        </header>

        <div className="content px-2 md:px-8" ref={contentRef}>
          <section>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-white text-xl">
                  <LoadingIcon />
                </div>
              </div>
            ) : totalCount === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-400">動画が見つかりません</p>
              </div>
            ) : (
              <VideoGallery videos={displayedVideos} onVideoClick={setSelectedVideo} />
            )}
          </section>
        </div>

        {selectedVideo && (
          <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
        )}
      </main>

      <footer className="footer bg-gray-800 border-t border-gray-700">
        {totalPages > 0 && (
          <Pagination
            currentPage={navigation.page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            scrollTargetRef={contentRef}
          />
        )}
      </footer>
    </>
  );
}
