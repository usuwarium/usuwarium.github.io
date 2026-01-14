/**
 * 共通型定義 (Web & Recognizer)
 */

export type VideoId = string;
export type SongId = string;

/**
 * 動画情報
 */
export interface Video {
  video_id: string;
  channel_id: string;
  title: string;
  published_at: string;
  tags: string[];
  duration: number; // 秒単位
  view_count: number;
  like_count: number;
  processed_at: string; // データが登録された日時
  singing: boolean; // 歌枠もしくは歌動画フラグ
  available: boolean; // 視聴可能フラグ
  completed: boolean; // 処理完了フラグ
}

/**
 * 歌唱情報
 */
export interface Song {
  song_id: string;
  video_id: string;
  video_title: string;
  video_published_at: string;
  title: string;
  artist: string;
  start_time: number; // 秒単位
  end_time: number; // 秒単位
  tags: string[];
  edited?: boolean;
}

export interface PlayingVideo {
  videoId: string;
  startTime: number;
  endTime: number;
  songId: SongId;
  title: string;
  artist: string;
}
