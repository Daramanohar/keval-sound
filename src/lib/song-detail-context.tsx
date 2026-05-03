"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Pack, Track } from "./mock-data";

interface OpenedSong {
  track: Track;
  pack: Pack | null;
}

interface SongDetailContextType {
  opened: OpenedSong | null;
  isOpen: boolean;
  openSong: (track: Track, pack: Pack | null) => void;
  close: () => void;
}

const Ctx = createContext<SongDetailContextType | null>(null);

export function SongDetailProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<OpenedSong | null>(null);

  const openSong = useCallback((track: Track, pack: Pack | null) => {
    setOpened({ track, pack });
  }, []);

  const close = useCallback(() => setOpened(null), []);

  const value = useMemo<SongDetailContextType>(
    () => ({ opened, isOpen: opened !== null, openSong, close }),
    [opened, openSong, close]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSongDetail() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useSongDetail must be used within SongDetailProvider");
  }
  return ctx;
}
