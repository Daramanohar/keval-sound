"use client";

import {
  Children,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ContentSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  href?: string;
  linkText?: string;
  children: ReactNode;
  className?: string;
}

const ContentSection = memo(function ContentSection({
  title,
  subtitle,
  badge,
  badgeColor = "bg-vivid-blue/10 text-vivid-blue",
  href,
  linkText = "See All",
  children,
  className,
}: ContentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number | null;
    startX: number;
    startScrollLeft: number;
    dragging: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    dragging: false,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const itemCount = useMemo(() => Children.count(children), [children]);

  const updateScrollState = useCallback(() => {
    const rail = scrollRef.current;
    if (!rail) return;

    const maxLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const hasOverflow = maxLeft > 4;

    if (!hasOverflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(rail.scrollLeft > 6);
    setCanScrollRight(rail.scrollLeft < maxLeft - 6);
  }, []);

  useEffect(() => {
    const rail = scrollRef.current;
    if (!rail) return;

    const handleScroll = () => updateScrollState();
    const initialFrame = window.requestAnimationFrame(updateScrollState);

    rail.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      rail.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [itemCount, updateScrollState]);

  const scrollToSibling = useCallback((direction: "left" | "right") => {
    const rail = scrollRef.current;
    if (!rail) return;

    rail.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!rail) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: rail.scrollLeft,
      dragging: false,
    };
    rail.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!rail || dragState.current.pointerId !== event.pointerId) return;

    const delta = event.clientX - dragState.current.startX;

    if (Math.abs(delta) > 5 && !dragState.current.dragging) {
      dragState.current.dragging = true;
      setIsDragging(true);
    }

    if (!dragState.current.dragging) return;

    event.preventDefault();
    rail.scrollLeft = dragState.current.startScrollLeft - delta;
  }, []);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!rail || dragState.current.pointerId !== event.pointerId) return;

    dragState.current = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      dragging: false,
    };
    setIsDragging(false);

    if (rail.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const rail = scrollRef.current;
    if (!rail) return;

    if (event.shiftKey || Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      rail.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className={cn("mb-8", className)}
    >
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            {badge ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeColor)}>
                {badge}
              </span>
            ) : null}
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-muted/60">{subtitle}</p> : null}
        </div>

        {href ? (
          <Link
            href={href}
            className="group flex shrink-0 items-center gap-1 text-xs text-vivid-blue transition-colors hover:text-accent-hover"
          >
            {linkText}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>

      <div className="relative overflow-visible w-full">
        <button
          type="button"
          onClick={() => {
            if (!canScrollLeft) return;
            scrollToSibling("left");
          }}
          className={cn(
            "absolute left-2 top-1/2 z-50 pointer-events-auto cursor-pointer flex -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition-all",
            "h-10 w-10",
            canScrollLeft
              ? "border-white/[0.16] bg-black/40 text-white shadow-lg shadow-black/25 hover:scale-105 hover:bg-black/55"
              : "border-white/[0.08] bg-black/30 text-white/45 opacity-70"
          )}
          aria-disabled={!canScrollLeft}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canScrollRight) return;
            scrollToSibling("right");
          }}
          className={cn(
            "absolute right-2 top-1/2 z-50 pointer-events-auto cursor-pointer flex -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition-all",
            "h-10 w-10",
            canScrollRight
              ? "border-white/[0.16] bg-black/40 text-white shadow-lg shadow-black/25 hover:scale-105 hover:bg-black/55"
              : "border-white/[0.08] bg-black/30 text-white/45 opacity-70"
          )}
          aria-disabled={!canScrollRight}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className={cn(
            "w-full scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory overflow-y-visible px-6 pr-10 pb-2 cursor-grab active:cursor-grabbing",
            "overscroll-x-contain",
            "touch-pan-x",
            isDragging && "cursor-grabbing select-none"
          )}
          style={{ scrollPaddingLeft: 24, scrollPaddingRight: 64 }}
        >
          {children}
        </div>
      </div>
    </motion.section>
  );
});

export default ContentSection;
