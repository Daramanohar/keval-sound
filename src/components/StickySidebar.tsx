"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickySidebarProps {
  children: ReactNode;
  /** Distance from viewport top while pinned (px). Should clear the topbar. */
  topOffset?: number;
  /** Distance from viewport bottom (px). Subtracted from max-height. */
  bottomOffset?: number;
  className?: string;
}

/**
 * x.com-style sidebar feed.
 *
 * On lg+ screens the sidebar pins to the viewport (`position: sticky`) and the
 * children scroll inside it. When the inner feed reaches its end, scroll
 * naturally chains to the main page, so the sidebar stays locked while the
 * page continues underneath. Below lg the sidebar is a normal block that
 * scrolls with the page.
 *
 * The scrollbar is hidden via `.scrollbar-hide`. The feed has no item cap and
 * gracefully accommodates a catalog of any length.
 */
export default function StickySidebar({
  children,
  topOffset = 80,
  bottomOffset = 16,
  className,
}: StickySidebarProps) {
  return (
    <aside
      style={
        {
          "--ssb-top": `${topOffset}px`,
          "--ssb-max-h": `calc(100vh - ${topOffset + bottomOffset}px)`,
        } as CSSProperties
      }
      className={cn(
        "lg:sticky lg:top-[var(--ssb-top)] lg:max-h-[var(--ssb-max-h)] lg:overflow-y-auto",
        "scrollbar-hide",
        className,
      )}
    >
      {children}
    </aside>
  );
}
