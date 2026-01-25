import { db } from "@/lib/db";
import { applySearchQuery } from "@/lib/filter";
import type { Song } from "@/lib/types";
import useSWR from "swr";

export interface QuerySongsParams {
  searchQuery?: string;
  artist?: string;
  title?: string;
  sortBy: "published_at" | "artist" | "title";
  sortOrder: "asc" | "desc";
}

export interface UseQuerySongsResult {
  songs: Song[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

// 曲クエリ関数
async function querySongs(params: {
  freeSearch?: string;
  selectedArtist?: string;
  selectedTitle?: string;
  sortBy: "published_at" | "artist" | "title";
  sortOrder: "asc" | "desc";
}): Promise<{ songs: Song[]; count: number }> {
  const { freeSearch, selectedArtist, selectedTitle, sortBy, sortOrder } = params;

  let collection = db.songs.toCollection();

  // アーティストとタイトルのフィルタリング
  if (selectedArtist) {
    collection = collection.filter((song) => song.artist === selectedArtist);
  }
  if (selectedTitle) {
    collection = collection.filter((song) => song.title === selectedTitle);
  }

  let results = (await collection.toArray()).filter((s) => s.edited);

  // 検索クエリを適用
  results = applySearchQuery(results, freeSearch, (song) => [
    song.title,
    song.artist || "",
    song.video_title,
  ]);
  const count = results.length;

  // 指定順、歌唱順に並べ替える
  // IndexedDBの複合インデックスでは対応できないためArrayにしてからソートする
  results.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "published_at") {
      comparison = a.video_published_at.localeCompare(b.video_published_at);
      // 同じ動画内での歌唱順でソート
      // 降順指定でも歌唱順は昇順に固定
      if (comparison === 0) {
        return a.start_time - b.start_time;
      }
    } else if (sortBy === "artist") {
      const artistA = a.artist || "";
      const artistB = b.artist || "";
      comparison = artistA.localeCompare(artistB, "ja");
    } else if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title, "ja");
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return { songs: results, count };
}

export function useQuerySongs(params: QuerySongsParams): UseQuerySongsResult {
  const lastUpdatedAt = localStorage.getItem("lastUpdatedAt");
  const { data: syncStatus, isLoading: isSyncLoading } = useSWR("usuwarium-db");
  const { data, isLoading, error } = useSWR(
    ["querySongs", syncStatus?.updatedAt, params],
    async () => {
      if (lastUpdatedAt === null && !syncStatus) {
        return undefined;
      }
      return await querySongs({
        freeSearch: params.searchQuery,
        selectedArtist: params.artist,
        selectedTitle: params.title,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const isInitialLoading = lastUpdatedAt === null && (isSyncLoading || !syncStatus);

  if (error) {
    console.error("useQuerySongs error:", error);
  }

  return {
    songs: data?.songs ?? [],
    totalCount: data?.count ?? 0,
    loading: isInitialLoading || (isLoading && !data),
    error: error ? "データの取得に失敗しました" : null,
  };
}
