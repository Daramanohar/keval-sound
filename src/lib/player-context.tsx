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
import { clamp } from "./utils";
import type { Pack, Sample, Track } from "./mock-data";

type RepeatMode = "off" | "all" | "one";
type PlayableType = "track" | "sample";

export interface PlayableItem {
  id: string;
  type: PlayableType;
  title: string;
  artist: string;
  audioUrl?: string;
  duration: number;
  waveform: number[];
  coverUrl: string;
  sourcePackId?: string;
  sourcePackTitle?: string;
}

export interface RecentPreviewItem extends PlayableItem {
  playedAt: string;
}

interface PlayerControlsContextType {
  currentItem: PlayableItem | null;
  activePackId: string | null;
  isPlaying: boolean;
  isVisible: boolean;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  recentlyPlayed: RecentPreviewItem[];
  playTrack: (track: Track, options?: { queue?: Track[]; pack?: Pack }) => void;
  toggleTrack: (track: Track, options?: { queue?: Track[]; pack?: Pack }) => void;
  playPack: (pack: Pack, startTrackId?: string) => void;
  playSample: (sample: Sample) => void;
  toggleSample: (sample: Sample) => void;
  togglePlayback: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  setVolume: (nextVolume: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  dismissPlayer: () => void;
  isItemActive: (id: string, type?: PlayableType) => boolean;
  isItemPlaying: (id: string, type?: PlayableType) => boolean;
}

interface PlayerProgressContextType {
  currentTime: number;
  duration: number;
  progress: number;
  seekToProgress: (nextProgress: number) => void;
  seekToTime: (nextTime: number) => void;
}

const emptyControlsContext: PlayerControlsContextType = {
  currentItem: null,
  activePackId: null,
  isPlaying: false,
  isVisible: false,
  volume: 0.75,
  isShuffle: false,
  repeatMode: "all",
  recentlyPlayed: [],
  playTrack: () => {},
  toggleTrack: () => {},
  playPack: () => {},
  playSample: () => {},
  toggleSample: () => {},
  togglePlayback: () => {},
  previousTrack: () => {},
  nextTrack: () => {},
  setVolume: () => {},
  toggleShuffle: () => {},
  cycleRepeatMode: () => {},
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
};

const PlayerControlsContext = createContext<PlayerControlsContextType | null>(null);
const PlayerProgressContext = createContext<PlayerProgressContextType | null>(null);

function toPlayableTrack(track: Track, pack?: Pack): PlayableItem {
  return {
    id: track.id,
    type: "track",
    title: track.title,
    artist: track.artist,
    audioUrl: track.audioUrl,
    duration: track.duration,
    waveform: track.waveform,
    coverUrl: track.coverUrl,
    sourcePackId: pack?.id,
    sourcePackTitle: pack?.title,
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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function PlayerSessionProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.75);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [mediaDuration, setMediaDuration] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentPreviewItem[]>(() =>
    readRecentPreviews(storageKey)
  );
  const endHandledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentItem = queue[currentIndex] ?? null;
  const duration = mediaDuration > 0 ? mediaDuration : currentItem?.duration ?? 0;
  const progress = duration ? clamp(currentTime / duration, 0, 1) : 0;
  const activePackId = currentItem?.sourcePackId ?? null;

  useEffect(() => {
    writeRecentPreviews(storageKey, recentlyPlayed);
  }, [recentlyPlayed, storageKey]);

  const rememberRecentTrack = useCallback((item: PlayableItem | null) => {
    if (!item || item.type !== "track") return;

    const snapshot: RecentPreviewItem = {
      ...item,
      playedAt: new Date().toISOString(),
    };

    setRecentlyPlayed((current) => {
      const next = current.filter(
        (entry) => !(entry.id === snapshot.id && entry.type === snapshot.type)
      );

      return [snapshot, ...next].slice(0, 16);
    });
  }, []);

  const moveToQueueIndex = useCallback(
    (nextIndex: number) => {
      const nextItem = queue[nextIndex];
      if (!nextItem) return;

      rememberRecentTrack(nextItem);
      setCurrentIndex(nextIndex);
      setMediaDuration(nextItem.duration);
      setCurrentTime(0);
      setIsPlaying(true);
      setDismissed(false);
      endHandledRef.current = false;
    },
    [queue, rememberRecentTrack]
  );

  const openQueue = useCallback(
    (items: PlayableItem[], startIndex: number) => {
      const safeIndex = clamp(startIndex, 0, Math.max(items.length - 1, 0));
      const nextItem = items[safeIndex] ?? null;

      rememberRecentTrack(nextItem);
      setQueue(items);
      setCurrentIndex(safeIndex);
      setMediaDuration(nextItem?.duration ?? 0);
      setCurrentTime(0);
      setIsPlaying(true);
      setDismissed(false);
      endHandledRef.current = false;
    },
    [rememberRecentTrack]
  );

  const playTrack = useCallback(
    (track: Track, options?: { queue?: Track[]; pack?: Pack }) => {
      const sourceQueue = options?.queue ?? [track];
      const playables = sourceQueue.map((entry) => toPlayableTrack(entry, options?.pack));
      const startIndex = sourceQueue.findIndex((entry) => entry.id === track.id);

      openQueue(playables, startIndex >= 0 ? startIndex : 0);
    },
    [openQueue]
  );

  const toggleTrack = useCallback(
    (track: Track, options?: { queue?: Track[]; pack?: Pack }) => {
      if (currentItem?.id === track.id && currentItem.type === "track") {
        setIsPlaying((prev) => !prev);
        setDismissed(false);
        return;
      }

      playTrack(track, options);
    },
    [currentItem, playTrack]
  );

  const playPack = useCallback(
    (pack: Pack, startTrackId?: string) => {
      const startIndex = startTrackId
        ? Math.max(pack.tracks.findIndex((track) => track.id === startTrackId), 0)
        : 0;

      openQueue(pack.tracks.map((track) => toPlayableTrack(track, pack)), startIndex);
    },
    [openQueue]
  );

  const playSample = useCallback(
    (sample: Sample) => {
      openQueue([toPlayableSample(sample)], 0);
    },
    [openQueue]
  );

  const toggleSample = useCallback(
    (sample: Sample) => {
      if (currentItem?.id === sample.id && currentItem.type === "sample") {
        setIsPlaying((prev) => !prev);
        setDismissed(false);
        return;
      }

      playSample(sample);
    },
    [currentItem, playSample]
  );

  const nextTrack = useCallback(() => {
    if (!queue.length) return;

    const atQueueEnd = currentIndex >= queue.length - 1;

    if (repeatMode === "off" && atQueueEnd && !isShuffle) {
      setCurrentTime(duration);
      setIsPlaying(false);
      endHandledRef.current = false;
      return;
    }

    if (isShuffle && queue.length > 1) {
      let nextIndex = currentIndex;

      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }

      moveToQueueIndex(nextIndex);
      return;
    }

    moveToQueueIndex(currentIndex < queue.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, duration, isShuffle, moveToQueueIndex, queue.length, repeatMode]);

  const previousTrack = useCallback(() => {
    if (!queue.length) return;

    if (currentTime > 3) {
      setCurrentTime(0);
      return;
    }

    if (isShuffle && queue.length > 1) {
      let nextIndex = currentIndex;

      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }

      moveToQueueIndex(nextIndex);
      return;
    }

    moveToQueueIndex(currentIndex > 0 ? currentIndex - 1 : queue.length - 1);
  }, [currentIndex, currentTime, isShuffle, moveToQueueIndex, queue.length]);

  const seekToTime = useCallback(
    (nextTime: number) => {
      if (!duration) return;
      const safeTime = clamp(nextTime, 0, duration);

      if (currentItem?.audioUrl && audioRef.current) {
        audioRef.current.currentTime = safeTime;
      }

      setCurrentTime(safeTime);
      endHandledRef.current = false;
    },
    [currentItem?.audioUrl, duration]
  );

  const seekToProgress = useCallback(
    (nextProgress: number) => {
      if (!duration) return;
      seekToTime(duration * clamp(nextProgress, 0, 1));
    },
    [duration, seekToTime]
  );

  const handleTrackEnd = useCallback(() => {
    if (!currentItem) return;

    if (repeatMode === "one") {
      setCurrentTime(0);
      setIsPlaying(true);
      endHandledRef.current = false;
      return;
    }

    if (currentIndex < queue.length - 1 || isShuffle || repeatMode === "all") {
      nextTrack();
      return;
    }

    setCurrentTime(currentItem.duration);
    setIsPlaying(false);
    endHandledRef.current = false;
  }, [currentIndex, currentItem, isShuffle, nextTrack, queue.length, repeatMode]);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      audioRef.current = audio;
    }

    return () => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentItem?.audioUrl) {
      if (audio.src) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      return;
    }

    audio.src = currentItem.audioUrl;
    audio.load();
  }, [currentItem?.id, currentItem?.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentItem?.audioUrl) return;

    if (isPlaying) {
      const playPromise = audio.play();

      if (playPromise) {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }

      return;
    }

    audio.pause();
  }, [currentItem?.id, currentItem?.audioUrl, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      const resolvedDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : currentItem?.duration ?? 0;

      setMediaDuration(resolvedDuration);
    };

    const syncTime = () => {
      setCurrentTime(audio.currentTime);
      endHandledRef.current = false;
    };

    const handleAudioEnded = () => {
      endHandledRef.current = false;
      handleTrackEnd();
    };

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("ended", handleAudioEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("ended", handleAudioEnded);
    };
  }, [currentItem?.duration, handleTrackEnd]);

  useEffect(() => {
    if (!isPlaying || !currentItem || currentItem.audioUrl) return;

    const timer = window.setInterval(() => {
      setCurrentTime((previousTime) => {
        const nextTime = previousTime + 0.25;

        if (nextTime >= currentItem.duration) {
          if (!endHandledRef.current) {
            endHandledRef.current = true;
            window.setTimeout(handleTrackEnd, 0);
          }

          return currentItem.duration;
        }

        return nextTime;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [currentItem, handleTrackEnd, isPlaying]);

  useEffect(() => {
    endHandledRef.current = false;
  }, [currentItem?.id]);

  const controlsValue = useMemo<PlayerControlsContextType>(
    () => ({
      currentItem,
      activePackId,
      isPlaying,
      isVisible: Boolean(currentItem) && !dismissed,
      volume,
      isShuffle,
      repeatMode,
      recentlyPlayed,
      playTrack,
      toggleTrack,
      playPack,
      playSample,
      toggleSample,
      togglePlayback: () => {
        if (!currentItem) return;
        setIsPlaying((prev) => !prev);
        setDismissed(false);
      },
      previousTrack,
      nextTrack,
      setVolume: (nextVolume) => setVolumeState(clamp(nextVolume, 0, 1)),
      toggleShuffle: () => setIsShuffle((prev) => !prev),
      cycleRepeatMode: () =>
        setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off")),
      dismissPlayer: () => {
        setDismissed(true);
        setIsPlaying(false);
      },
      isItemActive: (id, type = "track") => currentItem?.id === id && currentItem.type === type,
      isItemPlaying: (id, type = "track") =>
        currentItem?.id === id && currentItem.type === type && isPlaying,
    }),
    [
      activePackId,
      currentItem,
      dismissed,
      isPlaying,
      isShuffle,
      nextTrack,
      playPack,
      playSample,
      playTrack,
      previousTrack,
      recentlyPlayed,
      repeatMode,
      toggleSample,
      toggleTrack,
      volume,
    ]
  );

  const progressValue = useMemo<PlayerProgressContextType>(
    () => ({
      currentTime,
      duration,
      progress,
      seekToProgress,
      seekToTime,
    }),
    [currentTime, duration, progress, seekToProgress, seekToTime]
  );

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

  return (
    <PlayerSessionProvider key={storageKey} storageKey={storageKey}>
      {children}
    </PlayerSessionProvider>
  );
}

export function usePlayerControls() {
  const context = useContext(PlayerControlsContext);

  if (!context) {
    throw new Error("usePlayerControls must be used within a PlayerProvider");
  }

  return context;
}

export function usePlayerProgress() {
  const context = useContext(PlayerProgressContext);

  if (!context) {
    throw new Error("usePlayerProgress must be used within a PlayerProvider");
  }

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
