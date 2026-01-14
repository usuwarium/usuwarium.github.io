/**
 * YouTube API を使用してチャンネル情報と動画情報を取得するモジュール
 */

import { google, youtube_v3 } from "googleapis";
import type { YouTubeVideo, YouTubeComment } from "../../src/lib/youtube-types.ts";

export class YouTubeAPI {
  private youtube: youtube_v3.Youtube;
  private channelName: string;
  private channelId: string | null = null;

  constructor(apiKey: string, channelName: string) {
    this.youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });
    this.channelName = channelName;
  }

  async initialize(): Promise<void> {
    this.channelId = await this.getChannelId();
  }

  private async getChannelId(): Promise<string> {
    const response = await this.youtube.channels.list({
      part: ["id"],
      forHandle: this.channelName,
    });

    const channelId = response.data.items?.[0]?.id;
    if (!channelId) {
      throw new Error(`チャンネルが見つかりません: ${this.channelName}`);
    }

    return channelId;
  }

  /**
   * チャンネルの全動画を取得
   */
  async getChannelVideos(): Promise<YouTubeVideo[]> {
    return this.getVideos();
  }

  /**
   * チャンネルの直近動画を取得
   */
  async getRecentVideos(limit: number): Promise<YouTubeVideo[]> {
    return this.getVideos(limit);
  }

  /**
   * チャンネルの動画を取得（内部実装）
   */
  private async getVideos(limit?: number): Promise<YouTubeVideo[]> {
    if (!this.channelId) {
      throw new Error("チャンネルIDが初期化されていません");
    }

    // アップロードプレイリストIDを取得
    const channelResponse = await this.youtube.channels.list({
      part: ["contentDetails"],
      id: [this.channelId],
    });

    const uploadsPlaylistId =
      channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("アップロードプレイリストが見つかりません");
    }

    // プレイリストから動画IDを取得
    const videoIds: string[] = [];
    let nextPageToken: string | undefined;
    let remainingLimit = limit;

    do {
      const maxResults = limit ? Math.min(50, remainingLimit!) : 50;
      const playlistResponse = await this.youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId: uploadsPlaylistId,
        maxResults,
        pageToken: nextPageToken,
      });

      const ids =
        playlistResponse.data.items
          ?.map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => !!id) || [];

      videoIds.push(...ids);
      nextPageToken = playlistResponse.data.nextPageToken || undefined;

      if (limit) {
        remainingLimit! -= ids.length;
        if (remainingLimit! <= 0) break;
      }
    } while (nextPageToken);

    // 動画の詳細情報を取得
    const videos: YouTubeVideo[] = [];

    // 50件ずつ取得
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const videoResponse = await this.youtube.videos.list({
        part: ["snippet", "contentDetails", "statistics"],
        id: batch,
      });

      const batchVideos = videoResponse.data.items as YouTubeVideo[];
      videos.push(...batchVideos);
    }

    return videos;
  }

  /**
   * 動画情報を取得（キャッシュあり）
   */
  async getVideo(videoId: string): Promise<YouTubeVideo> {
    const response = await this.youtube.videos.list({
      part: ["snippet", "contentDetails", "statistics"],
      id: [videoId],
    });
    const video = response.data.items?.[0] as YouTubeVideo;
    if (!video) {
      throw new Error(`動画が見つかりません: ${videoId}`);
    }
    return video;
  }
}
