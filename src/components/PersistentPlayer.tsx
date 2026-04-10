"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import WaveformVisualizer from "./WaveformVisualizer";
import { formatDuration, resampleWaveform } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";

export default function PersistentPlayer() {
  const { isAuthenticated } = useAuth();
  const {
    currentItem,
    isPlaying,
    isVisible,
    volume,
    isShuffle,
    repeatMode,
    togglePlayback,
    previousTrack,
    nextTrack,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
    dismissPlayer,
  } = usePlayerControls();
  const { currentTime, duration, progress, seekToProgress: seekToProgressFromProgress } = usePlayerProgress();

  const waveformRef = useRef<HTMLDivElement>(null);
  const [waveformWidth, setWaveformWidth] = useState(0);

  useEffect(() => {
    const element = waveformRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setWaveformWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setWaveformWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [currentItem?.id]);

  const waveformData = (() => {
    if (!currentItem?.waveform?.length) return [];
    const targetBars = Math.max(56, Math.min(140, Math.floor(waveformWidth / 6)));
    return resampleWaveform(currentItem.waveform, targetBars || currentItem.waveform.length);
  })();

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextProgress = (event.clientX - bounds.left) / bounds.width;
    seekToProgressFromProgress(nextProgress);
  };

  if (!isAuthenticated || !currentItem || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 player-bar"
      >
        <div
          className="h-1 bg-white/[0.06] relative cursor-pointer group"
          onClick={handleSeek}
          aria-label="Seek playback"
        >
          <div
            className="h-full bg-gradient-to-r from-vivid-blue to-mid-purple transition-all"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-vivid-blue opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-3 min-w-0 lg:w-[280px]">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentItem.coverUrl} flex items-center justify-center shrink-0`}>
              <Music className="w-4 h-4 text-white/60" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentItem.title}</p>
              <p className="text-xs text-muted truncate">
                {currentItem.artist}
                {currentItem.sourcePackTitle ? ` - ${currentItem.sourcePackTitle}` : ""}
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`text-muted hover:text-white transition-colors hidden sm:block ${isShuffle ? "text-vivid-blue" : ""}`}
                aria-label="Toggle shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={previousTrack}
                className="text-muted hover:text-white transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePlayback}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
                aria-label={isPlaying ? "Pause playback" : "Resume playback"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-vampire-black" />
                ) : (
                  <Play className="w-4 h-4 text-vampire-black ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={nextTrack}
                className="text-muted hover:text-white transition-colors"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeatMode}
                className={`text-muted hover:text-white transition-colors hidden sm:block ${repeatMode !== "off" ? "text-vivid-blue" : ""}`}
                aria-label="Cycle repeat mode"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted w-full">
              <span className="tabular-nums w-10 text-right">{formatDuration(Math.floor(currentTime))}</span>
              <div
                ref={waveformRef}
                className="flex-1 cursor-pointer"
                onClick={handleSeek}
                aria-label="Waveform timeline"
              >
                <WaveformVisualizer
                  data={waveformData}
                  isPlaying={isPlaying}
                  progress={progress}
                  height={22}
                  gap={2}
                  stretch
                  className="w-full"
                  activeColor="bg-gradient-to-t from-vivid-blue to-mid-purple"
                  inactiveColor="bg-white/10"
                />
              </div>
              <span className="tabular-nums w-10">{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end lg:w-[200px]">
            <div className="hidden sm:flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted" />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(event) => setVolume(Number(event.target.value) / 100)}
                className="w-24 accent-vivid-blue"
                aria-label="Adjust volume"
              />
            </div>
            <button
              type="button"
              onClick={dismissPlayer}
              className="text-muted hover:text-white transition-colors p-1"
              aria-label="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
