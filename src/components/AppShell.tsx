"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Navbar from "./Navbar";
import Footer from "./Footer";

const SIDEBAR_COLLAPSED_KEY = "keval-sidebar-collapsed";

interface AppShellProps {
  children: ReactNode;
}

function ShellLoading() {
  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="hidden rounded-3xl border border-white/[0.05] bg-white/[0.02] p-4 lg:block">
            <div className="skeleton mb-4 h-10 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="skeleton h-11 rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-72 rounded-3xl" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="skeleton h-56 rounded-3xl" />
              <div className="skeleton h-56 rounded-3xl" />
            </div>
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="space-y-6" aria-label="Loading section">
      <div className="skeleton h-14 rounded-2xl" />
      <div className="skeleton h-72 rounded-3xl" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-64 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, isReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === "/auth";

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Lazy initializer reads localStorage once at mount — avoids the
  // setState-in-effect lint rule and prevents a width-flash on first paint.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // One hamburger button handles both behaviors: collapse the persistent
  // sidebar on lg+ viewports, slide-in/out the drawer on smaller ones.
  const handleMenuToggle = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
        } catch {}
        return next;
      });
    } else {
      setMobileSidebarOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && !isAuthPage) {
      router.replace("/auth");
      return;
    }

    if (isAuthenticated && isAuthPage) {
      router.replace("/");
    }
  }, [isAuthPage, isAuthenticated, isReady, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const routes = ["/", "/explore", "/packs", "/samples", "/cart", "/account?tab=wishlist"];
    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [isAuthenticated, isReady, router]);

  if (!isReady) {
    return isAuthPage ? (
      <>
        <Navbar />
        <main className="flex-1 pt-[72px]">{children}</main>
      </>
    ) : (
      <ShellLoading />
    );
  }

  if (!isAuthenticated) {
    if (!isAuthPage) {
      return <ShellLoading />;
    }

    return (
      <>
        <Navbar />
        <main className="flex-1 pt-[72px]">{children}</main>
      </>
    );
  }

  if (isAuthPage) {
    return <ShellLoading />;
  }

  return (
    <>
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
        collapsed={sidebarCollapsed}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[248px]"
        )}
      >
        <TopBar onMenuToggle={handleMenuToggle} sidebarCollapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} />
        <AnimatePresence mode="sync" initial={false}>
          <motion.main
            key={pathname}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 px-6 py-6 pb-8 will-change-transform"
          >
            <Suspense fallback={<RouteLoading />}>{children}</Suspense>
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
    </>
  );
}
