/**
 * データベース管理モジュール
 */

import type { Video } from "../../src/lib/types.ts";
import { SheetsClient } from "./sheets-client.ts";

export class Database {
  private videos: Map<string, Video> = new Map();
  private sheetsClient: SheetsClient;
  private dryRun: boolean;

  constructor(sheetsClient: SheetsClient, dryRun = false) {
    this.sheetsClient = sheetsClient;
    this.dryRun = dryRun;
  }

  /**
   * データをロード
   */
  async load(): Promise<void> {
    console.log("Google Sheets からデータを読み込み中...");
    const videos = await this.sheetsClient.getVideos();

    console.log(`✓ 動画: ${videos.length}件`);

    // 動画データをMapに変換
    for (const video of videos) {
      this.videos.set(video.video_id, video);
    }
  }

  /**
   * 動画が既に登録されているかチェック
   */
  hasVideo(videoId: string): boolean {
    return this.videos.has(videoId);
  }

  /**
   * 動画を取得
   */
  getVideo(videoId: string): Video | undefined {
    return this.videos.get(videoId);
  }

  /**
   * 全ての動画を取得
   */
  getAllVideos(): Video[] {
    return Array.from(this.videos.values());
  }

  /**
   * 複数の動画を一括保存
   */
  async batchSaveVideos(videos: Video[]): Promise<void> {
    if (videos.length === 0) return;
    if (this.dryRun) {
      console.log("[DRY-RUN] Google Sheetsへの保存をスキップします");
    } else {
      await this.sheetsClient.batchAddVideos(videos);
    }
    for (const video of videos) {
      this.videos.set(video.video_id, video);
    }
  }
}
