"use client";

import { LoaderCircle, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerControls } from "@/lib/player-context";

export default function PlayerControls({ compact = false, className }: { compact?: boolean; className?: string }) {
  const {
    isPlaying,
    isPlaybackRequested,
    isLoading,
    isBuffering,
    isShuffle,
    repeatMode,
    canGoNext,
    canGoPrevious,
    togglePlayback,
    previousTrack,
    nextTrack,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayerControls();
  const busy = isLoading || isBuffering;

  return (
    <div className={cn("flex items-center justify-center", compact ? "gap-2" : "gap-4", className)}>
      {!compact ? (
        <ControlButton label={isShuffle ? "Disable shuffle" : "Enable shuffle"} active={isShuffle} onClick={toggleShuffle}>
          <Shuffle className="h-4 w-4" />
        </ControlButton>
      ) : null}
      <ControlButton label="Previous track" disabled={!canGoPrevious} onClick={previousTrack}>
        <SkipBack className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </ControlButton>
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaybackRequested ? "Pause playback" : "Play track"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-light-grey text-vampire-black outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-dandelion focus-visible:ring-offset-2 focus-visible:ring-offset-vampire-black",
          compact ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        {busy ? (
          <LoaderCircle className={cn("animate-spin", compact ? "h-4 w-4" : "h-5 w-5")} />
        ) : isPlaying || isPlaybackRequested ? (
          <Pause className={cn("fill-current", compact ? "h-4 w-4" : "h-5 w-5")} />
        ) : (
          <Play className={cn("ml-0.5 fill-current", compact ? "h-4 w-4" : "h-5 w-5")} />
        )}
      </button>
      <ControlButton label="Next track" disabled={!canGoNext} onClick={nextTrack}>
        <SkipForward className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </ControlButton>
      {!compact ? (
        <ControlButton
          label={`Repeat mode: ${repeatMode}`}
          active={repeatMode !== "off"}
          onClick={cycleRepeatMode}
        >
          {repeatMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
        </ControlButton>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dandelion/80",
        active ? "bg-dandelion/12 text-dandelion" : "text-muted hover:bg-white/[0.06] hover:text-white",
        disabled && "cursor-not-allowed opacity-30"
      )}
    >
      {children}
    </button>
  );
}
