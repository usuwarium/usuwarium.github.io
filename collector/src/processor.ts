/**
 * 動画処理モジュール
 */

import type { Video } from "../../src/lib/types";
import type { YouTubeVideo } from "../../src/lib/youtube-types";
import { youtube_v3 } from "googleapis";
import { type VideoWithDetails, YouTubeAPI } from "./youtube.ts";
import { VideoClassifier } from "../../src/lib/classifier.ts";
import { Database } from "./database.ts";
import { CHANNEL_ID } from "./index.ts";

export class VideoProcessor {
  private youtube: YouTubeAPI;
  private database: Database;

  constructor(youtube: YouTubeAPI, database: Database) {
    this.youtube = youtube;
    this.database = database;
  }

  /**
   * 動画データに差分があるかチェック
   * @returns 変更がある場合は変更内容の配列、ない場合はnull
   */
  private hasVideoChanged(
    existing: Video,
    updated: Video,
  ): { field: string; old: unknown; new: unknown }[] | null {
    const changes: { field: string; old: unknown; new: unknown }[] = [];

    if (existing.title !== updated.title) {
      changes.push({ field: "title", old: existing.title, new: updated.title });
    }
    if (existing.published_at !== updated.published_at) {
      changes.push({
        field: "published_at",
        old: existing.published_at,
        new: updated.published_at,
      });
    }
    if (JSON.stringify(existing.tags) !== JSON.stringify(updated.tags)) {
      changes.push({ field: "tags", old: existing.tags, new: updated.tags });
    }
    if (existing.duration !== updated.duration) {
      changes.push({ field: "duration", old: existing.duration, new: updated.duration });
    }
    if (existing.view_count !== updated.view_count) {
      changes.push({ field: "view_count", old: existing.view_count, new: updated.view_count });
    }
    if (existing.like_count !== updated.like_count) {
      changes.push({ field: "like_count", old: existing.like_count, new: updated.like_count });
    }
    if (existing.available !== updated.available) {
      changes.push({ field: "available", old: existing.available, new: updated.available });
    }

    return changes.length > 0 ? changes : null;
  }

  /**
   * 全更新を実施すべきか判定（最古の動画の processed_at から6時間経過しているか）
   */
  private shouldPerformFullUpdate(videos: Video[], now: Date): boolean {
    if (videos.length === 0) return true;

    // 投稿日時でソートして最古の動画を取得（スプレッドシートの先頭データ）
    const sortedVideos = [...videos].sort((a, b) => {
      return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    });
    const oldestVideo = sortedVideos[0];

    const lastProcessed = new Date(oldestVideo.processed_at);
    const hoursSinceLastUpdate = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastUpdate >= 6;
  }

  /**
   * 動画を処理（スプレッドシートには保存しない）
   */
  async processVideo(rawVideo: VideoWithDetails): Promise<Video | null> {
    const videoId = rawVideo.id;
    const snippet = rawVideo.snippet;
    const title = snippet.title;
    const publishedAt = this.getVideoStartTime(rawVideo);
    const tags = snippet.tags || [];

    // 既存の動画があればsingingとcompletedの値を引き継ぐ
    const existingVideo = this.database.getVideo(videoId);

    // 動画を分類（既存の動画がある場合は既存の値を使用）
    const singing = existingVideo
      ? existingVideo.singing
      : VideoClassifier.isSinging(rawVideo as YouTubeVideo);

    // 動画情報を作成
    const duration = VideoClassifier.parseISO8601Duration(rawVideo.contentDetails?.duration ?? "");
    const viewCount = parseInt(rawVideo.statistics?.viewCount || "0");
    const likeCount = rawVideo.statistics?.likeCount ? parseInt(rawVideo.statistics.likeCount) : 0;

    // ショート動画判定（180秒以内かつライブ配信でない動画のみ）
    const isLiveStream =
      rawVideo.liveStreamingDetails?.actualStartTime ||
      rawVideo.liveStreamingDetails?.scheduledStartTime;
    const shorts =
      title.includes("shorts") && // #shorts だと #varkshorts など別ハッシュがヒットしないため `#` なしで判定
      duration > 0 &&
      duration <= 180 &&
      !isLiveStream;

    // 視聴可能性を判定
    let available = VideoClassifier.isAvailable(rawVideo as YouTubeVideo);

    // スケジュール動画は一覧に載せないように対象外とする
    if (title.includes("SCHEDULE") && title.includes("NOTICE")) {
      available = false;
    }

    const video: Video = {
      video_id: videoId,
      channel_id: snippet.channelId,
      title,
      published_at: publishedAt,
      tags,
      duration,
      view_count: viewCount,
      like_count: likeCount,
      processed_at: new Date().toISOString(),
      singing,
      shorts,
      available,
      completed: existingVideo?.completed || false,
    };
    return video;
  }

  /**
   * チャンネルの全動画を処理
   * @param forceFullUpdate 時間に関係なく全動画を更新するかどうか
   * @returns 更新された動画の件数（新規追加 + 更新 + 利用不可への変更）
   */
  async processChannel(forceFullUpdate: boolean = false): Promise<number> {
    const now = new Date();

    // 最古の動画の processed_at を確認して全更新の要否を判定
    const allExistingVideos = this.database.getAllVideos();
    const shouldFullUpdate =
      forceFullUpdate || this.shouldPerformFullUpdate(allExistingVideos, now);

    let videos: VideoWithDetails[];
    if (shouldFullUpdate) {
      if (forceFullUpdate) {
        console.log("📋 全動画を取得中（強制全更新モード）...");
      } else {
        console.log("📋 全動画を取得中（6時間以上経過）...");
      }
      videos = await this.youtube.getChannelVideos();
    } else {
      console.log("📋 直近50件の動画を取得中...");
      videos = await this.youtube.getRecentVideos(50);
    }

    console.log(`✓ ${videos.length}件の動画を取得`);

    let newCount = 0;
    let updatedCount = 0;
    let unavailableCount = 0;
    const videosToSave: Video[] = [];
    const fetchedVideoIds = new Set<string>();

    for (const [index, rawVideo] of videos.entries()) {
      const videoId = rawVideo.id;
      const title = rawVideo.snippet.title;
      fetchedVideoIds.add(videoId);

      console.log(`\n[${index + 1}/${videos.length}] ${title} (${videoId})`);

      const existingVideo = this.database.getVideo(videoId);
      if (existingVideo) {
        const video = await this.processVideo(rawVideo);
        if (!video) {
          console.error("  ✗ 動画の処理に失敗");
          continue;
        }
        const changes = this.hasVideoChanged(existingVideo, video);
        if (changes) {
          console.log("  → 動画情報を更新予定");
          for (const change of changes) {
            console.log(
              `     - ${change.field}: ${JSON.stringify(change.old)} → ${JSON.stringify(change.new)}`,
            );
          }
          videosToSave.push(video);
          updatedCount++;
        } else {
          console.log("  ✓ 変更なし");
        }
      } else {
        console.log("  → 新規動画を処理");
        const video = await this.processVideo(rawVideo);
        if (!video) {
          console.error("  ✗ 動画の処理に失敗");
          continue;
        }
        videosToSave.push(video);
        newCount++;
      }
    }

    // スプレッドシートにはあるが、今回取得できなかった動画を検出（全更新時のみ）
    if (shouldFullUpdate) {
      console.log("\n削除・非公開の動画をチェック中...");
      for (const existingVideo of allExistingVideos) {
        // メインチャンネルの動画のみチェック（他チャンネルは別途実施）
        if (existingVideo.channel_id !== CHANNEL_ID) {
          continue;
        }
        if (!fetchedVideoIds.has(existingVideo.video_id)) {
          // 取得できなかった動画
          if (existingVideo.available) {
            console.log(
              `  → ${existingVideo.title} (${existingVideo.video_id}) を available=false に更新`,
            );
            const updatedVideo = { ...existingVideo, available: false };
            videosToSave.push(updatedVideo);
            unavailableCount++;
          }
        }
      }
    }

    // 一括でスプレッドシートに保存
    if (videosToSave.length > 0) {
      // 投稿日時の昇順にソート（古い動画が先）
      videosToSave.sort((a, b) => {
        const dateA = new Date(a.published_at).getTime();
        const dateB = new Date(b.published_at).getTime();
        return dateA - dateB;
      });

      console.log(`\nスプレッドシートに${videosToSave.length}件の動画を保存中...`);
      await this.database.batchSaveVideos(videosToSave);
      console.log("✓ 動画の保存完了");
    }

    console.log(
      `\n処理完了: 新規${newCount}件, 更新${updatedCount}件, 利用不可${unavailableCount}件`,
    );

    return newCount + updatedCount + unavailableCount;
  }

  /**
   * 他のチャンネルの動画を更新
   * @returns 更新された動画の件数（更新 + 利用不可への変更）
   */
  async updateOtherChannelVideos(): Promise<number> {
    console.log("\n他のチャンネルの動画を更新中...");

    const allVideos = this.database.getAllVideos();
    // 稀羽すうチャンネル以外の動画を抽出
    const otherChannelVideos = allVideos.filter((video) => video.channel_id !== CHANNEL_ID);

    if (otherChannelVideos.length === 0) {
      console.log("✓ 他のチャンネルの動画はありません");
      return 0;
    }

    console.log(`✓ ${otherChannelVideos.length}件の他チャンネル動画を検出`);

    // videoIdのリストを作成
    const videoIds = otherChannelVideos.map((v) => v.video_id);

    // YouTube APIで一括取得
    console.log("YouTube APIから動画情報を取得中...");
    const rawVideos = await this.youtube.getVideosByIds(videoIds);
    console.log(`✓ ${rawVideos.length}件の動画情報を取得`);

    // 取得できた動画のマップを作成
    const rawVideoMap = new Map<string, VideoWithDetails>();
    for (const rawVideo of rawVideos) {
      rawVideoMap.set(rawVideo.id, rawVideo);
    }

    // 更新が必要な動画を処理
    const videosToUpdate: Video[] = [];
    let updatedCount = 0;
    let unavailableCount = 0;

    for (const existingVideo of otherChannelVideos) {
      const rawVideo = rawVideoMap.get(existingVideo.video_id);

      if (!rawVideo) {
        // 取得できなかった動画 → 削除・非公開
        if (existingVideo.available) {
          console.log(
            `  → ${existingVideo.title} (${existingVideo.video_id}) を available=false に更新`,
          );
          const updatedVideo = { ...existingVideo, available: false };
          videosToUpdate.push(updatedVideo);
          unavailableCount++;
        }
      } else {
        // 動画情報を処理
        const video = await this.processVideo(rawVideo);
        if (!video) {
          console.error(`  ✗ ${existingVideo.title} (${existingVideo.video_id}) の処理に失敗`);
          continue;
        }
        const changes = this.hasVideoChanged(existingVideo, video);
        if (changes) {
          console.log(`  → ${video.title} (${video.video_id}) を更新`);
          for (const change of changes) {
            console.log(
              `     - ${change.field}: ${JSON.stringify(change.old)} → ${JSON.stringify(change.new)}`,
            );
          }
          videosToUpdate.push(video);
          updatedCount++;
        }
      }
    }

    // スプレッドシートに保存
    if (videosToUpdate.length > 0) {
      console.log(`\nスプレッドシートに${videosToUpdate.length}件の動画を保存中...`);
      await this.database.batchSaveVideos(videosToUpdate);
      console.log("✓ 動画の保存完了");
    }

    console.log(
      `\n他チャンネル動画の処理完了: 更新${updatedCount}件, 利用不可${unavailableCount}件`,
    );

    return updatedCount + unavailableCount;
  }

  /**
   * 動画の公開日を取得
   */
  getVideoStartTime(video: youtube_v3.Schema$Video): string {
    const snippet = video.snippet;
    const live = video.liveStreamingDetails;

    // ライブ配信の場合は、完了済みであっても一貫して「配信予定時刻」を優先して使用する。
    // 配信予定時刻が取得できない場合のみ「実際の開始時間」を使用し、
    // それら両方が存在しない通常動画などでは「publishedAt」を利用する。
    return live?.scheduledStartTime || live?.actualStartTime || snippet?.publishedAt || "";
  }
}
