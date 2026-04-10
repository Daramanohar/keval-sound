"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Heart } from "lucide-react";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import type { Track } from "@/lib/mock-data";

interface TopSongsListProps {
  tracks: Track[];
  title?: string;
}

export default function TopSongsList({
  tracks,
  title = "Top Songs",
}: TopSongsListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h4 className="text-sm font-bold text-white">{title}</h4>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {tracks.slice(0, 8).map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group cursor-pointer"
          >
            {/* Rank */}
            <span
              className={cn(
                "w-5 text-center text-xs font-bold tabular-nums",
                i < 3 ? "text-vivid-blue" : "text-muted/40"
              )}
            >
              {i + 1}
            </span>

            {/* Play / Cover */}
            <button
              onClick={() =>
                setPlayingId(playingId === track.id ? null : track.id)
              }
              className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0"
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  track.coverUrl
                )}
              />
              <div
                className={cn(
                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                  playingId === track.id
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                {playingId === track.id ? (
                  <Pause className="w-3 h-3 text-white" />
                ) : (
                  <Play className="w-3 h-3 text-white ml-0.5" />
                )}
              </div>

              {playingId === track.id && (
                <div className="absolute bottom-0.5 left-0.5 right-0.5 flex items-end gap-[1px] h-2">
                  {[...Array(5)].map((_, j) => (
                    <div
                      key={j}
                      className="flex-1 rounded-full bg-vivid-blue waveform-bar"
                      style={{ animationDelay: `${j * 0.1}s` }}
                    />
                  ))}
                </div>
              )}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {track.title}
              </p>
              <p className="text-[10px] text-muted/50 truncate">
                {track.artist}
              </p>
            </div>

            {/* Duration */}
            <span className="text-[10px] text-muted/40 tabular-nums hidden sm:block">
              {formatDuration(track.duration)}
            </span>

            {/* Price */}
            <span className="text-xs font-semibold text-vivid-blue tabular-nums w-16 text-right">
              {formatPrice(track.price)}
            </span>

            {/* Like */}
            <button className="p-1 text-muted/30 hover:text-zesty-red transition-colors opacity-0 group-hover:opacity-100">
              <Heart className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
