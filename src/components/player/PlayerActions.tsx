"use client";

import { Download, ExternalLink, Heart, Info, MessageCircle, Share2, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayerControls } from "@/lib/player-context";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { useSongDetail } from "@/lib/song-detail-context";
import { cn, formatPrice } from "@/lib/utils";
import { useResolvedPlayerTrack } from "./useResolvedPlayerTrack";

export default function PlayerActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { currentItem, closeFullPlayer } = usePlayerControls();
  const { track } = useResolvedPlayerTrack(currentItem?.id);
  const { addTrackToCart, isInCart, isInWishlist, isOwned, toggleTrackWishlist, getLicense } = useStore();
  const { showToast } = useToast();
  const { close: closeSongDetail } = useSongDetail();
  const activeTrackId = currentItem?.type === "track" ? currentItem.id : track?.id;
  const trackHref = activeTrackId ? `/song/${encodeURIComponent(activeTrackId)}` : null;

  useEffect(() => {
    if (trackHref) router.prefetch(trackHref);
  }, [router, trackHref]);

  if (!currentItem || currentItem.type !== "track") return null;

  const liked = track ? isInWishlist(track.id, "track") : false;
  const owned = track ? isOwned(track.id, "track") : false;
  const inCart = track ? isInCart(track.id, "track") : false;
  const license = track ? getLicense(track.id, "track") : null;

  const share = async () => {
    if (!track) return;
    const url = `${window.location.origin}/song/${track.id}`;
    try {
      if (navigator.share) await navigator.share({ title: track.title, text: `Listen to ${track.title} on Keval Sound`, url });
      else await navigator.clipboard.writeText(url);
      showToast({ tone: "info", title: "Track link ready to share" });
    } catch {}
  };

  const openTrackPage = (section?: "comments") => {
    if (!trackHref) return;
    closeSongDetail();
    closeFullPlayer();
    router.push(section ? `${trackHref}#${section}` : trackHref);
  };

  const openCommerce = () => {
    if (!track) return;
    if (owned) {
      closeFullPlayer();
      router.push("/account?tab=downloads");
      return;
    }
    if (inCart) {
      closeFullPlayer();
      router.push("/cart");
      return;
    }

    const added = addTrackToCart(track);
    showToast({
      tone: added ? "success" : "info",
      title: added ? `${track.title} added to cart` : `${track.title} is already in your cart`,
      description: `${formatPrice(track.price)} | MP3, WAV, license PDF, and invoice after purchase`,
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <ActionButton label={liked ? "Remove from Liked Songs" : "Add to Liked Songs"} active={liked} onClick={() => track && toggleTrackWishlist(track)}>
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
        </ActionButton>
        <ActionButton
          label={owned ? "Open purchased downloads" : inCart ? "Open cart" : "Add track to cart"}
          active={inCart}
          onClick={openCommerce}
        >
          {owned ? <Download className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        </ActionButton>
        <ActionButton label="Share track" onClick={() => void share()}><Share2 className="h-4 w-4" /></ActionButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <ActionButton label={liked ? "Remove from Liked Songs" : "Add to Liked Songs"} text={liked ? "Liked" : "Like"} active={liked} onClick={() => track && toggleTrackWishlist(track)}>
        <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      </ActionButton>
      <ActionButton label="Share track" text="Share" onClick={() => void share()}><Share2 className="h-4 w-4" /></ActionButton>
      <ActionButton label="Open comments" text="Comments" onClick={() => openTrackPage("comments")}><MessageCircle className="h-4 w-4" /></ActionButton>
      <ActionButton label="Open track details" text="Details" onClick={() => openTrackPage()}><Info className="h-4 w-4" /></ActionButton>
      {owned ? (
        <ActionButton label="Open purchased downloads" text="Downloads" onClick={() => router.push("/account?tab=downloads")}><Download className="h-4 w-4" /></ActionButton>
      ) : (
        <button
          type="button"
          disabled={!track}
          onClick={openCommerce}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-zesty-red px-4 text-xs font-semibold text-white outline-none transition-colors hover:bg-zesty-red/85 focus-visible:ring-2 focus-visible:ring-dandelion disabled:opacity-40"
        >
          <ShoppingCart className="h-4 w-4" />
          {inCart ? "Open cart" : `Buy license | ${formatPrice(currentItem.price ?? 99)}`}
        </button>
      )}
      {license ? (
        <span className="inline-flex h-10 items-center gap-2 rounded-md border border-dandelion/20 bg-dandelion/[0.06] px-3 text-xs text-dandelion">
          <ExternalLink className="h-3.5 w-3.5" /> License {license}
        </span>
      ) : null}
    </div>
  );
}

function ActionButton({ label, text, active, onClick, children }: { label: string; text?: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active || undefined} onClick={onClick} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-dandelion/80", active ? "bg-zesty-red/12 text-zesty-red" : "bg-white/[0.05] text-muted hover:bg-white/[0.09] hover:text-white", !text && "w-10 px-0") }>
      {children}{text ? <span>{text}</span> : null}
    </button>
  );
}
