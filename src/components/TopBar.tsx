"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Headphones,
  Heart,
  HelpCircle,
  LogOut,
  Menu,
  MessageCircle,
  Monitor,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";

const searchSuggestions = [
  "Upbeat Bollywood wedding track with dhol",
  "Lo-fi study beats with sitar melody",
  "Dark drill beat 140 BPM in minor key",
  "Chill Tamil ambient with rain sounds",
  "Punjabi bhangra pop for dance video",
];

const supportItems = [
  {
    href: "/account?tab=support",
    label: "Help Center",
    icon: HelpCircle,
    desc: "FAQs, guides, and support docs",
  },
  {
    href: "/account?tab=licensing",
    label: "Licensing Support",
    icon: Headphones,
    desc: "Rights, ownership, and usage help",
  },
  {
    href: "/account?tab=billing",
    label: "Billing & Payments",
    icon: CreditCard,
    desc: "Invoices, plans, and refunds",
  },
  {
    href: "/account?tab=support",
    label: "Customer Support",
    icon: MessageCircle,
    desc: "Talk to the KEVAL SOUND team",
  },
];

const accountItems = [
  {
    href: "/account?tab=profile",
    icon: User,
    label: "Profile",
    desc: "Edit your creator identity",
  },
  {
    href: "/account?tab=billing",
    icon: CreditCard,
    label: "Billing",
    desc: "Manage subscription and invoices",
  },
  {
    href: "/account?tab=settings",
    icon: Settings,
    label: "Settings",
    desc: "Playback, notifications, and workspace preferences",
  },
  {
    href: "/account?tab=legal",
    icon: Shield,
    label: "Legal",
    desc: "Privacy, terms, and licensing policy references",
  },
];

const supportLinks = [
  {
    href: "/account?tab=licensing",
    icon: Shield,
    label: "Licensing Help",
    desc: "Understand rights and ownership",
  },
  {
    href: "/account?tab=support",
    icon: Headphones,
    label: "Customer Support",
    desc: "Get help from the KEVAL SOUND team",
  },
  {
    href: "/account?tab=desktop",
    icon: Monitor,
    label: "Install Desktop App",
    desc: "Set up the focused desktop experience",
  },
];

interface TopBarProps {
  onMenuToggle?: () => void;
  mobileOpen?: boolean;
}

export default function TopBar({ onMenuToggle, mobileOpen }: TopBarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, wishlistCount } = useStore();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const supportRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % searchSuggestions.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (supportRef.current && !supportRef.current.contains(target)) {
        setSupportOpen(false);
      }

      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const routes = [
      "/explore",
      "/packs",
      "/cart",
      "/account?tab=wishlist",
      "/account?tab=recent",
      "/account?tab=history",
      "/account?tab=settings",
      "/account?tab=support",
      "/account?tab=licensing",
    ];

    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [isAuthenticated, router]);

  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim();
    const nextPath = trimmedQuery
      ? `/explore?q=${encodeURIComponent(trimmedQuery)}`
      : "/explore";

    setSearchFocused(false);
    startTransition(() => {
      router.push(nextPath);
    });
  }, [query, router]);

  const handleOptimize = useCallback(() => {
    if (!query.trim() || optimizing) return;

    setOptimizing(true);
    window.setTimeout(() => {
      setQuery(
        `${query} - enhanced: include BPM range, key, instrumentation, mood, and regional style`
      );
      setOptimizing(false);
    }, 700);
  }, [optimizing, query]);

  const handleSignOut = useCallback(() => {
    setUserOpen(false);
    logout();
    startTransition(() => {
      router.replace("/auth");
    });
  }, [logout, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 lg:px-6 bg-[#0c0d1c]/80 backdrop-blur-xl border-b border-white/[0.04]">
      {onMenuToggle && (
        <button
          type="button"
          onClick={onMenuToggle}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.06] active:bg-white/[0.1] transition-all lg:hidden shrink-0"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen ?? false}
        >
          <AnimatePresence initial={false} mode="wait">
            {mobileOpen ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}
      <div className="flex-1 min-w-0 relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl transition-all duration-300",
            searchFocused ? "search-bar-focused" : "search-bar-idle"
          )}
        >
          <div className="flex items-center gap-1.5 pl-3.5 text-vivid-blue shrink-0">
            <Sparkles
              className={cn(
                "w-4 h-4 transition-transform duration-300",
                searchFocused && "scale-110"
              )}
            />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder={searchSuggestions[placeholderIdx]}
            className="flex-1 min-w-0 py-2.5 bg-transparent text-sm text-white placeholder:text-white/25 border-none"
            aria-label="Search the KEVAL SOUND catalog"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1.5 text-muted/40 hover:text-white transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {query && (
            <button
              type="button"
              onClick={handleOptimize}
              disabled={optimizing}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all shrink-0",
                optimizing
                  ? "bg-dandelion/20 text-dandelion/60 cursor-wait"
                  : "bg-dandelion/10 text-dandelion hover:bg-dandelion/20 active:scale-95"
              )}
              title="Optimize query for better search results"
            >
              <Wand2 className={cn("w-3 h-3", optimizing && "animate-spin")} />
              <span className="hidden md:inline">{optimizing ? "Optimizing..." : "Optimize"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1.5 mr-1.5 px-3 py-1.5 rounded-lg bg-vivid-blue/20 text-vivid-blue text-xs font-medium hover:bg-vivid-blue/30 active:scale-95 transition-all shrink-0"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence>
          {searchFocused && !query && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1.5 search-dropdown rounded-xl z-50 overflow-hidden"
            >
              <div className="p-2">
                <p className="px-3 py-1.5 text-[10px] text-white/30 font-medium uppercase tracking-wider">
                  Try natural language search
                </p>
                {searchSuggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={() => setQuery(suggestion)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <ArrowRight className="w-3 h-3 shrink-0 text-vivid-blue" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="ml-auto flex items-center justify-end gap-2.5 shrink-0">
        <div className="relative" ref={supportRef}>
          <button
            type="button"
            onClick={() => {
              setSupportOpen((prev) => !prev);
              setUserOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.05] transition-all"
            title="Support"
            aria-label="Open support menu"
            aria-expanded={supportOpen}
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
          <AnimatePresence>
            {supportOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-72 search-dropdown rounded-xl overflow-hidden z-50"
              >
                <div className="p-2">
                  <p className="px-3 py-1.5 text-[10px] text-white/30 font-medium uppercase tracking-wider">
                    Support & Help
                  </p>
                  {supportItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setSupportOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-vivid-blue/10 transition-colors">
                        <item.icon className="w-4 h-4 text-muted group-hover:text-vivid-blue transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm text-white/80 font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted/60">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          href="/account?tab=wishlist"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.05] transition-all"
          aria-label="Open wishlist"
        >
          <Heart className="w-[18px] h-[18px]" />
          {wishlistCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-grey-magenta text-white text-[8px] font-bold flex items-center justify-center">
              {wishlistCount}
            </span>
          )}
        </Link>

        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.05] transition-all"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-[18px] h-[18px]" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-zesty-red text-white text-[8px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setUserOpen((prev) => !prev);
              setSupportOpen(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-all h-10"
            aria-label="Open account menu"
            aria-expanded={userOpen}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vivid-blue to-mid-purple flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-vivid-blue/30">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden md:inline text-xs text-muted font-medium max-w-[84px] truncate">
              {user?.name}
            </span>
            <ChevronDown
              className={cn(
                "w-3 h-3 text-muted/50 hidden md:block transition-transform",
                userOpen && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {userOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-1.5 w-72 search-dropdown rounded-2xl overflow-hidden z-50 shadow-2xl shadow-black/40"
              >
                <div className="px-4 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vivid-blue to-mid-purple flex items-center justify-center text-base font-bold text-white shrink-0 ring-2 ring-vivid-blue/30">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-muted truncate">{user?.email}</p>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-vivid-blue/10 text-vivid-blue text-[9px] font-bold uppercase">
                    <BadgeCheck className="w-3 h-3" />
                    Pro
                  </div>
                </div>

                <div className="p-2 max-h-[50vh] overflow-y-auto">
                  <p className="px-3 py-1.5 text-[9px] text-white/25 font-semibold uppercase tracking-wider">
                    Account
                  </p>
                  {accountItems.map(({ href, icon: Icon, label, desc }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-vivid-blue/10 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-muted/60 group-hover:text-vivid-blue transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/80">{label}</p>
                        <p className="text-[10px] text-muted/40">{desc}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}

                  <p className="px-3 py-1.5 mt-2 text-[9px] text-white/25 font-semibold uppercase tracking-wider border-t border-white/[0.04] pt-3">
                    Support
                  </p>
                  {supportLinks.map(({ href, icon: Icon, label, desc }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left hover:bg-white/[0.05] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-vivid-blue/10 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-muted/60 group-hover:text-vivid-blue transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/80">{label}</p>
                        <p className="text-[10px] text-muted/40">{desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted/30">
                    <Link href="/account?tab=legal" onClick={() => setUserOpen(false)} className="hover:text-muted/60 transition-colors">
                      Privacy
                    </Link>
                    <Link href="/account?tab=legal" onClick={() => setUserOpen(false)} className="hover:text-muted/60 transition-colors">
                      Terms
                    </Link>
                    <Link href="/account?tab=licensing" onClick={() => setUserOpen(false)} className="hover:text-muted/60 transition-colors">
                      Licenses
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zesty-red hover:bg-zesty-red/10 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
