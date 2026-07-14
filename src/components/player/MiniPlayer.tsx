"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronUp, ListMusic, RotateCcw, X } from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import PlayerActions from "./PlayerActions";
import PlayerArtwork from "./PlayerArtwork";
import PlayerControls from "./PlayerControls";
import VolumeControl from "./VolumeControl";
import WaveformProgress from "./WaveformProgress";

export default function MiniPlayer() {
  const {
    currentItem,
    isVisible,
    error,
    isBuffering,
    isFullPlayerOpen,
    openFullPlayer,
    openQueueDrawer,
    retryPlayback,
    dismissPlayer,
  } = usePlayerControls();

  return (
    <AnimatePresence>
      {currentItem && isVisible && !isFullPlayerOpen ? (
        <motion.section
          aria-label="Now playing"
          initial={{ opacity: 0, y: 84 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 84 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="player-bar fixed inset-x-0 bottom-0 z-[60]"
        >
          <div className="md:hidden"><WaveformProgress waveform={currentItem.waveform} waveformUrl={currentItem.waveformUrl} compact /></div>
          <div className="mx-auto grid h-[68px] max-w-[1800px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 md:h-[92px] md:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.5fr)_minmax(220px,0.8fr)] md:gap-4 md:px-5">
            <button
              type="button"
              onClick={openFullPlayer}
              aria-label="Open full player"
              className="group flex min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-dandelion/80"
            >
              <motion.span layoutId="keval-player-artwork" className="block shrink-0">
                <PlayerArtwork src={currentItem.coverUrl} title={currentItem.title} className="h-11 w-11 rounded-md md:h-14 md:w-14" sizes="56px" />
              </motion.span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">{currentItem.title}</span>
                  <span className="hidden shrink-0 rounded-full bg-dandelion/10 px-2 py-0.5 text-[9px] font-bold uppercase text-dandelion sm:inline">{currentItem.isPreviewOnly ? "Preview" : currentItem.playbackQuality}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">{currentItem.artist}{currentItem.sourcePackTitle ? ` · ${currentItem.sourcePackTitle}` : ""}</span>
                {isBuffering ? <span aria-live="polite" className="mt-0.5 block text-[10px] text-dandelion">Buffering...</span> : null}
              </span>
              <ChevronUp className="hidden h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:text-white sm:block" />
            </button>

            <div className="hidden min-w-0 flex-col gap-1.5 md:flex">
              <PlayerControls compact />
              <WaveformProgress waveform={currentItem.waveform} waveformUrl={currentItem.waveformUrl} compact />
            </div>

            <div className="flex items-center justify-end gap-1">
              <div className="md:hidden"><PlayerControls compact /></div>
              <div className="hidden xl:block"><PlayerActions compact /></div>
              <button type="button" onClick={openQueueDrawer} aria-label="Open queue" title="Queue" className="hidden h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80 lg:flex"><ListMusic className="h-4 w-4" /></button>
              <VolumeControl className="hidden lg:flex" />
              <button type="button" onClick={dismissPlayer} aria-label="Close player" title="Close player" className="hidden h-9 w-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80 sm:flex"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {error ? (
            <div role="alert" className="absolute bottom-full left-1/2 flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-t-md border border-zesty-red/25 bg-[#1b111c] px-4 py-2 text-xs text-light-grey shadow-xl">
              <span className="flex min-w-0 items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0 text-zesty-red" /><span className="truncate">{error}</span></span>
              <button type="button" onClick={retryPlayback} className="flex shrink-0 items-center gap-1.5 font-semibold text-dandelion hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Retry</button>
            </div>
          ) : null}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
