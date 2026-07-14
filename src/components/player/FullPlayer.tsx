"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ListMusic, ShieldCheck } from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import PlayerActions from "./PlayerActions";
import PlayerArtwork from "./PlayerArtwork";
import PlayerControls from "./PlayerControls";
import VolumeControl from "./VolumeControl";
import WaveformProgress from "./WaveformProgress";

export default function FullPlayer() {
  const { currentItem, isFullPlayerOpen, closeFullPlayer, openQueueDrawer, error, isBuffering } = usePlayerControls();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isFullPlayerOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previous;
      returnFocusRef.current?.focus();
    };
  }, [isFullPlayerOpen]);

  return (
    <AnimatePresence>
      {currentItem && isFullPlayerOpen ? (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label={`Now playing ${currentItem.title}`}
          initial={{ opacity: 0, y: "8%", scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: "8%", scale: 0.985 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[74] overflow-y-auto bg-[#0c0d1c]/98"
        >
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0c0d1c]/85 px-4 backdrop-blur-xl sm:px-6">
            <button ref={closeButtonRef} type="button" onClick={closeFullPlayer} aria-label="Collapse full player" className="flex h-10 w-10 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80"><ChevronDown className="h-5 w-5" /></button>
            <div className="text-center"><p className="text-[10px] font-bold uppercase text-dandelion">Now playing</p><p className="mt-0.5 max-w-[50vw] truncate text-xs text-muted">{currentItem.sourcePackTitle ?? currentItem.source ?? "Keval Sound"}</p></div>
            <button type="button" onClick={openQueueDrawer} aria-label="Open queue" className="flex h-10 w-10 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80"><ListMusic className="h-5 w-5" /></button>
          </header>

          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)] lg:gap-16 lg:px-10">
            <div className="mx-auto w-full max-w-[520px]">
              <motion.div layoutId="keval-player-artwork" transition={{ duration: 0.28 }}>
                <PlayerArtwork src={currentItem.coverUrl} title={currentItem.title} priority className="aspect-square w-full rounded-md shadow-[0_28px_80px_rgba(0,0,0,0.45)]" sizes="(max-width: 1024px) 70vw, 460px" />
              </motion.div>
            </div>

            <div className="min-w-0 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full bg-zesty-red/12 px-3 py-1 text-[10px] font-bold uppercase text-zesty-red">{currentItem.isPreviewOnly ? "MP3 Preview" : `${currentItem.playbackQuality} access`}</span>
                {currentItem.genre ? <span className="rounded-full bg-dandelion/10 px-3 py-1 text-[10px] font-bold uppercase text-dandelion">{currentItem.genre}</span> : null}
              </div>
              <h1 className="mt-5 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{currentItem.title}</h1>
              <p className="mt-2 text-sm text-muted sm:text-base">{currentItem.artist}{currentItem.sourcePackTitle ? ` · ${currentItem.sourcePackTitle}` : ""}</p>
              {currentItem.tags?.length ? <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">{currentItem.tags.slice(0, 4).map((tag) => <span key={tag} className="text-xs text-muted">#{tag}</span>)}</div> : null}

              <div className="mt-8"><WaveformProgress waveform={currentItem.waveform} waveformUrl={currentItem.waveformUrl} /></div>
              <PlayerControls className="mt-5" />
              <div className="mt-4 flex justify-center lg:justify-start"><VolumeControl /></div>

              {isBuffering ? <p className="mt-3 text-xs text-dandelion">Buffering high-quality playback...</p> : null}
              {error ? <p role="alert" className="mt-3 text-xs text-zesty-red">{error}</p> : null}

              <div className="mt-7 border-t border-white/[0.07] pt-6"><PlayerActions /></div>
              <div className="mt-6 flex items-start gap-3 rounded-md border border-white/[0.06] bg-white/[0.025] p-4 text-left">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-dandelion" />
                <div>
                  <p className="text-xs font-semibold text-light-grey">{currentItem.licenseType ?? "Keval Sound music license"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Preview audio is protected and streamed through Keval Sound. A purchase unlocks the MP3, WAV master, and your personal license document. Private WAV URLs are never exposed directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
