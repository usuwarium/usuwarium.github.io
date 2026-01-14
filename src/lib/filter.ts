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
