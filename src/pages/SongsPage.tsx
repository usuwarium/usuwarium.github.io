import { AddToPlaylistDropdown } from "@/components/AddToPlaylistDropdown";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { SortIcon } from "@/components/SortIcon";
import { YouTubePlayer, type YouTubePlayerRef } from "@/components/YouTubePlayer";
import { useArtists } from "@/hooks/useArtists";
import { useArtistSongs } from "@/hooks/useArtistSongs";
import { useQuerySongs } from "@/hooks/useQuerySongs";
import { humanizeDate, timestampSpan } from "@/lib/humanize";
import type { SongId } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaListUl, FaRegBookmark, FaTimesCircle } from "react-icons/fa";
import { IoMdMusicalNote } from "react-icons/io";
import Select from "react-select";
import { LoadingIcon } from "@/components/LoadingIcon";
import { useDebouncedState } from "@/hooks/useDebouncedState";
import { RiPlayListAddFill } from "react-icons/ri";

const ITEMS_PER_PAGE = 100;

type SortKey = "published_at" | "artist" | "title";
type SortOrder = "asc" | "desc";

// ナビゲーション状態の型定義
interface NavigationState {
  page: number;
  sortBy: SortKey;
  sortOrder: SortOrder;
  searchQuery: string;
  selectedArtist: string;
  selectedTitle: string;
}

interface OptionType {
  label: string;
  value: string;
}

// URLパラメータからナビゲーション状態を初期化
function initNavigationFromURL(): NavigationState {
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get("page") || "1", 10);
  const sortParam = params.get("sort");
  const orderParam = params.get("order");
  const searchQuery = params.get("q") || "";
  const selectedArtist = params.get("artist") || "";
  const selectedTitle = params.get("title") || "";

  let sortBy: SortKey = "published_at";
  if (sortParam === "published_at" || sortParam === "artist" || sortParam === "title") {
    sortBy = sortParam;
  }

  return {
    page: Math.max(1, page),
    sortBy,
    sortOrder: (orderParam as SortOrder) || "desc",
    searchQuery,
    selectedArtist,
    selectedTitle,
  };
}

// ナビゲーション状態をURLに反映
function updateURL(nav: NavigationState): void {
  const params = new URLSearchParams();

  if (nav.page > 1) {
    params.set("page", nav.page.toString());
  }

  if (nav.sortBy !== "published_at" || nav.sortOrder !== "desc") {
    params.set("sort", nav.sortBy);
    params.set("order", nav.sortOrder);
  }

  if (nav.searchQuery) {
    params.set("q", nav.searchQuery);
  }

  if (nav.selectedArtist) {
    params.set("artist", nav.selectedArtist);
  }

  if (nav.selectedTitle) {
    params.set("title", nav.selectedTitle);
  }

  const newUrl = params.toString() ? `?${params.toString()}` : "/songs";
  window.history.replaceState(null, "", newUrl);
}

export function SongsPage() {
  const youtubePlayerRef = useRef<YouTubePlayerRef>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playingSongId, setPlayingSongId] = useState<SongId | undefined>(undefined);

  // プレイリスト機能用のステート
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Set<SongId>>(new Set());
  const [openDropdownSongId, setOpenDropdownSongId] = useState<SongId | null>(null);
  const [openBulkDropdown, setOpenBulkDropdown] = useState(false);

  // ナビゲーション状態を一元管理
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

  // アーティストとタイトル一覧を取得
  const { artists, error: artistsError } = useArtists();
  const { availableTitles, error: titlesError } = useArtistSongs(navigation.selectedArtist);

  const {
    songs,
    totalCount,
    loading,
    error: songsError,
  } = useQuerySongs({
    searchQuery: navigation.searchQuery,
    artist: navigation.selectedArtist,
    title: navigation.selectedTitle,
    sortBy: navigation.sortBy,
    sortOrder: navigation.sortOrder,
  });

  // ナビゲーション変更時にURLを更新
  useEffect(() => {
    updateURL(navigation);
  }, [navigation]);

  // 総ページ数を計算
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // 検索ワード変更
  const handleSearchChange = (searchQuery: string) => {
    setSearchQuery(searchQuery);
  };

  // アーティスト変更
  const handleArtistChange = (selectedArtist: string) => {
    setNavigation((prev) => ({ ...prev, selectedArtist, page: 1 }));
  };

  // タイトル変更
  const handleTitleChange = (selectedTitle: string) => {
    setNavigation((prev) => ({ ...prev, selectedTitle, page: 1 }));
  };

  // ソート変更
  const handleSortToggle = (sortBy: SortKey) => {
    setNavigation((prev) => {
      if (prev.sortBy === sortBy) {
        // 同じ属性をクリックした場合は昇順・降順を切り替え
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      } else {
        // 異なる属性をクリックした場合は降順で設定
        return {
          ...prev,
          sortBy,
          sortOrder: "desc",
        };
      }
    });
  };

  // ページ変更
  const handlePageChange = (page: number) => {
    setNavigation((prev) => ({ ...prev, page }));
  };

  // プレイリスト関連のハンドラー
  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedSongs(new Set());
    setOpenDropdownSongId(null);
    setOpenBulkDropdown(false);
  };

  const handleToggleSong = (songId: SongId) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleToggleDropdown = (songId: SongId) => {
    setOpenDropdownSongId(openDropdownSongId === songId ? null : songId);
  };

  const handleToggleBulkDropdown = () => {
    setOpenBulkDropdown(!openBulkDropdown);
  };

  const handlePlaylistAdded = () => {
    setOpenDropdownSongId(null);
    setOpenBulkDropdown(false);
    setSelectedSongs(new Set());
    setIsSelectMode(false);
  };

  const getYouTubeUrl = (videoId: string, startTime?: number) => {
    const base = `https://www.youtube.com/watch?v=${videoId}`;
    return startTime ? `${base}&t=${startTime}s` : base;
  };

  // react-select用のオプション形式に変換
  const artistOptions: OptionType[] = useMemo(
    () => [
      { value: "", label: "すべて" },
      ...artists.map((artist) => ({ value: artist, label: artist })),
    ],
    [artists],
  );
  const titleOptions: OptionType[] = useMemo(
    () => [
      { value: "", label: "すべて" },
      ...availableTitles.map((title) => ({ value: title, label: title })),
    ],
    [availableTitles],
  );

  if (songsError) {
    toast.error(songsError);
  }
  if (titlesError) {
    toast.error(titlesError);
  }
  if (artistsError) {
    toast.error(artistsError);
  }

  const page = navigation.page;
  const pageStart = (page - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const displayedSongs = songs.slice(pageStart, pageEnd);

  return (
    <>
      <main className="main">
        <header className="header">
          <h1 className="text-xl md:text-4xl">Songs</h1>

          {/* 検索 */}
          <section className="songs-search">
            <label htmlFor="keyword" className="keyword">
              フリーワード
            </label>
            <SearchInput
              id="keyword"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="検索キーワード"
              className="keyword-field"
            />

            <label htmlFor="artist" className="artist">
              アーティスト
            </label>
            <Select<OptionType>
              id="artist"
              className="artist-field select-box"
              classNamePrefix="Select"
              value={artistOptions.find((opt) => opt.value === navigation.selectedArtist)}
              onChange={(option) => handleArtistChange(option?.value || "")}
              options={artistOptions}
              placeholder="選択..."
              isClearable
            />

            <label htmlFor="title" className="title">
              楽曲タイトル
            </label>
            <Select<OptionType>
              id="title"
              className="title-field select-box"
              classNamePrefix="Select"
              value={titleOptions.find((opt) => opt.value === navigation.selectedTitle)}
              onChange={(option) => handleTitleChange(option?.value || "")}
              options={titleOptions}
              placeholder="選択..."
              isClearable
            />
          </section>

          {/* ソートボタン */}
          <div className="flex">
            <section className="sort-btn-group mb-2 ml-auto">
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
                onClick={() => handleSortToggle("artist")}
                className={`sort-btn ${navigation.sortBy === "artist" ? "sort-btn-active" : ""}`}
              >
                アーティスト
                <SortIcon state={navigation.sortBy === "artist" ? navigation.sortOrder : "none"} />
              </button>
              <button
                onClick={() => handleSortToggle("title")}
                className={`sort-btn ${navigation.sortBy === "title" ? "sort-btn-active" : ""}`}
              >
                タイトル
                <SortIcon state={navigation.sortBy === "title" ? navigation.sortOrder : "none"} />
              </button>
            </section>
          </div>

          {loading ? (
            <section className="text-center">
              <div className="py-2">
                <LoadingIcon />
              </div>
            </section>
          ) : (
            <section className="flex items-center justify-between gap-2">
              {isSelectMode ? (
                <div className="relative">
                  <button
                    onClick={handleToggleBulkDropdown}
                    disabled={selectedSongs.size === 0}
                    className="btn btn-primary text-sm md:text-base"
                  >
                    <FaListUl /> <span className="hidden md:inline">プレイリストに</span>追加 (
                    {selectedSongs.size})
                  </button>
                  {openBulkDropdown && selectedSongs.size > 0 && (
                    <AddToPlaylistDropdown
                      songs={displayedSongs.filter((s) => selectedSongs.has(s.song_id))}
                      onAdded={handlePlaylistAdded}
                      onClose={() => setOpenBulkDropdown(false)}
                    />
                  )}
                </div>
              ) : (
                <button onClick={handleToggleSelectMode} className="btn text-sm md:text-base">
                  <FaListUl /> 複数選択
                </button>
              )}
              {isSelectMode && (
                <button onClick={handleToggleSelectMode} className="btn text-sm md:text-base">
                  <FaTimesCircle /> キャンセル
                </button>
              )}
              <div className="py-2 ml-auto flex-1 text-right">
                <span className="hidden md:inline">検索結果：</span>
                <span className="align-text-bottom font-bold text-blue-400">{totalCount}</span>
                &nbsp;曲
              </div>
            </section>
          )}
        </header>

        <div className="content px-2 md:px-8" ref={contentRef}>
          {/* 一覧表示 */}
          <section className="h-full">
            {!loading && totalCount === 0 && (
              <p className="text-center">該当する楽曲が見つかりませんでした</p>
            )}
            {!loading && totalCount > 0 && (
              <div className="song-table">
                <div className="row-header">
                  {isSelectMode ? (
                    <div className="col-header col col-1 flex justify-center items-center">
                      選択
                    </div>
                  ) : (
                    <div className="col-header col col-1 flex justify-center items-center">
                      <RiPlayListAddFill size={18} className="inline" />
                      <span className="ml-1 hidden md:inline">プレイリスト</span>
                    </div>
                  )}
                  <div className="col-header col col-2">楽曲</div>
                  <div className="col-header col col-3 hidden md:block">元動画</div>
                </div>
                {displayedSongs.map((song) => {
                  const isPlaying = playingSongId === song.song_id;
                  return (
                    <div
                      key={song.song_id}
                      className={`row hover:bg-gray-700/50 ${isPlaying && "bg-gray-700/50"}`}
                    >
                      {isSelectMode && (
                        <div className="col col-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedSongs.has(song.song_id)}
                            onChange={() => handleToggleSong(song.song_id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      )}
                      {!isSelectMode && (
                        <div className="col col-1 relative">
                          <button
                            onClick={() => handleToggleDropdown(song.song_id)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                          >
                            <FaRegBookmark className="inline mr-1" />
                            <span className="hidden md:inline md:px-1">追加</span>
                          </button>
                          {openDropdownSongId === song.song_id && (
                            <AddToPlaylistDropdown
                              songs={[song]}
                              onAdded={handlePlaylistAdded}
                              onClose={() => setOpenDropdownSongId(null)}
                            />
                          )}
                        </div>
                      )}
                      <div className="col col-2 self-center">
                        <a
                          href="#"
                          onClick={() => youtubePlayerRef.current?.playSong(song.song_id)}
                          className="inline-block w-full h-full hover:underline"
                        >
                          {isPlaying && (
                            <IoMdMusicalNote className="inline text-blue-400 flex-shrink-0" />
                          )}
                          <span>
                            {song.title} / {song.artist || "-"}
                          </span>
                        </a>
                      </div>
                      <div className="col col-3 truncate">
                        <a
                          href={getYouTubeUrl(song.video_id, song.start_time)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline pointer-events-none md:pointer-events-auto"
                          title={song.video_title}
                        >
                          <span>{song.video_title}</span>
                        </a>
                        <div className="text-gray-400 text-xs whitespace-nowrap">
                          {humanizeDate(song.video_published_at)}&nbsp;
                          {timestampSpan(song.start_time, song.end_time)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="footer relative bg-gray-800 border-t border-gray-700">
        {/* YouTubeプレイヤーコントローラー */}
        <YouTubePlayer
          ref={youtubePlayerRef}
          songs={songs}
          onSongChanged={(song) => setPlayingSongId(song?.song_id)}
        />

        {/* ページネーション */}
        <div className="flex justify-center">
          <Pagination
            currentPage={navigation.page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            scrollTargetRef={contentRef}
          />
        </div>
      </footer>
    </>
  );
}
