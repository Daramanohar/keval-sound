"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Disc3,
  Download,
  Headphones,
  Heart,
  LayoutGrid,
  Library,
  ListMusic,
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
}

const SidebarNowPlaying = memo(function SidebarNowPlaying({ collapsed }: { collapsed: boolean }) {
  const { currentItem } = usePlayerControls();
  const { progress } = usePlayerProgress();

  return (
    <div className="shrink-0 px-3 pb-4">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04] transition-all",
          collapsed ? "p-2" : "p-3"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-mid-purple to-grey-magenta">
            <Headphones className="h-4 w-4 text-white/55" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="truncate text-xs font-medium text-white">
                  {currentItem?.title ?? "No preview playing"}
                </p>
                <p className="truncate text-[10px] text-muted">
                  {currentItem?.artist ?? "Start a preview to see it here"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeAccountTab = searchParams.get("tab");
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 248 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#08091a] transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex shrink-0 items-center px-4 pb-2 pt-5">
          <Link href="/" prefetch onClick={handleNavClick}>
            {collapsed ? (
              <KevalLogo size="sm" showText={false} showTagline={false} />
            ) : (
              <KevalLogo size="sm" showTagline={true} />
            )}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute right-[-12px] top-20 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[#12132a] text-muted transition-all hover:bg-white/[0.08] hover:text-white lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3">
          <div>
            <p
              className={cn(
                "mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted/40 transition-opacity",
                collapsed ? "px-0 opacity-0" : "px-2"
              )}
            >
              {collapsed ? "" : "Discover"}
            </p>

            {mainNav.map((item) => {
              const isActive = item.href === "/" ? currentMainPath === "/" : currentMainPath === item.href;

              return (
                <Link key={item.href} href={item.href} prefetch onClick={handleNavClick}>
                  <div
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      collapsed && "justify-center px-0",
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
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-vivid-blue"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative z-10 h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-vivid-blue" : "group-hover:text-white"
                      )}
                    />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="relative z-10 whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </Link>
              );
            })}
          </div>

          <div>
            <p
              className={cn(
                "mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted/40 transition-opacity",
                collapsed ? "px-0 opacity-0" : "px-2"
              )}
            >
              {collapsed ? "" : "Your Library"}
            </p>

            {libraryNav.map((item) => {
              const isActive = pathname === "/account" && activeAccountTab === item.tab;

              return (
                <Link key={item.href} href={item.href} prefetch onClick={handleNavClick}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-muted/55 hover:bg-white/[0.03] hover:text-white"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <SidebarNowPlaying collapsed={collapsed} />
      </motion.aside>
    </>
  );
}
