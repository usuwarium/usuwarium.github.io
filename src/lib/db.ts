import Dexie, { type Table } from "dexie";
import { type Metadata, type Song, type SongId, type Video, type VideoId } from "./types";
import type { Playlist, PlaylistItem } from "./playlist";

// Dexieデータベースクラス
export class UsuwariumDB extends Dexie {
  videos!: Table<Video, VideoId>;
  songs!: Table<Song, SongId>;
  metadata!: Table<Metadata>;
  playlists!: Table<Playlist>;
  playlistItems!: Table<PlaylistItem>;

  constructor() {
    super("UsuwariumDB");
    this.version(1).stores({
      videos: "&video_id, published_at, like_count, view_count",
      songs: "&song_id, video_id, video_published_at, artist, title, start_time",
      metadata: "key",
      playlists: "&id, name, created_at, updated_at",
      playlistItems: "[playlist_id+song_id], order",
    });
  }
}

export const db = new UsuwariumDB();
