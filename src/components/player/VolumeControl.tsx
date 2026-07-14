"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import { cn } from "@/lib/utils";

export default function VolumeControl({ className }: { className?: string }) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerControls();
  const Icon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        aria-pressed={isMuted}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80"
      >
        <Icon className="h-4 w-4" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={isMuted ? 0 : Math.round(volume * 100)}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
        aria-label="Playback volume"
        className="h-1 w-20 cursor-pointer accent-dandelion outline-none focus-visible:ring-2 focus-visible:ring-dandelion/80"
      />
    </div>
  );
}
