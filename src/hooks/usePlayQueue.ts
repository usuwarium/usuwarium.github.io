import useLocalStorage from "@/hooks/useLocalStorage";
import { useEffect, useMemo, useState } from "react";
import type { Song, SongId } from "../lib/types";

export interface UsePlayQueueResult {
  playingSong: Song | undefined;
  isRepeated: boolean;
  isShuffled: boolean;
  play: (songId: SongId) => void;
  playAll: () => Song;
  playShuffled: () => Song;
  playBackward: () => Song | undefined;
  playForward: () => Song | undefined;
  // updateQueue: (newSongs: Song[]) => void;
  clearQueue: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

/**
 * 配列をシャッフルする
 */
const shuffle = (array: SongId[], currentSongId: SongId): SongId[] => {
  const shuffled = array.filter((id) => id !== currentSongId).sort(() => Math.random() - 0.5);
  return [currentSongId, ...shuffled];
};

/*
 * プレイリスト再生キューを管理するカスタムフック
 */
export function usePlayQueue(playlist: Song[]): UsePlayQueueResult {
  const [queue, setQueue] = useState<SongId[]>([]);
  const [playingSongId, setPlayingSongId] = useState<SongId | undefined>(undefined);
  const [isRepeated, setIsRepeated] = useLocalStorage<boolean>("repeat", false);
  const [isShuffled, setIsShuffled] = useLocalStorage<boolean>("shuffle", false);

  const playingSong = useMemo(() => {
    return playlist.find((s) => s.song_id === playingSongId);
  }, [playlist, playingSongId]);

  // 再生中にプレイリストが変更されたら再生キューを更新する
  if (playingSongId && queue.length !== playlist.length) {
    if (isShuffled) {
      setQueue(
        shuffle(
          playlist.map((s) => s.song_id),
          playingSongId
        )
      );
    } else {
      setQueue(playlist.map((s) => s.song_id));
    }
  }

  /**
   * プレイリストキューを作成して指定した曲を再生する
   */
  const play = (songId: SongId) => {
    const songIds = playlist.map((s) => s.song_id);
    if (isShuffled) {
      setQueue(shuffle(songIds, songId));
    } else {
      setQueue(songIds);
    }
    setPlayingSongId(songId);
  };

  /**
   * プレイリストの最初から再生する
   */
  const playAll = () => {
    const songIds = playlist.map((s) => s.song_id);
    setQueue(songIds);
    setPlayingSongId(songIds[0]);
    setIsShuffled(false);
    return playlist[0];
  };

  /**
   * プレイリストをシャッフルして再生する
   */
  const playShuffled = () => {
    const startSong = playlist[Math.floor(Math.random() * playlist.length)];
    const shuffledSongs: SongId[] = shuffle(
      playlist.map((s) => s.song_id),
      startSong.song_id
    );
    setQueue(shuffledSongs);
    setPlayingSongId(startSong.song_id);
    setIsShuffled(true);
    return startSong;
  };

  /**
   * 前の曲を再生する
   */
  const playBackward = () => {
    if (playingSongId === undefined) return;
    const index = queue.indexOf(playingSongId);
    if (index > 0) {
      setPlayingSongId(queue[index - 1]);
      return playlist.find((s) => s.song_id === queue[index - 1]);
    } else if (isRepeated) {
      setPlayingSongId(queue[queue.length - 1]);
      return playlist.find((s) => s.song_id === queue[queue.length - 1]);
    } else {
      stop();
      return undefined;
    }
  };

  /**
   * 次の曲を再生する
   */
  const playForward = () => {
    if (playingSongId === undefined) return;
    const index = queue.indexOf(playingSongId);
    if (index < queue.length - 1) {
      setPlayingSongId(queue[index + 1]);
      return playlist.find((s) => s.song_id === queue[index + 1]);
    } else if (isRepeated) {
      setPlayingSongId(queue[0]);
      return playlist.find((s) => s.song_id === queue[0]);
    } else {
      stop();
      return undefined;
    }
  };

  /**
   * 再生キューをクリアして再生を停止する
   */
  const clearQueue = () => {
    setQueue([]);
    setPlayingSongId(undefined);
  };

  /**
   * リピート状態を切り替える
   */
  const toggleRepeat = (): void => {
    setIsRepeated(!isRepeated);
  };

  /**
   * シャッフル状態を切り替える
   * 現在再生中の曲を先頭にして、残りの曲をシャッフル/元の順序に戻す
   */
  const toggleShuffle = (): void => {
    const newIsShuffled = !isShuffled;
    setIsShuffled(newIsShuffled);
    if (playingSongId === undefined) return;
    if (newIsShuffled) {
      // 現在の曲以外をシャッフル
      setQueue(
        shuffle(
          playlist.map((s) => s.song_id),
          playingSongId
        )
      );
    } else {
      // 元の順序に戻す
      setQueue(playlist.map((s) => s.song_id));
    }
  };

  return {
    playingSong,
    isRepeated,
    isShuffled,
    play,
    playAll,
    playShuffled,
    playBackward,
    playForward,
    clearQueue,
    toggleRepeat,
    toggleShuffle,
  };
}
