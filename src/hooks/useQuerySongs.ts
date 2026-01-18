import { db } from "@/lib/db";
import { applySearchQuery } from "@/lib/filter";
import type { Song } from "@/lib/types";
import { useContext, useEffect, useState } from "react";
import { FetchDataContext } from "./useFetchData";

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
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loading: fetchDataLoading } = useContext(FetchDataContext);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      if (fetchDataLoading) return;

      setLoading(true);
      setError(null);

      try {
        const { songs: fetchedSongs, count } = await querySongs({
          freeSearch: params.searchQuery,
          selectedArtist: params.artist,
          selectedTitle: params.title,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        });
        setSongs(fetchedSongs);
        setTotalCount(count);
      } catch (error) {
        console.error(error);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    params.searchQuery,
    params.artist,
    params.title,
    params.sortBy,
    params.sortOrder,
    fetchDataLoading,
  ]);

  return { songs, totalCount, loading: loading || fetchDataLoading, error };
}
