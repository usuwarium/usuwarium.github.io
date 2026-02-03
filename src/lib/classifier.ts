/**
 * 動画を分類するモジュール
 */

import { nanoid } from "nanoid";
import type { Song } from "./types";
import type { YouTubeVideo, YouTubeComment, TimestampInfo } from "./youtube-types";

export class VideoClassifier {
  /**
   * 歌枠もしくは歌動画か判定する
   */
  static isSinging(video: YouTubeVideo): boolean {
    const title = video.snippet.title || "";

    // 歌枠の判定
    if (title.includes("歌枠")) {
      return true;
    }

    // 歌動画の判定
    const tags = video.snippet.tags || [];
    const singingKeywords = ["オリジナル曲", "カバー動画", "歌ってみた"];

    return singingKeywords.some((keyword) =>
      tags.some((tag) => tag.toLowerCase().includes(keyword.toLowerCase())),
    );
  }

  /**
   * 視聴可能か判定する
   */
  static isAvailable(rawVideo: YouTubeVideo): boolean {
    const blockedRegions = rawVideo.contentDetails.regionRestriction?.blocked || [];
    const isBlocked = blockedRegions.includes("JP");
    return !isBlocked;
  }

  /**
   * ISO 8601 形式の期間文字列を秒に変換
   * 例：PT1H30M45S → 5445
   */
  static parseISO8601Duration(duration: string): number {
    const pattern = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(pattern);

    if (!matches) {
      return 0;
    }

    const years = parseInt(matches[1] || "0");
    const months = parseInt(matches[2] || "0");
    const days = parseInt(matches[3] || "0");
    const hours = parseInt(matches[4] || "0");
    const minutes = parseInt(matches[5] || "0");
    const seconds = parseInt(matches[6] || "0");

    return (
      seconds + minutes * 60 + hours * 3600 + days * 86400 + months * 2592000 + years * 31536000
    );
  }

  /**
   * 曲IDを生成する
   *
   * @param songs 重複チェックする曲リスト
   */
  static generateSongId(songs: Song[], maxAttempts: number = 10): string {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const id = nanoid(12);
      if (!songs.find((s) => s.song_id === id)) {
        return id;
      }
    }
    throw new Error("曲IDの生成に失敗しました");
  }
}
