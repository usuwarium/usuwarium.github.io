import useLocalStorage from "@/hooks/useLocalStorage";
import { useMemo, useState } from "react";
import type { Song } from "../lib/types";

export interface UsePlayQueueResult {
  playingSong: Song | undefined;
  isRepeated: boolean;
  isShuffled: boolean;
  resetQueue: (song: Song, shuffle?: boolean) => void;
  queueAll: () => Song | undefined;
  queueShuffled: () => Song | undefined;
  prevSong: () => Song | undefined;
  nextSong: () => Song | undefined;
  clearQueue: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

/*
 * プレイリスト再生キューを管理するカスタムフック
 */
export function usePlayQueue(playlist: Song[]): UsePlayQueueResult {
  const [queue, setQueue] = useState<Song[]>([]);
  const [playingSong, setPlayingSong] = useState<Song | undefined>(undefined);
  const [isRepeated, setIsRepeated] = useLocalStorage<boolean>("repeat", false);
  const [isShuffled, setIsShuffled] = useLocalStorage<boolean>("shuffle", false);

  /**
   * 指定した曲を先頭にしたプレイリストキューを作成して再生する
   */
  const resetQueue = (song: Song, shuffle = isShuffled) => {
    const rest = playlist.filter((s) => s.song_id !== song.song_id);
    if (shuffle) {
      const shuffled = rest.sort(() => Math.random() - 0.5);
      setQueue([song, ...shuffled]);
    } else {
      setQueue([song, ...rest]);
    }
    setIsShuffled(shuffle);
    setPlayingSong(song);
  };

  /**
   * プレイリストの最初から再生する
   */
  const queueAll = () => {
    if (playlist.length === 0) return undefined;
    resetQueue(playlist[0], false);
    return playlist[0];
  };

  /**
   * プレイリストをシャッフルして再生する
   */
  const queueShuffled = () => {
    if (playlist.length === 0) return undefined;
    const startSong = playlist[Math.floor(Math.random() * playlist.length)];
    resetQueue(startSong, true);
    return startSong;
  };

  /**
   * 前の曲を再生する
   */
  const prevSong = () => {
    if (playingSong === undefined) return undefined;
    const index = queue.findIndex((s) => s.song_id === playingSong.song_id);
    if (index > 0) {
      const song = queue[index - 1];
      setPlayingSong(song);
      return song;
    } else if (index === 0 || index === -1) {
      if (isRepeated && queue.length > 0) {
        const song = queue[queue.length - 1];
        setPlayingSong(song);
        return song;
      }
    }
    // 前の曲がない場合は何もしない
    return undefined;
  };

  /**
   * 次の曲を再生する
   */
  const nextSong = () => {
    if (playingSong === undefined) return undefined;
    const index = queue.findIndex((s) => s.song_id === playingSong.song_id);
    if (index < queue.length - 1) {
      const song = queue[index + 1];
      setPlayingSong(song);
      return song;
    } else if (index === queue.length - 1 || index === -1) {
      if (isRepeated && queue.length > 0) {
        const song = queue[0];
        setPlayingSong(song);
        return song;
      }
    }
    // 次の曲がない場合は再生を停止させるため現在の曲をクリアする
    // prevSong は先頭に戻る挙動とし、あえて非対称にしている
    setPlayingSong(undefined);
    return undefined;
  };

  /**
   * 再生キューをクリアして再生を停止する
   */
  const clearQueue = () => {
    setQueue([]);
    setPlayingSong(undefined);
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
    if (playingSong === undefined) return;
    resetQueue(playingSong, newIsShuffled);
  };

  // 再生中にプレイリストが変更されたら再生キューを更新する
  const shouldUpdateQueue = useMemo(() => {
    if (playingSong === undefined) return false;
    // プレイリストやキューに再生中の曲が含まれる場合と含まれない場合どちらもあり得るので一応追加して比較する
    const combinedQueueSet = new Set([...queue.map((s) => s.song_id), playingSong.song_id]);
    const combinedPlaylistSet = new Set([...playlist.map((s) => s.song_id), playingSong.song_id]);
    if (combinedQueueSet.size !== combinedPlaylistSet.size) return true;
    for (const id of combinedQueueSet) {
      if (!combinedPlaylistSet.has(id)) {
        return true;
      }
    }
    return false;
  }, [playingSong, queue, playlist]);

  if (playingSong && shouldUpdateQueue) {
    resetQueue(playingSong);
  }

  return {
    playingSong,
    isRepeated,
    isShuffled,
    resetQueue,
    queueAll,
    queueShuffled,
    prevSong,
    nextSong,
    clearQueue,
    toggleRepeat,
    toggleShuffle,
  };
}
