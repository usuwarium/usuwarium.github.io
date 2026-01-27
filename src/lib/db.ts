import Dexie, { type Table } from "dexie";
import {
  type Playlist,
  type PlaylistItem,
  type Song,
  type SongId,
  type Video,
  type VideoId,
} from "./types";

// Dexieデータベースクラス
export class UsuwariumDB extends Dexie {
  videos!: Table<Video, VideoId>;
  songs!: Table<Song, SongId>;
  playlists!: Table<Playlist>;
  playlistItems!: Table<PlaylistItem>;

  constructor() {
    super("UsuwariumDB");
    this.version(1).stores({
      videos: "&video_id, published_at, like_count, view_count",
      songs: "&song_id, video_id, video_published_at, artist, title, start_time",
      playlists: "&id, name, created_at, updated_at",
      playlistItems: "[playlist_id+song_id], order, volumeOffset, startTimeOffset, endTimeOffset",
    });
  }
}

export const db = new UsuwariumDB();
