  "use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_STORAGE_KEY = "keval-user";

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => User;
  register: (name: string, email: string, password: string) => User;
  loginWithGoogle: () => User;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const savedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setUser(readStoredUser());
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== AUTH_STORAGE_KEY) return;
      setUser(readStoredUser());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const commitUser = useCallback((nextUser: User) => {
    writeStoredUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      void password;

      return commitUser({
        name: email.split("@")[0].replace(/[._-]+/g, " ") || "Keval Listener",
        email,
      });
    },
    [commitUser]
  );

  const register = useCallback(
    (name: string, email: string, password: string) => {
      void password;

      return commitUser({
        name: name.trim() || email.split("@")[0] || "Keval Listener",
        email,
      });
    },
    [commitUser]
  );

  const loginWithGoogle = useCallback(() => {
    return commitUser({
      name: "Music Creator",
      email: "creator@gmail.com",
      avatar: "/logo/keval-logo.png",
    });
  }, [commitUser]);

  const logout = useCallback(() => {
    writeStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      login,
      register,
      loginWithGoogle,
      logout,
    }),
    [isReady, login, loginWithGoogle, logout, register, user]
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
