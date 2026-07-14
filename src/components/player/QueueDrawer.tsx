"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ListMusic, Play, Trash2, X } from "lucide-react";
import { usePlayerControls } from "@/lib/player-context";
import { cn, formatDuration } from "@/lib/utils";
import PlayerArtwork from "./PlayerArtwork";

export default function QueueDrawer() {
  const {
    queue,
    currentIndex,
    isQueueOpen,
    closeQueueDrawer,
    clearQueue,
    playQueueItem,
    removeFromQueue,
    reorderQueue,
  } = usePlayerControls();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isQueueOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      returnFocusRef.current?.focus();
    };
  }, [isQueueOpen]);

  return (
    <AnimatePresence>
      {isQueueOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQueueDrawer}
            className="fixed inset-0 z-[78] bg-black/55 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Playback queue"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 48 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 right-0 top-0 z-[79] flex w-[min(420px,100vw)] flex-col border-l border-white/[0.08] bg-[#0c0d1c]/98 shadow-2xl"
          >
            <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-5">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-dandelion" />
                <h2 className="text-sm font-semibold text-white">Up next</h2>
                <span className="text-xs text-muted">{queue.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={clearQueue} className="rounded-md px-2 py-1.5 text-[11px] font-medium text-muted hover:bg-white/[0.06] hover:text-white">Clear</button>
                <button ref={closeButtonRef} type="button" onClick={closeQueueDrawer} aria-label="Close queue" className="flex h-9 w-9 items-center justify-center rounded-full text-muted outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-dandelion/80"><X className="h-4 w-4" /></button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {queue.map((item, index) => {
                const active = index === currentIndex;
                return (
                  <div key={`${item.id}-${index}`} className={cn("group grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md px-2 py-2", active ? "bg-dandelion/[0.08]" : "hover:bg-white/[0.04]") }>
                    <PlayerArtwork src={item.coverUrl} title={item.title} className="h-11 w-11 rounded-md" sizes="44px" />
                    <button type="button" onClick={() => playQueueItem(index)} className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-dandelion/80">
                      <p className={cn("truncate text-sm font-medium", active ? "text-dandelion" : "text-white")}>{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{item.artist} · {formatDuration(item.duration)}</p>
                    </button>
                    <div className="flex items-center gap-0.5">
                      {active ? <Play className="mr-1 h-3.5 w-3.5 fill-dandelion text-dandelion" aria-label="Now playing" /> : null}
                      <QueueButton label="Move up" disabled={index === 0} onClick={() => reorderQueue(index, index - 1)}><ArrowUp className="h-3.5 w-3.5" /></QueueButton>
                      <QueueButton label="Move down" disabled={index === queue.length - 1} onClick={() => reorderQueue(index, index + 1)}><ArrowDown className="h-3.5 w-3.5" /></QueueButton>
                      <QueueButton label={`Remove ${item.title} from queue`} disabled={queue.length <= 1} onClick={() => removeFromQueue(item.id)}><Trash2 className="h-3.5 w-3.5" /></QueueButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function QueueButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 outline-none transition-all hover:bg-white/[0.08] hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-dandelion/80 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-15">
      {children}
    </button>
  );
}
