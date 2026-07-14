"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn, formatDuration, resampleWaveform } from "@/lib/utils";
import { usePlayerProgress } from "@/lib/player-context";

const FALLBACK_BARS = Array.from({ length: 72 }, (_, index) =>
  0.24 + ((index * 17 + 11) % 31) / 50
);

const WaveformProgress = memo(function WaveformProgress({
  waveform,
  waveformUrl,
  compact = false,
  className,
}: {
  waveform?: number[];
  waveformUrl?: string;
  compact?: boolean;
  className?: string;
}) {
  const { currentTime, duration, progress, seekToProgress } = usePlayerProgress();
  const rootRef = useRef<HTMLDivElement>(null);
  const [remoteWaveform, setRemoteWaveform] = useState<{ url: string; peaks: number[] } | null>(null);

  useEffect(() => {
    if (!waveformUrl) return;
    const controller = new AbortController();
    fetch(waveformUrl, { signal: controller.signal, credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("waveform_unavailable");
        return response.json() as Promise<number[] | { peaks?: number[] }>;
      })
      .then((payload) => {
        const peaks = Array.isArray(payload) ? payload : payload.peaks;
        setRemoteWaveform({
          url: waveformUrl,
          peaks: peaks?.filter((peak) => Number.isFinite(peak)) ?? [],
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setRemoteWaveform({ url: waveformUrl, peaks: [] });
      });
    return () => controller.abort();
  }, [waveformUrl]);

  const remotePeaks = remoteWaveform && remoteWaveform.url === waveformUrl
    ? remoteWaveform.peaks
    : null;
  const sourcePeaks = remotePeaks?.length ? remotePeaks : waveform;
  const bars = useMemo(
    () => resampleWaveform(sourcePeaks?.length ? sourcePeaks : FALLBACK_BARS, compact ? 56 : 96),
    [compact, sourcePeaks]
  );

  const seekAtClientX = useCallback((clientX: number) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    seekToProgress((clientX - bounds.left) / bounds.width);
  }, [seekToProgress]);

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    seekAtClientX(event.clientX);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 0.02 : -0.02;
    seekToProgress(progress + delta);
  };

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {!compact ? <span className="w-10 text-right text-[10px] tabular-nums text-muted">{formatDuration(Math.floor(currentTime))}</span> : null}
      <div
        ref={rootRef}
        role="slider"
        tabIndex={0}
        aria-label="Track progress"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatDuration(Math.floor(currentTime))} of ${formatDuration(Math.floor(duration))}`}
        onPointerDown={handlePointer}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) seekAtClientX(event.clientX);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative flex min-w-0 flex-1 touch-none items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-dandelion/80",
          compact ? "h-3" : "h-8"
        )}
      >
        <div className="absolute inset-x-0 flex h-full items-center gap-[2px] overflow-hidden">
          {bars.map((value, index) => {
            const complete = index / Math.max(bars.length - 1, 1) <= progress;
            return (
              <span
                key={index}
                className={cn(
                  "min-w-0 flex-1 rounded-full transition-colors duration-100",
                  complete ? "bg-dandelion" : "bg-white/14 group-hover:bg-white/22"
                )}
                style={{ height: `${Math.max(18, value * 100)}%` }}
              />
            );
          })}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-zesty-red opacity-0 shadow-[0_0_0_3px_rgba(229,66,46,0.22)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      {!compact ? <span className="w-10 text-[10px] tabular-nums text-muted">{formatDuration(Math.floor(duration))}</span> : null}
    </div>
  );
});

export default WaveformProgress;
