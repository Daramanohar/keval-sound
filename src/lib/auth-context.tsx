"use client";

/**
 * Auth bridge: maps Clerk's `useUser()` + `useClerk()` onto the legacy
 * `useAuth()` API that the rest of the app already consumes.
 *
 * Why a bridge instead of replacing every call site?
 *   - TopBar, Sidebar, AppShell, page.tsx, store-context, player-context and
 *     several pages all import `useAuth`. Touching them all in one commit
 *     would balloon the diff and risk regressions in unrelated UI.
 *   - The bridge keeps the same shape (`user`, `isAuthenticated`, `isReady`,
 *     `logout`, ...) so consumers do not need to change.
 *
 * The legacy mutators (`login`, `register`, `loginWithGoogle`) are now
 * no-ops that route the visitor to the Clerk-hosted sign-in flow. The
 * old `/auth` page redirects to `/sign-in` for the same reason.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => User | null;
  register: (name: string, email: string, password: string) => User | null;
  loginWithGoogle: () => User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const user = useMemo<User | null>(() => {
    if (!clerkUser) return null;

    const fallbackEmailHandle =
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
    const joinedName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ");
    const name =
      clerkUser.fullName ||
      joinedName ||
      clerkUser.username ||
      fallbackEmailHandle ||
      "Keval Listener";

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const avatar = clerkUser.imageUrl ?? undefined;

    return { name, email, avatar };
  }, [clerkUser]);

  const redirectToSignIn = useCallback(() => {
    router.push("/sign-in");
    return null;
  }, [router]);

  const logout = useCallback(() => {
    void signOut(() => {
      router.replace("/");
    });
  }, [router, signOut]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(isSignedIn),
      isReady: isLoaded,
      login: redirectToSignIn,
      register: redirectToSignIn,
      loginWithGoogle: redirectToSignIn,
      logout,
    }),
    [isLoaded, isSignedIn, logout, redirectToSignIn, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
