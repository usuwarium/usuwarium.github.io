import type { Video } from "./types";

// クイックフィルタの項目定義
export interface QuickFilterItem {
  key: string;
  label: string;
  hideOnMobile: boolean;
  predicate: (video: Video) => boolean;
}

export const QUICK_FILTER_ITEMS: QuickFilterItem[] = [
  {
    key: "singingStream",
    label: "歌枠",
    hideOnMobile: false,
    predicate: (video) => video.title.includes("歌枠"),
  },
  {
    key: "mv",
    label: "MV",
    hideOnMobile: false,
    predicate: (video) =>
      (video.tags.includes("MV") ||
        video.tags.includes("オリジナル曲") ||
        video.tags.includes("カバー動画")) &&
      !video.tags.includes("踊ってみた"),
  },
  {
    key: "originalSong",
    label: "オリジナル曲",
    hideOnMobile: true,
    predicate: (video) => video.tags.includes("オリジナル曲"),
  },
  {
    key: "coverSong",
    label: "カバー動画",
    hideOnMobile: true,
    predicate: (video) => video.tags.includes("カバー動画"),
  },
  {
    key: "shorts",
    label: "#shorts",
    hideOnMobile: false,
    predicate: (video) =>
      video.tags.includes("#shorts") ||
      video.title.includes("#shorts") ||
      video.tags.includes("縦型配信"),
  },
  {
    key: "dance",
    label: "#踊ってみた",
    hideOnMobile: true,
    predicate: (video) => video.tags.includes("踊ってみた"),
  },
  {
    key: "gameplay",
    label: "ゲーム実況",
    hideOnMobile: false,
    predicate: (video) => video.tags.includes("ゲーム実況"),
  },
];

// クイックフィルタの判定関数
export function matchesQuickFilter(video: Video, filterKey: string): boolean {
  const filterItem = QUICK_FILTER_ITEMS.find((item) => item.key === filterKey);
  return filterItem ? filterItem.predicate(video) : false;
}

/**
 * 検索クエリを解析してフィルタリング条件を適用する
 * @param items フィルタ対象のアイテム配列
 * @param searchQuery 検索クエリ（スペース区切り、`-`で否定条件）
 * @param getSearchableText アイテムから検索対象のテキストを取得する関数
 * @returns フィルタリングされたアイテム配列
 */
export function applySearchQuery<T>(
  items: T[],
  searchQuery: string | undefined,
  getSearchableText: (item: T) => string[],
): T[] {
  if (!searchQuery || !searchQuery.trim()) {
    return items;
  }

  // スペース区切りでトークンに分割
  const tokens = searchQuery.trim().split(/\s+/);

  // 肯定条件と否定条件に分ける
  const includeTokens = tokens
    .filter((token) => !token.startsWith("-"))
    .map((token) => token.toLowerCase());

  const excludeTokens = tokens
    .filter((token) => token.startsWith("-") && token.length > 1)
    .map((token) => token.slice(1).toLowerCase());

  return items.filter((item) => {
    const searchableTexts = getSearchableText(item).map((text) => text.toLowerCase());

    // 肯定条件: すべてのトークンが検索対象テキストのいずれかに含まれる必要がある
    const matchesInclude = includeTokens.every((token) =>
      searchableTexts.some((text) => text.includes(token)),
    );

    // 否定条件: いずれかの除外トークンが検索対象テキストに含まれていたら除外
    const matchesExclude = excludeTokens.some((token) =>
      searchableTexts.some((text) => text.includes(token)),
    );

    return matchesInclude && !matchesExclude;
  });
}
