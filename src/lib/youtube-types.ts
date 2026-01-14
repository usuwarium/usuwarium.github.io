/**
 * YouTube API の動画データ
 */
export interface YouTubeVideo {
  id: string;
  snippet: {
    channelId: string;
    title: string;
    publishedAt: string;
    tags?: string[];
    liveBroadcastContent: string;
  };
  contentDetails: {
    duration: string; // ISO 8601形式
    regionRestriction?: {
      blocked?: string[];
    };
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
  };
}

/**
 * YouTube API のコメントデータ
 */
export interface YouTubeComment {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: {
        textDisplay: string;
        textOriginal: string;
        authorDisplayName: string;
        publishedAt: string;
      };
    };
  };
}

/**
 * タイムスタンプ情報
 */
export interface TimestampInfo {
  video_id: string;
  video_title: string;
  video_published_at: string;
  title: string;
  artist: string;
  start_time: number;
  end_time?: number;
}
