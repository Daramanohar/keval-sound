"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Menu,
  X,
  LogIn,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import KevalLogo from "./KevalLogo";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Packs", href: "/packs" },
  { label: "Samples", href: "/samples" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const routes = [...navItems.map((item) => item.href), "/cart", "/account?tab=profile"];
    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [isAuthenticated, router]);

  const handleLogout = useCallback(() => {
    logout();
    setUserMenuOpen(false);
    startTransition(() => {
      router.replace("/auth");
    });
  }, [logout, router]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled ? "glass shadow-lg shadow-black/20" : "bg-transparent"
        )}
      >
        <nav className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" prefetch>
            <KevalLogo size="md" showTagline={true} />
          </Link>

          {/* Desktop Nav - only show full nav when authenticated */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                      isActive ? "text-white" : "text-muted hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-white/[0.08]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })
            ) : (
              <>
                <Link
                  href="/"
                  prefetch
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-white transition-colors rounded-lg"
                >
                  Home
                </Link>
                <Link
                  href="/auth"
                  prefetch
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-white transition-colors rounded-lg"
                >
                  Features
                </Link>
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Cart */}
                <Link
                  href="/cart"
                  prefetch
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      pathname === "/cart"
                      ? "bg-vivid-blue text-white"
                      : "glass-subtle text-muted hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Cart</span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zesty-red text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </Link>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl glass-subtle text-sm font-medium text-muted hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vivid-blue to-mid-purple flex items-center justify-center text-[10px] font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline max-w-[80px] truncate">
                      {user?.name}
                    </span>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 search-dropdown rounded-xl overflow-hidden"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 border-b border-border mb-1">
                            <p className="text-xs font-medium text-white truncate">
                              {user?.name}
                            </p>
                            <p className="text-[10px] text-muted truncate">
                              {user?.email}
                            </p>
                          </div>
                          <Link
                            href="/account?tab=profile"
                            prefetch
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zesty-red hover:bg-zesty-red/10 transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  prefetch
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple text-white text-sm font-semibold hover:shadow-lg hover:shadow-vivid-blue/20 transition-all hover:-translate-y-0.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[72px] z-40 glass md:hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {(isAuthenticated ? navItems : [{ label: "Home", href: "/" }]).map(
                (item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-muted hover:text-white hover:bg-white/[0.05]"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                }
              )}
              {!isAuthenticated && (
                <Link
                  href="/auth"
                  prefetch
                  className="px-4 py-3 rounded-xl text-sm font-semibold text-vivid-blue hover:bg-vivid-blue/10 transition-colors"
                >
                  Sign In / Sign Up
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
