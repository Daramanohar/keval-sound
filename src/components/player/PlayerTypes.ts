import type { Pack, Sample, Track } from "@/lib/mock-data";

export type RepeatMode = "off" | "all" | "one";
export type PlayableType = "track" | "sample";
export type PlaybackQuality = "mp3" | "wav";

export interface PlayableItem {
  id: string;
  type: PlayableType;
  title: string;
  artist: string;
  audioUrl?: string;
  duration: number;
  waveform: number[];
  waveformUrl?: string;
  coverUrl: string;
  genre?: string;
  tags?: string[];
  price?: number;
  currency?: string;
  licenseType?: string;
  lyricsUrl?: string;
  source?: string;
  sourcePackId?: string;
  sourcePackTitle?: string;
  playbackQuality: PlaybackQuality;
  isPreviewOnly: boolean;
}

export interface RecentPreviewItem extends PlayableItem {
  playedAt: string;
}

export interface TrackPlaybackOptions {
  queue?: Track[];
  pack?: Pack;
}

export interface PlayerControlsContextType {
  currentItem: PlayableItem | null;
  queue: PlayableItem[];
  currentIndex: number;
  activePackId: string | null;
  isPlaying: boolean;
  isPlaybackRequested: boolean;
  isVisible: boolean;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  isFullPlayerOpen: boolean;
  isQueueOpen: boolean;
  volume: number;
  recentlyPlayed: RecentPreviewItem[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  playTrack: (track: Track, options?: TrackPlaybackOptions) => void;
  toggleTrack: (track: Track, options?: TrackPlaybackOptions) => void;
  playQueue: (tracks: Track[], startIndex?: number, pack?: Pack) => void;
  playPack: (pack: Pack, startTrackId?: string) => void;
  playSample: (sample: Sample) => void;
  toggleSample: (sample: Sample) => void;
  togglePlayback: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  playQueueItem: (index: number) => void;
  setVolume: (nextVolume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  addToQueue: (track: Track, pack?: Pack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  openQueueDrawer: () => void;
  closeQueueDrawer: () => void;
  retryPlayback: () => void;
  dismissPlayer: () => void;
  isItemActive: (id: string, type?: PlayableType) => boolean;
  isItemPlaying: (id: string, type?: PlayableType) => boolean;
}

export interface PlayerProgressContextType {
  currentTime: number;
  duration: number;
  progress: number;
  seekToProgress: (nextProgress: number) => void;
  seekToTime: (nextTime: number) => void;
  seekBy: (seconds: number) => void;
}
