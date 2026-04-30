"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickySidebarProps {
  children: ReactNode;
  /** Pixels from viewport top when sticking at top (matches header height). */
  topOffset?: number;
  /** Pixels from viewport bottom when sticking at bottom. */
  bottomOffset?: number;
  /** Min viewport width (px) at which sticky activates. */
  minWidth?: number;
  className?: string;
}

/**
 * Twitter / Linear-style dynamic sticky sidebar.
 *
 * Uses `position: sticky` with a dynamically adjusted `top` value:
 *
 *   scroll DOWN → top decreases → sidebar drifts with page (not pinned)
 *                 clamps at minTop when sidebar bottom reaches vpH−bottomOffset
 *   scroll UP   → top increases → sidebar drifts with page
 *                 clamps at topOffset when sidebar top reaches header line
 *
 * This preserves the sticky element's layout footprint — no visual gaps below.
 * `scrollHeight` and `innerHeight` are cached outside the scroll hot-path so
 * the listener never forces a synchronous layout reflow.
 */
export default function StickySidebar({
  children,
  topOffset = 96,
  bottomOffset = 16,
  minWidth = 1024,
  className,
}: StickySidebarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // All hot-path state in a single non-reactive ref — zero React re-renders on scroll.
  const s = useRef({
    top: topOffset,
    lastScrollY: 0,
    sidebarH: 0,   // updated by ResizeObserver only
    vpH: 0,        // updated by resize listener only
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const state = s.current;

    // Seed cached measurements once on mount.
    state.lastScrollY = window.scrollY;
    state.sidebarH = el.scrollHeight;
    state.vpH = window.innerHeight;
    state.top = topOffset;

    const apply = (top: number) => {
      el.style.position = "sticky";
      el.style.top = `${top}px`;
    };

    const clampedTop = (raw: number): number => {
      const maxTop = topOffset;
      // How high the sidebar can travel: bottom sits at vpH - bottomOffset.
      const minTop = state.vpH - state.sidebarH - bottomOffset;
      // Short sidebar: always pin to topOffset, no travel needed.
      if (minTop >= maxTop) return maxTop;
      return Math.min(maxTop, Math.max(minTop, raw));
    };

    // Initial paint.
    apply(clampedTop(state.top));

    // ── Scroll handler — reads ZERO layout properties ─────────────────────
    const onScroll = () => {
      if (window.innerWidth < minWidth) {
        el.style.position = "";
        el.style.top = "";
        return;
      }

      const scrollY = window.scrollY;
      const dy = scrollY - state.lastScrollY;
      state.lastScrollY = scrollY;
      if (dy === 0) return;

      const next = clampedTop(state.top - dy);
      if (next !== state.top) {
        state.top = next;
        apply(next);
      }
    };

    // ── Resize — re-cache and re-clamp ────────────────────────────────────
    const onResize = () => {
      state.vpH = window.innerHeight;
      state.sidebarH = el.scrollHeight;
      const next = clampedTop(state.top);
      state.top = next;
      apply(next);
    };

    // ── ResizeObserver — sidebar content changed height ───────────────────
    const ro = new ResizeObserver(() => {
      state.sidebarH = el.scrollHeight;
      const next = clampedTop(state.top);
      state.top = next;
      apply(next);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    ro.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      el.style.position = "";
      el.style.top = "";
    };
  }, [topOffset, bottomOffset, minWidth]);

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
    >
      {children}
    </div>
  );
}
