import type { Video, Song } from "./types";
import toast from "react-hot-toast";
import { GASClient } from "./gas-client";
import { VideoClassifier } from "./classifier";

export const YOUTUBE_API_KEY = "youtube_api_key";

export interface SingingPart {
  id: string;
  startTime: number;
  endTime?: number;
  title: string;
  artist: string;
}

export async function getVideosAndSongs(): Promise<[Video[], Song[]]> {
  const response = await GASClient.get().getData();
  return [response.videos, response.songs];
}

/**
 * 動画を追加する
 * @param video
 */
async function addVideo(video: Video): Promise<void> {
  await GASClient.get().addVideo(video);
}

/**
 * 曲データを保存する
 * @param video
 * @param singingParts
 * @param completed 動画を完了状態にするか（オプション）
 */
export async function saveSongs(
  video: Video,
  singingParts: SingingPart[],
  completed?: boolean
): Promise<void> {
  const songs: Song[] = singingParts.map((part) => ({
    song_id: part.id,
    video_id: video.video_id,
    video_title: video.title,
    video_published_at: video.published_at,
    title: part.title,
    artist: part.artist,
    start_time: part.startTime,
    end_time: part.endTime,
    edited: true,
  }));
  await GASClient.get().addSongs(video.video_id, songs, completed);
}

/**
 * 動画を完了状態にする
 * @param videoId 動画ID
 */
export async function completeVideo(videoId: string): Promise<void> {
  await GASClient.get().completeVideo(videoId);
}

/**
 * 動画のsingingをfalseにして歌唱パートを削除
 * @param videoId 動画ID
 */
export async function setSingingFalse(videoId: string): Promise<{ deletedCount: number }> {
  return await GASClient.get().setSingingFalse(videoId);
}

// YouTube URLから動画IDを抽出
function extractVideoId(urlOrVideoId: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = urlOrVideoId.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// YouTube Data APIで動画情報を取得
async function fetchVideoInfoFromYouTubeApi(videoId: string): Promise<any> {
  const apiKey = encodeURIComponent(localStorage.getItem(YOUTUBE_API_KEY) ?? "");
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`
  );
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    toast.error("動画が見つかりませんでした");
    throw new Error("Video not found");
  }
  return data;
}

/**
 * 動画をインポートし、データベースに追加する
 * @param urlOrVideoId 動画URLもしくは動画ID
 */
export async function importVideo(urlOrVideoId: string) {
  const videoId = extractVideoId(urlOrVideoId);
  if (!videoId) {
    toast.error("有効な動画URLまたはIDを入力してください");
    throw new Error("Invalid video ID");
  }

  try {
    const data = await fetchVideoInfoFromYouTubeApi(videoId);
    const video: Video = {
      video_id: data.items[0].id,
      channel_id: data.items[0].snippet.channelId,
      title: data.items[0].snippet.title,
      published_at: data.items[0].snippet.publishedAt,
      tags: data.items[0].snippet.tags || [],
      view_count: parseInt(data.items[0].statistics.viewCount || "0", 10),
      like_count: parseInt(data.items[0].statistics.likeCount || "0", 10),
      duration: VideoClassifier.parseISO8601Duration(data.items[0].contentDetails.duration),
      processed_at: new Date().toISOString(),
      singing: VideoClassifier.isSinging(data.items[0]),
      available: VideoClassifier.isAvailable(data.items[0]),
      completed: false,
    };

    await addVideo(video);
  } catch (error) {
    console.error(error);
    toast.error("動画情報の取得に失敗しました");
    throw error;
  }
}
