"use client";

import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  data: number[];
  isPlaying?: boolean;
  progress?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  stretch?: boolean;
  className?: string;
  activeColor?: string;
  inactiveColor?: string;
}

export default function WaveformVisualizer({
  data,
  isPlaying = false,
  progress = 0,
  height = 40,
  barWidth = 3,
  gap = 2,
  stretch = false,
  className,
  activeColor = "bg-vivid-blue",
  inactiveColor = "bg-white/20",
}: WaveformVisualizerProps) {
  const progressIndex = Math.floor(data.length * progress);

  return (
    <div
      className={cn("flex items-end w-full", className)}
      style={{ height, gap }}
    >
      {data.map((value, i) => {
        const isPast = i < progressIndex;
        const barHeight = Math.max(4, value * height);

        return (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-150",
              stretch && "flex-1",
              isPast ? activeColor : inactiveColor,
              isPlaying && "waveform-bar"
            )}
            style={{
              width: stretch ? undefined : barWidth,
              height: isPlaying && !isPast ? undefined : barHeight,
              minHeight: 4,
              animationDelay: isPlaying ? `${(i * 0.05) % 0.5}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function MiniWaveform({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-[2px]", className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-vivid-blue waveform-bar"
          style={{
            height: 16,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
