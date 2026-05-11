"use client";

import { memo, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock3,
  Compass,
  Disc3,
  Download,
  Headphones,
  Heart,
  LayoutGrid,
  Library,
  ListMusic,
  Menu,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";
import KevalLogo from "./KevalLogo";

const mainNav = [
  { label: "Browse", href: "/", icon: Compass },
  { label: "Explore", href: "/explore", icon: LayoutGrid },
  { label: "Packs", href: "/packs", icon: Library },
  { label: "Samples", href: "/samples", icon: Disc3 },
];

const libraryNav = [
  { label: "Wishlist", href: "/account?tab=wishlist", icon: Heart, tab: "wishlist" },
  {
    label: "Recently Played",
    href: "/account?tab=recent",
    icon: Clock3,
    tab: "recent",
  },
  { label: "Purchases", href: "/account?tab=history", icon: Receipt, tab: "history" },
  { label: "Downloads", href: "/account?tab=downloads", icon: Download, tab: "downloads" },
  { label: "Playlists", href: "/account?tab=playlists", icon: ListMusic, tab: "playlists" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarNowPlaying = memo(function SidebarNowPlaying({ collapsed }: { collapsed: boolean }) {
  const { currentItem } = usePlayerControls();
  const { progress } = usePlayerProgress();

  return (
    <div className={cn("shrink-0 pb-4", collapsed ? "px-1" : "px-3")}>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04] transition-all",
          collapsed ? "p-1.5" : "p-3"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-mid-purple to-grey-magenta">
            <Headphones className="h-4 w-4 text-white/55" />
          </div>
          <div
            aria-hidden={collapsed}
            className={cn(
              "min-w-0 transition-opacity duration-150",
              collapsed ? "pointer-events-none opacity-0" : "opacity-100"
            )}
          >
            <p className="truncate text-xs font-medium text-white">
              {currentItem?.title ?? "No preview playing"}
            </p>
            <p className="truncate text-[10px] text-muted">
              {currentItem?.artist ?? "Start a preview to see it here"}
            </p>
          </div>
        </div>
        <div className={cn("mt-2", collapsed && "mt-1")}>
          <div className="h-[2px] rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-vivid-blue to-mid-purple transition-all"
              style={{ width: `${Math.max(progress * 100, currentItem ? 6 : 0)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeAccountTab = searchParams.get("tab");
  const { isAuthenticated } = useAuth();

  const currentMainPath = useMemo(
    () => (pathname === "/" ? "/" : `/${pathname.split("/")[1] ?? ""}`),
    [pathname]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const routes = [
      ...mainNav.map((item) => item.href),
      ...libraryNav.map((item) => item.href),
      "/cart",
    ];

    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, onMobileClose]);

  if (!isAuthenticated) return null;

  const handleNavClick = () => {
    onMobileClose?.();
  };

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[1px] lg:hidden"
            aria-label="Close navigation menu"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside
        style={{ width: collapsed ? 76 : 248, willChange: "width" }}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#08091a]",
          "transition-[width,transform] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar header — YouTube Music pattern: hamburger sits at top-left,
            logo to its right when expanded; both stack into a vertical column
            when collapsed so they stay tappable in the 76px rail. */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 pb-2 pt-4",
            collapsed ? "flex-col gap-2 px-2" : "px-3"
          )}
        >
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link href="/" prefetch onClick={handleNavClick} className="shrink-0">
            {collapsed ? (
              <KevalLogo size="sm" showText={false} showTagline={false} />
            ) : (
              <KevalLogo size="sm" showTagline={true} />
            )}
          </Link>
        </div>

        <nav
          className={cn(
            "mt-4 flex-1 overflow-y-auto overflow-x-hidden",
            collapsed ? "space-y-2 px-1" : "space-y-6 px-3"
          )}
        >
          <div className={cn(collapsed ? "space-y-1" : "")}>
            {/* Section heading — hidden when collapsed; YT Music omits it too */}
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted/40">
                Discover
              </p>
            )}

            {mainNav.map((item) => {
              const isActive = item.href === "/" ? currentMainPath === "/" : currentMainPath === item.href;

              return (
                <Link key={item.href} href={item.href} prefetch onClick={handleNavClick}>
                  <div
                    className={cn(
                      "group relative rounded-xl font-medium transition-all",
                      collapsed
                        ? "flex flex-col items-center justify-center gap-1 px-1 py-2.5"
                        : "flex items-center gap-3 px-3 py-2.5 text-sm",
                      isActive
                        ? "text-white"
                        : "text-muted/70 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-white/[0.07]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    {isActive && !collapsed && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-vivid-blue"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative z-10 shrink-0 transition-colors",
                        collapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                        isActive ? "text-vivid-blue" : "group-hover:text-white"
                      )}
                    />
                    <span
                      className={cn(
                        "relative z-10 transition-colors",
                        collapsed
                          ? "text-center text-[10px] leading-tight line-clamp-2"
                          : "whitespace-nowrap"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div
            className={cn(
              collapsed
                ? "space-y-1 border-t border-white/[0.06] pt-2"
                : ""
            )}
          >
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted/40">
                Your Library
              </p>
            )}

            {libraryNav.map((item) => {
              const isActive = pathname === "/account" && activeAccountTab === item.tab;

              return (
                <Link key={item.href} href={item.href} prefetch onClick={handleNavClick}>
                  <div
                    className={cn(
                      "rounded-xl font-medium transition-all",
                      collapsed
                        ? "flex flex-col items-center justify-center gap-1 px-1 py-2.5"
                        : "flex items-center gap-3 px-3 py-2.5 text-sm",
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-muted/55 hover:bg-white/[0.03] hover:text-white"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "shrink-0",
                        collapsed ? "h-5 w-5" : "h-[18px] w-[18px]"
                      )}
                    />
                    <span
                      className={cn(
                        collapsed
                          ? "text-center text-[10px] leading-tight line-clamp-2"
                          : "whitespace-nowrap"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <SidebarNowPlaying collapsed={collapsed} />
      </aside>
    </>
  );
}
