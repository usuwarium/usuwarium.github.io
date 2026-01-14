/**
 * 動画を分類するモジュール
 */

import { nanoid } from "nanoid";
import type { Song } from "./types";
import type {
  YouTubeVideo,
  YouTubeComment,
  TimestampInfo,
} from "./youtube-types";

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
      tags.some((tag) => tag.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  /**
   * 視聴可能か判定する
   */
  static isAvailable(rawVideo: YouTubeVideo): boolean {
    const isUpcoming = rawVideo.snippet.liveBroadcastContent === "upcoming";
    const blockedRegions =
      rawVideo.contentDetails.regionRestriction?.blocked || [];
    const isBlocked = blockedRegions.includes("JP");
    return !isUpcoming && !isBlocked;
  }

  /**
   * コメントからタイムスタンプ情報を抽出
   */
  static extractTimestampsFromComments(
    comments: YouTubeComment[],
    video: YouTubeVideo
  ): Omit<TimestampInfo, "song_id">[] {
    const timestamps: Omit<TimestampInfo, "song_id">[] = [];

    for (const comment of comments) {
      const text = comment.snippet.topLevelComment.snippet.textOriginal;
      const lines = text.split("\n");

      for (const line of lines) {
        // MM:SS または H:MM:SS の後に曲名がある形式を検索
        // 例: "0:00 曲名 / アーティスト"
        const pattern =
          /(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+?)(?:\s*[/／]\s*(.+))?$/;
        const match = line.match(pattern);

        if (match) {
          let seconds = 0;
          if (match[3]) {
            // H:MM:SS
            seconds =
              parseInt(match[1]) * 3600 +
              parseInt(match[2]) * 60 +
              parseInt(match[3]);
          } else {
            // MM:SS
            seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
          }

          const songTitle = match[4]?.trim() || "不明";
          const artist = match[5]?.trim() || "不明";

          timestamps.push({
            video_id: video.id,
            video_title: video.snippet.title,
            video_published_at: video.snippet.publishedAt,
            title: songTitle,
            artist: artist,
            start_time: seconds,
          });
        }
      }
    }

    // start_time でソート
    timestamps.sort((a, b) => a.start_time - b.start_time);

    // end_time を次のタイムスタンプの start_time に設定
    for (let i = 0; i < timestamps.length - 1; i++) {
      timestamps[i].end_time = timestamps[i + 1].start_time;
    }

    return timestamps;
  }

  /**
   * ISO 8601 形式の期間文字列を秒に変換
   * 例：PT1H30M45S → 5445
   */
  static parseISO8601Duration(duration: string): number {
    const pattern =
      /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
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
      seconds +
      minutes * 60 +
      hours * 3600 +
      days * 86400 +
      months * 2592000 +
      years * 31536000
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
