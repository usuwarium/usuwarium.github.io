import { useState, useMemo } from "react";
import Select from "react-select";
import { useQuerySongs } from "@/hooks/useQuerySongs";
import { useArtists } from "@/hooks/useArtists";
import { Pagination } from "@/components/Pagination";
import toast from "react-hot-toast";
import { LoadingIcon } from "@/components/LoadingIcon";

interface OptionType {
  label: string;
  value: string;
}

type ViewMode = "song" | "artist";

const ITEMS_PER_PAGE = 50;

export function StatisticsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("song");
  const [startYear, setStartYear] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [searchTitle, setSearchTitle] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());

  const { artists } = useArtists();

  // 全曲データを取得
  const { songs, loading, error } = useQuerySongs({
    searchQuery: "",
    artist: selectedArtist,
    title: "",
    sortBy: "published_at",
    sortOrder: "desc",
  });

  // 期間でフィルタリング
  const filteredSongs = useMemo(() => {
    let filtered = songs;

    // タイトル検索でフィルタリング
    if (searchTitle) {
      filtered = filtered.filter((song) => song.title === searchTitle);
    }

    // 期間でフィルタリング
    if (startYear && endYear) {
      filtered = filtered.filter((song) => {
        const publishedDate = new Date(song.video_published_at);
        const year = publishedDate.getFullYear();
        const month = publishedDate.getMonth() + 1;

        const start = parseInt(startYear) * 100 + (parseInt(startMonth) || 1);
        const end = parseInt(endYear) * 100 + (parseInt(endMonth) || 12);
        const current = year * 100 + month;
        return current >= start && current <= end;
      });
    }

    return filtered;
  }, [songs, searchTitle, startYear, startMonth, endYear, endMonth]);

  // 曲ごとの集計
  const songStats = useMemo(() => {
    const stats = new Map<string, { count: number; artist: string; title: string }>();

    filteredSongs.forEach((song) => {
      const key = `${song.artist}|||${song.title}`;
      const existing = stats.get(key);
      if (existing) {
        existing.count++;
      } else {
        stats.set(key, { count: 1, artist: song.artist, title: song.title });
      }
    });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [filteredSongs]);

  // アーティストごとの集計
  const artistStats = useMemo(() => {
    const stats = new Map<string, number>();

    filteredSongs.forEach((song) => {
      const artist = song.artist || "Unknown";
      stats.set(artist, (stats.get(artist) || 0) + 1);
    });

    return Array.from(stats.entries())
      .map(([artist, count]) => ({ artist, count, title: undefined }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSongs]);

  // 現在の統計データ（ページネーション前の全データ）
  const allStats = viewMode === "song" ? songStats : artistStats;

  // ページネーション適用
  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return allStats.slice(startIndex, endIndex);
  }, [allStats, currentPage]);

  const totalPages = Math.ceil(allStats.length / ITEMS_PER_PAGE);

  // アーティストの曲別集計を取得
  const getArtistSongs = (artist: string) => {
    const stats = new Map<string, { count: number; artist: string; title: string }>();

    filteredSongs
      .filter((song) => song.artist === artist)
      .forEach((song) => {
        const key = `${song.artist}|||${song.title}`;
        const existing = stats.get(key);
        if (existing) {
          existing.count++;
        } else {
          stats.set(key, { count: 1, artist: song.artist, title: song.title });
        }
      });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  };

  // アーティストの展開/折りたたみをトグル
  const toggleArtist = (artist: string) => {
    const newExpanded = new Set(expandedArtists);
    if (newExpanded.has(artist)) {
      newExpanded.delete(artist);
    } else {
      newExpanded.add(artist);
    }
    setExpandedArtists(newExpanded);
  };

  // 年の選択肢を生成
  const yearOptions: OptionType[] = useMemo(() => {
    const years = new Set<number>();
    songs.forEach((song) => {
      const year = new Date(song.video_published_at).getFullYear();
      years.add(year);
    });
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => ({ value: year.toString(), label: year.toString() }));
  }, [songs]);

  // 月の選択肢
  const monthOptions: OptionType[] = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1}月`,
  }));

  // アーティストの選択肢
  const artistOptions: OptionType[] = [
    { value: "", label: "すべて" },
    ...artists.map((artist) => ({ value: artist, label: artist })),
  ];

  // タイトルの選択肢を生成
  const titleOptions: OptionType[] = useMemo(() => {
    const titles = new Set<string>();
    songs.forEach((song) => {
      if (song.title) {
        titles.add(song.title);
      }
    });
    return [
      { value: "", label: "すべて" },
      ...Array.from(titles)
        .sort()
        .map((title) => ({ value: title, label: title })),
    ];
  }, [songs]);

  // フィルター変更時にページをリセット
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  if (error) {
    toast.error("曲データの取得に失敗しました。");
  }

  return (
    <>
      <main className="main flex-1">
        <header className="header">
          <h1 className="mb-2 text-xl md:text-4xl">Statistics</h1>

          {/* フィルターエリア */}
          <section className="statistics-filters">
            <label className="filter-mode">表示モード</label>
            <div className="filter-mode-field flex gap-2">
              <button
                onClick={() => {
                  setViewMode("song");
                  handleFilterChange();
                }}
                className={`flex-1 btn ${viewMode === "song" && "btn-primary"}`}
              >
                曲別
              </button>
              <button
                onClick={() => {
                  setViewMode("artist");
                  handleFilterChange();
                }}
                className={`flex-1 btn ${viewMode === "artist" && "btn-primary"}`}
              >
                アーティスト別
              </button>
            </div>

            {/* アーティストフィルター */}
            <label className="artist">アーティスト</label>
            <Select<OptionType>
              className="select-box artist-field"
              classNamePrefix="Select"
              value={artistOptions.find((opt) => opt.value === selectedArtist)}
              onChange={(option) => {
                setSelectedArtist(option?.value || "");
                handleFilterChange();
              }}
              options={artistOptions}
              placeholder="選択..."
              isClearable
            />

            {/* タイトル検索 */}
            <label className="title">タイトル</label>
            <Select<OptionType>
              className="select-box title-field"
              classNamePrefix="Select"
              value={titleOptions.find((opt) => opt.value === searchTitle)}
              onChange={(option) => {
                setSearchTitle(option?.value || "");
                handleFilterChange();
              }}
              options={titleOptions}
              placeholder="選択..."
              isClearable
            />
          </section>

          {/* 期間指定 */}
          <section>
            <label className="block mb-1">期間</label>
            <div className="grid grid-cols-[1fr_1fr_auto] md:grid-cols-[1fr_1fr_auto_1fr_1fr] gap-2 mb-3">
              <Select<OptionType>
                className="select-box flex-1"
                classNamePrefix="Select"
                value={yearOptions.find((opt) => opt.value === startYear)}
                onChange={(option) => {
                  setStartYear(option?.value || "");
                  handleFilterChange();
                }}
                options={yearOptions}
                placeholder="年"
                isClearable
              />
              <Select<OptionType>
                className="select-box flex-1"
                classNamePrefix="Select"
                value={monthOptions.find((opt) => opt.value === startMonth)}
                onChange={(option) => {
                  setStartMonth(option?.value || "");
                  handleFilterChange();
                }}
                options={monthOptions}
                placeholder="月"
                isClearable
              />
              <div className="leading-8.5">～</div>
              <Select<OptionType>
                className="select-box flex-1"
                classNamePrefix="Select"
                value={yearOptions.find((opt) => opt.value === endYear)}
                onChange={(option) => {
                  setEndYear(option?.value || "");
                  handleFilterChange();
                }}
                options={yearOptions}
                placeholder="年"
                isClearable
              />
              <Select<OptionType>
                className="select-box flex-1"
                classNamePrefix="Select"
                value={monthOptions.find((opt) => opt.value === endMonth)}
                onChange={(option) => {
                  setEndMonth(option?.value || "");
                  handleFilterChange();
                }}
                options={monthOptions}
                placeholder="月"
                isClearable
              />
            </div>
          </section>

          {/* 統計情報 */}
          <section className="p-2 bg-gray-700 rounded-lg text-center">
            <div className="grid grid-cols-3">
              <div>
                <div className="text-2xl font-bold text-blue-400">{filteredSongs.length}</div>
                <div className="text-sm text-gray-400">総曲数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{allStats.length}</div>
                <div className="text-sm text-gray-400">
                  {viewMode === "song" ? "ユニーク曲数" : "アーティスト数"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {allStats.length > 0 ? allStats[0].count : 0}
                </div>
                <div className="text-sm text-gray-400">最多カウント</div>
              </div>
            </div>
          </section>
        </header>

        <div className="content w-full px-2 md:px-8">
          {/* データテーブル */}
          {loading ? (
            <div className="text-center py-8">
              <LoadingIcon />
            </div>
          ) : (
            <section className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700 text-gray-300 text-sm uppercase">
                  <tr>
                    <th className="p-2 text-right w-10 md:w-20">＃</th>
                    {viewMode === "song" ? (
                      <>
                        <th className="p-2 text-left">曲名</th>
                        <th className="p-2 text-left">アーティスト</th>
                      </>
                    ) : (
                      <th className="p-2 text-left">アーティスト</th>
                    )}
                    <th className="p-2 text-right w-18 md:w-32">カウント</th>
                    <th className="p-2 text-left hidden md:table-cell">グラフ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStats.length === 0 ? (
                    <tr>
                      <td
                        colSpan={viewMode === "song" ? 5 : 4}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        データがありません
                      </td>
                    </tr>
                  ) : (
                    paginatedStats.map((stat, index) => {
                      const maxCount = allStats[0].count;
                      const percentage = (stat.count / maxCount) * 100;
                      const actualRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      const isExpanded = viewMode === "artist" && expandedArtists.has(stat.artist);
                      const artistSongs = isExpanded ? getArtistSongs(stat.artist) : [];

                      return (
                        <>
                          <tr
                            key={viewMode === "song" ? `${stat.artist}-${stat.title}` : stat.artist}
                            className="border-t border-gray-700 hover:bg-gray-700/50 transition"
                          >
                            <td className="p-2 text-gray-400 text-right">{actualRank}</td>
                            {viewMode === "song" ? (
                              <>
                                <td className="p-2 font-medium">{stat.title}</td>
                                <td className="p-2 text-gray-400">{stat.artist}</td>
                              </>
                            ) : (
                              <td className="p-2">
                                <button
                                  onClick={() => toggleArtist(stat.artist)}
                                  className="font-medium text-blue-400 hover:text-blue-300 hover:underline text-left w-full flex items-center gap-2"
                                >
                                  <span>{isExpanded ? "▼" : "▶"}</span>
                                  {stat.artist}
                                </button>
                              </td>
                            )}
                            <td className="p-2 text-right font-bold text-blue-400">{stat.count}</td>
                            <td className="p-2 hidden md:table-cell">
                              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </td>
                          </tr>

                          {/* アーティスト別表示時の展開された曲リスト */}
                          {isExpanded &&
                            artistSongs.map((song) => {
                              const songPercentage = (song.count / stat.count) * 100;
                              return (
                                <tr key={`${song.artist}-${song.title}`} className="bg-gray-700/30">
                                  <td className="p-2 text-gray-500 text-sm"></td>
                                  <td className="p-2 text-sm pl-12">{song.title}</td>
                                  <td className="p-2 text-right text-sm text-gray-400">
                                    {song.count}
                                  </td>
                                  <td className="p-2 hidden md:table-cell">
                                    <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                                      <div
                                        className="bg-green-500 h-full rounded-full transition-all"
                                        style={{ width: `${songPercentage}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>

      <footer className="footer bg-gray-800 border-t border-gray-700">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </footer>
    </>
  );
}
