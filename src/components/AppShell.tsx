"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Routes that render their own full-bleed layout and must NOT be wrapped
// in the authenticated sidebar/topbar shell.
const BARE_ROUTE_PREFIXES = ["/sign-in", "/sign-up", "/auth"];
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

  const isBareRoute = BARE_ROUTE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

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

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  // Desktop-only: collapses/expands the persistent sidebar.
  // Driven by the hamburger button inside Sidebar's header (YouTube Music pattern).
  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  // Auth redirects are now handled by Clerk's proxy.ts. AppShell only
  // decides which chrome to render based on the current path + auth state.

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const routes = ["/", "/player", "/explore", "/packs", "/samples", "/cart", "/account?tab=wishlist"];
    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [isAuthenticated, isReady, router]);

  // Sign-in / sign-up pages render bare (no sidebar, no topbar). They have
  // their own branded layout.
  if (isBareRoute) {
    return <main className="flex-1">{children}</main>;
  }

  if (!isReady) {
    return <ShellLoading />;
  }

  // Unauthenticated visitor on a public route (e.g. `/` landing). Show the
  // marketing Navbar instead of the authenticated sidebar shell.
  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-[72px]">{children}</main>
      </>
    );
  }

  return (
    <>
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[248px]"
        )}
      >
        <TopBar onMenuToggle={toggleMobileSidebar} mobileOpen={mobileSidebarOpen} />
        <main className="flex-1 px-6 pt-3 pb-8">
          <Suspense fallback={<RouteLoading />}>{children}</Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}
