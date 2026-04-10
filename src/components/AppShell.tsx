"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
      <Sidebar />
      <div className="flex min-h-screen flex-col transition-all duration-300 lg:pl-[248px]">
        <TopBar />
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
