"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { createWavReviewStreamUrl, isWavReviewerEmail } from "./reviewer-access";
import { clamp } from "./utils";
import type { Pack, Sample, Track } from "./mock-data";
import type {
  PlayableItem,
  PlayerControlsContextType,
  PlayerProgressContextType,
  PlayableType,
  RecentPreviewItem,
  RepeatMode,
  TrackPlaybackOptions,
} from "@/components/player/PlayerTypes";

export type {
  PlayableItem,
  PlayableType,
  RecentPreviewItem,
  RepeatMode,
} from "@/components/player/PlayerTypes";

const DEFAULT_VOLUME = 0.75;
const RECENT_LIMIT = 16;

const PlayerControlsContext = createContext<PlayerControlsContextType | null>(null);
const PlayerProgressContext = createContext<PlayerProgressContextType | null>(null);

const emptyControlsContext: PlayerControlsContextType = {
  currentItem: null,
  queue: [],
  currentIndex: 0,
  activePackId: null,
  isPlaying: false,
  isPlaybackRequested: false,
  isVisible: false,
  isMuted: false,
  isShuffle: false,
  repeatMode: "all",
  isLoading: false,
  isBuffering: false,
  error: null,
  isFullPlayerOpen: false,
  isQueueOpen: false,
  volume: DEFAULT_VOLUME,
  recentlyPlayed: [],
  canGoNext: false,
  canGoPrevious: false,
  playTrack: () => {},
  toggleTrack: () => {},
  playQueue: () => {},
  playPack: () => {},
  playSample: () => {},
  toggleSample: () => {},
  togglePlayback: () => {},
  previousTrack: () => {},
  nextTrack: () => {},
  playQueueItem: () => {},
  setVolume: () => {},
  toggleMute: () => {},
  toggleShuffle: () => {},
  cycleRepeatMode: () => {},
  addToQueue: () => {},
  removeFromQueue: () => {},
  clearQueue: () => {},
  reorderQueue: () => {},
  openFullPlayer: () => {},
  closeFullPlayer: () => {},
  openQueueDrawer: () => {},
  closeQueueDrawer: () => {},
  retryPlayback: () => {},
  dismissPlayer: () => {},
  isItemActive: () => false,
  isItemPlaying: () => false,
};

const emptyProgressContext: PlayerProgressContextType = {
  currentTime: 0,
  duration: 0,
  progress: 0,
  seekToProgress: () => {},
  seekToTime: () => {},
  seekBy: () => {},
};

function toPlayableTrack(track: Track, pack?: Pack, useWavReview = false): PlayableItem {
  return {
    id: track.id,
    type: "track",
    title: track.title,
    artist: track.artist,
    audioUrl: useWavReview ? createWavReviewStreamUrl(track.id) : track.audioUrl,
    duration: track.duration,
    waveform: track.waveform,
    coverUrl: pack?.coverUrl ?? track.coverUrl,
    genre: track.genre,
    tags: track.tags,
    price: track.price,
    currency: "INR",
    licenseType: "Standard music license",
    lyricsUrl: track.lyricsUrl,
    source: pack?.title ?? track.genre,
    sourcePackId: pack?.id,
    sourcePackTitle: pack?.title,
    playbackQuality: useWavReview ? "wav" : "mp3",
    isPreviewOnly: !useWavReview,
  };
}

function toPlayableSample(sample: Sample): PlayableItem {
  return {
    id: sample.id,
    type: "sample",
    title: sample.name,
    artist: sample.instrument,
    audioUrl: sample.audioUrl,
    duration: sample.duration,
    waveform: sample.waveform,
    coverUrl: "from-grey-azure to-vivid-blue",
    genre: sample.genre,
    tags: sample.tags,
    price: sample.price,
    currency: "INR",
    source: "Samples & Loops",
    playbackQuality: "mp3",
    isPreviewOnly: true,
  };
}

function readRecentPreviews(storageKey: string): RecentPreviewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as RecentPreviewItem[]) : [];
  } catch {
    return [];
  }
}

function writeRecentPreviews(storageKey: string, items: RecentPreviewItem[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Playback must continue when private browsing blocks localStorage.
  }
}

function getAudioErrorMessage(audio: HTMLAudioElement) {
  switch (audio.error?.code) {
    case 1:
      return "Playback was interrupted. Try again.";
    case 2:
      return "The connection to this track was lost. Try again.";
    case 3:
      return "This audio file could not be decoded.";
    case 4:
      return "This preview is not available in your browser.";
    default:
      return "This track could not be played. Try again.";
  }
}

function PlayerSessionProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const { user } = useAuth();
  const useWavReview = isWavReviewerEmail(user?.email);
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRequested, setPlaybackRequested] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentPreviewItem[]>(() =>
    readRecentPreviews(storageKey)
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastProgressPaintRef = useRef(0);
  const shuffleHistoryRef = useRef<number[]>([]);
  const currentTimeRef = useRef(0);
  const playbackRequestedRef = useRef(false);

  const currentItem = queue[currentIndex] ?? null;
  const duration = mediaDuration > 0 ? mediaDuration : currentItem?.duration ?? 0;
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const activePackId = currentItem?.sourcePackId ?? null;
  const canNavigateQueue = queue.length > 1;

  const setPlaybackIntent = useCallback((nextValue: boolean) => {
    playbackRequestedRef.current = nextValue;
    setPlaybackRequested(nextValue);
  }, []);

  useEffect(() => {
    writeRecentPreviews(storageKey, recentlyPlayed);
  }, [recentlyPlayed, storageKey]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const rememberRecentTrack = useCallback((item: PlayableItem | null) => {
    if (!item || item.type !== "track") return;
    const snapshot: RecentPreviewItem = { ...item, playedAt: new Date().toISOString() };
    setRecentlyPlayed((current) => [
      snapshot,
      ...current.filter((entry) => entry.id !== snapshot.id || entry.type !== snapshot.type),
    ].slice(0, RECENT_LIMIT));
  }, []);

  const commitQueue = useCallback((items: PlayableItem[], startIndex = 0) => {
    if (!items.length) return;
    const safeIndex = clamp(startIndex, 0, items.length - 1);
    const nextItem = items[safeIndex];
    setQueue(items);
    setCurrentIndex(safeIndex);
    setCurrentTime(0);
    setMediaDuration(nextItem.duration);
    setError(nextItem.audioUrl ? null : "This track does not have a playable preview yet.");
    setIsLoading(Boolean(nextItem.audioUrl));
    setIsBuffering(false);
    setIsPlaying(false);
    setPlaybackIntent(Boolean(nextItem.audioUrl));
    setDismissed(false);
    shuffleHistoryRef.current = [safeIndex];
    rememberRecentTrack(nextItem);
  }, [rememberRecentTrack, setPlaybackIntent]);

  const playQueue = useCallback((tracks: Track[], startIndex = 0, pack?: Pack) => {
    commitQueue(tracks.map((track) => toPlayableTrack(track, pack, useWavReview)), startIndex);
  }, [commitQueue, useWavReview]);

  const playTrack = useCallback((track: Track, options?: TrackPlaybackOptions) => {
    const sourceQueue = options?.queue?.length ? options.queue : [track];
    const startIndex = Math.max(sourceQueue.findIndex((entry) => entry.id === track.id), 0);
    playQueue(sourceQueue, startIndex, options?.pack);
  }, [playQueue]);

  const toggleTrack = useCallback((track: Track, options?: TrackPlaybackOptions) => {
    if (currentItem?.id === track.id && currentItem.type === "track") {
      setPlaybackIntent(!playbackRequestedRef.current);
      setDismissed(false);
      return;
    }
    playTrack(track, options);
  }, [currentItem, playTrack, setPlaybackIntent]);

  const playPack = useCallback((pack: Pack, startTrackId?: string) => {
    const startIndex = startTrackId
      ? Math.max(pack.tracks.findIndex((track) => track.id === startTrackId), 0)
      : 0;
    playQueue(pack.tracks, startIndex, pack);
  }, [playQueue]);

  const playSample = useCallback((sample: Sample) => {
    commitQueue([toPlayableSample(sample)], 0);
  }, [commitQueue]);

  const toggleSample = useCallback((sample: Sample) => {
    if (currentItem?.id === sample.id && currentItem.type === "sample") {
      setPlaybackIntent(!playbackRequestedRef.current);
      setDismissed(false);
      return;
    }
    playSample(sample);
  }, [currentItem, playSample, setPlaybackIntent]);

  const moveToQueueIndex = useCallback((nextIndex: number) => {
    const nextItem = queue[nextIndex];
    if (!nextItem) return;
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setMediaDuration(nextItem.duration);
    setError(nextItem.audioUrl ? null : "This track does not have a playable preview yet.");
    setIsLoading(Boolean(nextItem.audioUrl));
    setIsBuffering(false);
    setIsPlaying(false);
    setPlaybackIntent(Boolean(nextItem.audioUrl));
    setDismissed(false);
    rememberRecentTrack(nextItem);
  }, [queue, rememberRecentTrack, setPlaybackIntent]);

  const getShuffledIndex = useCallback(() => {
    if (queue.length < 2) return currentIndex;
    const recentlyUsed = new Set(shuffleHistoryRef.current.slice(-Math.min(6, queue.length - 1)));
    const candidates = queue.map((_, index) => index).filter(
      (index) => index !== currentIndex && !recentlyUsed.has(index)
    );
    const pool = candidates.length
      ? candidates
      : queue.map((_, index) => index).filter((index) => index !== currentIndex);
    const selected = pool[Math.floor(Math.random() * pool.length)];
    shuffleHistoryRef.current = [...shuffleHistoryRef.current, selected].slice(-12);
    return selected;
  }, [currentIndex, queue]);

  const nextTrack = useCallback(() => {
    if (!queue.length) return;
    if (isShuffle && queue.length > 1) {
      moveToQueueIndex(getShuffledIndex());
      return;
    }
    if (currentIndex < queue.length - 1) {
      moveToQueueIndex(currentIndex + 1);
      return;
    }
    if (repeatMode === "all") {
      moveToQueueIndex(0);
      return;
    }
    setCurrentTime(duration);
    setIsPlaying(false);
    setPlaybackIntent(false);
  }, [currentIndex, duration, getShuffledIndex, isShuffle, moveToQueueIndex, queue.length, repeatMode, setPlaybackIntent]);

  const seekToTime = useCallback((nextTime: number) => {
    if (!duration) return;
    const safeTime = clamp(nextTime, 0, duration);
    if (audioRef.current && currentItem?.audioUrl) audioRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  }, [currentItem?.audioUrl, duration]);

  const previousTrack = useCallback(() => {
    if (!queue.length) return;
    if (currentTimeRef.current > 3) {
      seekToTime(0);
      return;
    }
    if (isShuffle && shuffleHistoryRef.current.length > 1) {
      shuffleHistoryRef.current.pop();
      moveToQueueIndex(shuffleHistoryRef.current.at(-1) ?? 0);
      return;
    }
    moveToQueueIndex(currentIndex > 0 ? currentIndex - 1 : queue.length - 1);
  }, [currentIndex, isShuffle, moveToQueueIndex, queue.length, seekToTime]);

  const seekToProgress = useCallback((nextProgress: number) => {
    seekToTime(duration * clamp(nextProgress, 0, 1));
  }, [duration, seekToTime]);

  const seekBy = useCallback((seconds: number) => {
    seekToTime(currentTimeRef.current + seconds);
  }, [seekToTime]);

  const handleTrackEnd = useCallback(() => {
    const audio = audioRef.current;
    if (repeatMode === "one" && audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      setPlaybackIntent(true);
      void audio.play().catch(() => {
        setIsPlaying(false);
        setPlaybackIntent(false);
      });
      return;
    }
    nextTrack();
  }, [nextTrack, repeatMode, setPlaybackIntent]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentItem?.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    audio.src = currentItem.audioUrl;
    audio.load();
  }, [currentItem?.audioUrl, currentItem?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [isMuted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem?.audioUrl) return;
    if (!playbackRequested) {
      audio.pause();
      return;
    }
    let cancelled = false;
    let retryTimer: number | undefined;
    let retryCount = 0;

    const startPlayback = async () => {
      if (cancelled || !playbackRequestedRef.current) return;
      try {
        await audio.play();
      } catch (playError: unknown) {
        if (cancelled || !playbackRequestedRef.current) return;
        if (playError instanceof DOMException && playError.name === "AbortError" && retryCount < 3) {
          retryCount += 1;
          retryTimer = window.setTimeout(() => void startPlayback(), retryCount * 80);
          return;
        }
        setIsPlaying(false);
        setIsLoading(false);
        setIsBuffering(false);
        setPlaybackIntent(false);
        const blocked = playError instanceof DOMException && playError.name === "NotAllowedError";
        setError(blocked
          ? "Your browser blocked autoplay. Press play to continue."
          : "Playback could not start. Try again.");
      }
    };

    void startPlayback();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [currentItem?.audioUrl, currentItem?.id, playbackRequested, setPlaybackIntent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncDuration = () => {
      const resolved = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : currentItem?.duration ?? 0;
      setMediaDuration(resolved);
    };
    const syncTime = () => setCurrentTime(audio.currentTime);
    const handleLoadStart = () => setIsLoading(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleCanPlay = () => {
      setIsLoading(false);
      setIsBuffering(false);
      setError(null);
    };
    const handleWaiting = () => {
      if (playbackRequestedRef.current) setIsBuffering(true);
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setIsBuffering(false);
      setError(null);
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setIsBuffering(false);
      setPlaybackIntent(false);
      setError(getAudioErrorMessage(audio));
    };
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("stalled", handleWaiting);
    audio.addEventListener("ended", handleTrackEnd);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("stalled", handleWaiting);
      audio.removeEventListener("ended", handleTrackEnd);
      audio.removeEventListener("error", handleError);
    };
  }, [currentItem?.duration, handleTrackEnd, setPlaybackIntent]);

  useEffect(() => {
    if (!isPlaying || !currentItem?.audioUrl) return;
    const paint = (timestamp: number) => {
      const audio = audioRef.current;
      if (audio && timestamp - lastProgressPaintRef.current >= 32) {
        setCurrentTime(audio.currentTime);
        lastProgressPaintRef.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(paint);
    };
    animationFrameRef.current = requestAnimationFrame(paint);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [currentItem?.audioUrl, isPlaying]);

  useEffect(() => {
    const nextItem = queue[currentIndex + 1];
    if (!nextItem?.coverUrl?.startsWith("/") && !nextItem?.coverUrl?.startsWith("http")) return;
    const image = new Image();
    image.decoding = "async";
    image.src = nextItem.coverUrl;
  }, [currentIndex, queue]);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = clamp(nextVolume, 0, 1);
    setVolumeState(safeVolume);
    if (safeVolume > 0) setIsMuted(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!currentItem?.audioUrl) {
      setError("This track does not have a playable preview yet.");
      return;
    }
    setDismissed(false);
    setError(null);
    setPlaybackIntent(!playbackRequestedRef.current);
  }, [currentItem?.audioUrl, setPlaybackIntent]);

  const retryPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem?.audioUrl) return;
    setError(null);
    setIsLoading(true);
    audio.load();
    setPlaybackIntent(true);
  }, [currentItem?.audioUrl, setPlaybackIntent]);

  const addToQueue = useCallback((track: Track, pack?: Pack) => {
    setQueue((current) => [...current, toPlayableTrack(track, pack, useWavReview)]);
  }, [useWavReview]);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((current) => {
      if (current.length <= 1) return current;
      const removeIndex = current.findIndex((item) => item.id === trackId);
      if (removeIndex < 0) return current;
      const nextQueue = current.filter((_, index) => index !== removeIndex);
      if (removeIndex < currentIndex) {
        setCurrentIndex((index) => Math.max(0, index - 1));
      }
      if (removeIndex === currentIndex) {
        const nextIndex = Math.min(removeIndex, nextQueue.length - 1);
        const nextItem = nextQueue[nextIndex];
        setCurrentIndex(nextIndex);
        setCurrentTime(0);
        setMediaDuration(nextItem.duration);
        setError(nextItem.audioUrl ? null : "This track does not have a playable preview yet.");
        setIsLoading(Boolean(nextItem.audioUrl));
        setIsBuffering(false);
        rememberRecentTrack(nextItem);
      }
      return nextQueue;
    });
  }, [currentIndex, rememberRecentTrack]);

  const clearQueue = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    setQueue([]);
    setCurrentIndex(0);
    setCurrentTime(0);
    setMediaDuration(0);
    setIsPlaying(false);
    setPlaybackIntent(false);
    setIsLoading(false);
    setIsBuffering(false);
    setError(null);
    setIsFullPlayerOpen(false);
    setIsQueueOpen(false);
    setDismissed(true);
  }, [setPlaybackIntent]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((current) => {
      if (fromIndex === toIndex || !current[fromIndex] || !current[toIndex]) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setCurrentIndex((index) => {
        if (index === fromIndex) return toIndex;
        if (fromIndex < index && toIndex >= index) return index - 1;
        if (fromIndex > index && toIndex <= index) return index + 1;
        return index;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, a, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setVolume(volume + 0.05);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setVolume(volume - 0.05);
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        setIsMuted((muted) => !muted);
      } else if (event.key === "Escape") {
        setIsQueueOpen(false);
        setIsFullPlayerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seekBy, setVolume, togglePlayback, volume]);

  const controlsValue = useMemo<PlayerControlsContextType>(() => ({
    currentItem,
    queue,
    currentIndex,
    activePackId,
    isPlaying,
    isPlaybackRequested: playbackRequested,
    isVisible: Boolean(currentItem) && !dismissed,
    isMuted,
    isShuffle,
    repeatMode,
    isLoading,
    isBuffering,
    error,
    isFullPlayerOpen,
    isQueueOpen,
    volume,
    recentlyPlayed,
    canGoNext: canNavigateQueue,
    canGoPrevious: Boolean(currentItem),
    playTrack,
    toggleTrack,
    playQueue,
    playPack,
    playSample,
    toggleSample,
    togglePlayback,
    previousTrack,
    nextTrack,
    playQueueItem: moveToQueueIndex,
    setVolume,
    toggleMute: () => setIsMuted((muted) => !muted),
    toggleShuffle: () => setIsShuffle((shuffle) => !shuffle),
    cycleRepeatMode: () => setRepeatMode((mode) => mode === "off" ? "all" : mode === "all" ? "one" : "off"),
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    openFullPlayer: () => setIsFullPlayerOpen(true),
    closeFullPlayer: () => setIsFullPlayerOpen(false),
    openQueueDrawer: () => setIsQueueOpen(true),
    closeQueueDrawer: () => setIsQueueOpen(false),
    retryPlayback,
    dismissPlayer: () => {
      setDismissed(true);
      setIsPlaying(false);
      setPlaybackIntent(false);
      setIsFullPlayerOpen(false);
      setIsQueueOpen(false);
    },
    isItemActive: (id, type = "track") => currentItem?.id === id && currentItem.type === type,
    isItemPlaying: (id, type = "track") => currentItem?.id === id && currentItem.type === type && isPlaying,
  }), [
    activePackId, addToQueue, canNavigateQueue, clearQueue, currentIndex, currentItem,
    dismissed, error, isBuffering, isFullPlayerOpen, isLoading, isMuted,
    isPlaying, isQueueOpen, isShuffle, moveToQueueIndex, nextTrack, playbackRequested, playPack, playQueue, playSample,
    playTrack, previousTrack, queue, recentlyPlayed, removeFromQueue, reorderQueue,
    repeatMode, retryPlayback, setPlaybackIntent, setVolume, togglePlayback, toggleSample, toggleTrack, volume,
  ]);

  const progressValue = useMemo<PlayerProgressContextType>(() => ({
    currentTime,
    duration,
    progress,
    seekToProgress,
    seekToTime,
    seekBy,
  }), [currentTime, duration, progress, seekBy, seekToProgress, seekToTime]);

  return (
    <PlayerControlsContext.Provider value={controlsValue}>
      <PlayerProgressContext.Provider value={progressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerControlsContext.Provider>
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  if (!isReady || !isAuthenticated || !user) {
    return (
      <PlayerControlsContext.Provider value={emptyControlsContext}>
        <PlayerProgressContext.Provider value={emptyProgressContext}>
          {children}
        </PlayerProgressContext.Provider>
      </PlayerControlsContext.Provider>
    );
  }
  const storageKey = `keval-player:${user.email.toLowerCase()}`;
  return <PlayerSessionProvider key={storageKey} storageKey={storageKey}>{children}</PlayerSessionProvider>;
}

export function usePlayerControls() {
  const context = useContext(PlayerControlsContext);
  if (!context) throw new Error("usePlayerControls must be used within a PlayerProvider");
  return context;
}

export function usePlayerProgress() {
  const context = useContext(PlayerProgressContext);
  if (!context) throw new Error("usePlayerProgress must be used within a PlayerProvider");
  return context;
}

export function usePlayer() {
  const controls = usePlayerControls();
  const progressState = usePlayerProgress();
  return {
    ...controls,
    ...progressState,
    getItemProgress: (id: string, type: PlayableType = "track") =>
      controls.currentItem?.id === id && controls.currentItem.type === type
        ? progressState.progress
        : 0,
  };
}
