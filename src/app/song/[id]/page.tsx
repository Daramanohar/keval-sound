"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  Heart,
  Pause,
  Play,
  Plus,
  Send,
  Share2,
} from "lucide-react";
import { packs as allPacks, tracks as allTracks, type Pack, type Track } from "@/lib/mock-data";
import { cn, formatDuration } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

const SONG_PRICE = 99;
const COMMENTS_KEY_PREFIX = "keval:comments:";

interface Comment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

function findTrackContext(trackId: string): { track: Track | null; pack: Pack | null } {
  for (const pack of allPacks) {
    const t = pack.tracks.find((x) => x.id === trackId);
    if (t) return { track: t, pack };
  }
  return { track: allTracks.find((t) => t.id === trackId) ?? null, pack: null };
}

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const { track, pack } = useMemo(() => findTrackContext(params.id), [params.id]);

  if (!track) {
    notFound();
  }

  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    addTrackToCart,
    isInCart,
    isInWishlist,
    isOwned,
    toggleTrackWishlist,
  } = useStore();
  const { toggleTrack, isItemPlaying, currentItem } = usePlayerControls();

  const trackPlaying = isItemPlaying(track.id, "track");
  const trackOwned = isOwned(track.id, "track");
  const trackInCart = isInCart(track.id, "track");
  const trackSaved = isInWishlist(track.id, "track");
  const isCurrent = currentItem?.id === track.id;
  const coverUrl = pack?.coverUrl ?? track.coverUrl;
  const isImageCover = coverUrl.startsWith("/");

  // Lyrics
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsState, setLyricsState] = useState<"loading" | "ready" | "missing">(
    track.lyricsUrl ? "loading" : "missing"
  );

  useEffect(() => {
    if (!track.lyricsUrl) return;
    let cancelled = false;
    fetch(track.lyricsUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not-ok"))))
      .then((text) => {
        if (cancelled) return;
        setLyrics(text);
        setLyricsState("ready");
      })
      .catch(() => {
        if (!cancelled) setLyricsState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [track.lyricsUrl]);

  // Comments — localStorage-backed. Pure client state, MVP-friendly.
  const commentsKey = `${COMMENTS_KEY_PREFIX}${track.id}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  // Hydrate comments from localStorage after mount. The initial render returns
  // [] (matches server output to avoid hydration mismatch); we update only
  // after the client mounts. This is the standard SSR-safe LS-load pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(commentsKey);
    } catch {}
    let parsed: Comment[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Comment[];
      } catch {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load persisted state on mount, not derived from props
    setComments(parsed);
  }, [commentsKey]);

  const persistComments = useCallback(
    (next: Comment[]) => {
      setComments(next);
      try {
        window.localStorage.setItem(commentsKey, JSON.stringify(next));
      } catch {}
    },
    [commentsKey]
  );

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const entry: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      authorName: user?.name ?? "Anonymous",
      createdAt: new Date().toISOString(),
    };
    persistComments([entry, ...comments]);
    setDraft("");
  };

  const handleAddToCart = () => {
    if (trackOwned) {
      showToast({ tone: "info", title: `${track.title} is already owned` });
      return;
    }
    const added = addTrackToCart(track);
    showToast(
      added
        ? { title: `${track.title} added to cart`, description: `${track.artist} · ₹${SONG_PRICE}` }
        : { tone: "info", title: `${track.title} is already in your cart` }
    );
  };

  const handlePlay = () => {
    if (pack) toggleTrack(track, { queue: pack.tracks, pack });
    else toggleTrack(track);
  };

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    showToast({ tone: "info", title: "Track link copied" });
  };

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href={pack ? `/pack/${pack.id}` : "/explore"}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted/60 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {pack ? `Back to ${pack.title}` : "Back"}
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex flex-col gap-6 md:flex-row md:items-end"
      >
        <div className="relative aspect-square w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/40 md:w-80">
          {isImageCover ? (
            <Image src={coverUrl} alt="" fill priority className="object-cover" sizes="320px" />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", coverUrl)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {track.genre}
            </span>
            {track.isExclusive ? (
              <span className="rounded-full bg-vivid-blue/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Exclusive
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-bold text-white md:text-5xl">{track.title}</h1>
          <p className="mt-2 text-base text-muted">{track.artist}</p>

          {pack ? (
            <Link
              href={`/pack/${pack.id}`}
              className="mt-2 inline-flex text-sm font-medium text-vivid-blue hover:text-accent-hover"
            >
              From {pack.title}
            </Link>
          ) : null}

          {/* Play count + meta */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted/70">
            <span>{track.plays.toLocaleString()} plays</span>
            <span className="h-1 w-1 rounded-full bg-muted/30" />
            <span>{formatDuration(track.duration)}</span>
            <span className="h-1 w-1 rounded-full bg-muted/30" />
            <span>{track.bpm} BPM</span>
            <span className="h-1 w-1 rounded-full bg-muted/30" />
            <span>Key {track.key}</span>
          </div>

          {/* Action row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-vivid-blue/20"
            >
              {trackPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              {trackPlaying ? "Pause" : isCurrent ? "Resume" : "Play"}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={trackOwned}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all",
                trackOwned
                  ? "cursor-not-allowed bg-white/[0.06] text-white/60"
                  : trackInCart
                    ? "bg-vivid-blue text-white"
                    : "bg-vivid-blue/10 text-vivid-blue hover:bg-vivid-blue/20"
              )}
            >
              <Plus className="h-4 w-4" />
              {trackOwned ? "Owned" : trackInCart ? "In Cart" : `Add to Cart · ₹${SONG_PRICE}`}
            </button>
            <button
              type="button"
              onClick={() => toggleTrackWishlist(track)}
              aria-label={trackSaved ? "Remove from wishlist" : "Save to wishlist"}
              className={cn(
                "rounded-xl p-3 transition-all",
                trackSaved
                  ? "bg-zesty-red/10 text-zesty-red"
                  : "bg-white/[0.06] text-muted hover:bg-white/[0.1] hover:text-white"
              )}
            >
              <Heart className={cn("h-4 w-4", trackSaved && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => showToast({ tone: "info", title: "Crates coming soon" })}
              aria-label="Save to crate"
              className="rounded-xl bg-white/[0.06] p-3 text-muted transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              className="rounded-xl bg-white/[0.06] p-3 text-muted transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tags strip */}
      {track.tags.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-1.5">
          {track.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80"
            >
              #{tag}
            </span>
          ))}
          <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80">
            {track.mood}
          </span>
          <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted/80">
            {track.language}
          </span>
        </div>
      ) : null}

      {/* Lyrics */}
      <section className="mb-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted/60">Lyrics</h2>
        {lyricsState === "loading" ? (
          <p className="text-sm text-muted/50">Loading lyrics…</p>
        ) : lyricsState === "missing" ? (
          <p className="text-sm text-muted/50">Lyrics aren&apos;t available for this track yet.</p>
        ) : (
          <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed text-white/85">{lyrics}</pre>
        )}
      </section>

      {/* Comments */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted/60">
          Comments {comments.length > 0 ? <span className="text-muted/40">· {comments.length}</span> : null}
        </h2>

        <form onSubmit={handlePostComment} className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vivid-blue/20 text-xs font-bold text-vivid-blue">
            {(user?.name ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 focus-within:border-vivid-blue/40">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Leave a comment…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-muted/40 focus:outline-none"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Post comment"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                draft.trim()
                  ? "bg-vivid-blue text-white hover:bg-accent-hover"
                  : "cursor-not-allowed bg-white/[0.05] text-muted/40"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {comments.length === 0 ? (
          <p className="text-sm text-muted/50">No comments yet — be the first.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mid-purple/30 text-xs font-bold text-mid-purple">
                  {c.authorName[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{c.authorName}</span>
                    <span className="text-[11px] text-muted/50">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-white/85">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}
