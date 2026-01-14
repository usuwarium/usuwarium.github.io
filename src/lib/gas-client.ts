/**
 * Google Apps Script クライアント
 */

import { config } from "../../config.ts";
import type { Song, Video } from "./types.ts";

export const GAS_API_KEY = "gas_api_key";

interface GASResponse {
  success: boolean;
  message?: string;
  statusCode: number;
  timestamp: string;
  data?: {
    videos?: Video[];
    songs?: Song[];
    videoCount?: number;
    songCount?: number;
  };
}

export class GASClient {
  private url: string;
  private apiKey: string;

  private static instance: GASClient;

  constructor(url: string, apiKey: string) {
    this.url = url;
    this.apiKey = apiKey;
  }

  static get(): GASClient {
    if (!this.instance) {
      this.instance = new GASClient(config.gas.url, localStorage.getItem(GAS_API_KEY) || "");
    }
    return this.instance;
  }

  private async request<T, U>(action: string, data: Record<string, T> = {}): Promise<U> {
    // Preflight が CORS エラーになるため Content-Type は指定しない
    const response = await fetch(this.url, {
      method: "POST",
      body: JSON.stringify({
        action,
        apiKey: this.apiKey,
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as GASResponse;

    if (!result.success) {
      throw new Error(`GAS Error: ${result.message || "Unknown error"}`);
    }

    return result.data as U;
  }

  /**
   * 全てのデータを取得
   */
  async getData(): Promise<{ videos: Video[]; songs: Song[] }> {
    return await this.request<void, { videos: Video[]; songs: Song[] }>("getData");
  }

  /**
   * 動画を追加または更新
   */
  async addVideo(video: Video): Promise<void> {
    await this.request("addVideo", { video });
  }

  /**
   * 曲を追加
   */
  async addSongs(videoId: string, songs: Song[], completed?: boolean): Promise<void> {
    await this.request("addSongs", {
      video_id: videoId,
      songs,
      completed,
    });
  }

  /**
   * 動画を完了状態にする
   */
  async completeVideo(videoId: string): Promise<void> {
    await this.request("completeVideo", { video_id: videoId });
  }

  /**
   * 動画のsingingをfalseにして歌唱パートを削除
   */
  async setSingingFalse(videoId: string): Promise<{ deletedCount: number }> {
    const result = await this.request<{ video_id: string }, { deleted_songs?: number }>(
      "setSingingFalse",
      { video_id: videoId }
    );

    return {
      deletedCount: result.deleted_songs || 0,
    };
  }
}
