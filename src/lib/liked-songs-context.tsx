"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { tracks, type Track } from "@/lib/mock-data";

type ApiLikedSong = {
  likedAt: string;
  track: {
    id: string;
    title: string;
    category: string;
    durationSeconds: number;
    hasMp3: boolean;
    tags: string[];
    saleStatus: string;
    owned: boolean;
    pricePaise: number;
    currency: string;
    pack: {
      id: string;
      title: string;
      category: string;
      coverUrl: string | null;
    };
  };
};

type ApiResponse = {
  likedSongs?: ApiLikedSong[];
  message?: string;
};

export type LikedSong = {
  track: Track;
  likedAt: string;
  packId: string | null;
  packTitle: string;
  saleStatus: string;
  owned: boolean;
};

type LikedSongsContextValue = {
  likedSongs: LikedSong[];
  likedCount: number;
  isLoading: boolean;
  error: string | null;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => Promise<void>;
  removeLike: (track: Track) => Promise<void>;
  refresh: () => Promise<void>;
};

const catalogById = new Map(tracks.map((track) => [track.id, track]));
const LikedSongsContext = createContext<LikedSongsContextValue | null>(null);

function fallbackWaveform() {
  return Array.from({ length: 50 }, (_, index) => 0.28 + ((index * 17) % 33) / 100);
}

function toLikedSong(item: ApiLikedSong): LikedSong {
  const source = catalogById.get(item.track.id);
  const track: Track = source ?? {
    id: item.track.id,
    title: item.track.title,
    artist: "Keval Sound",
    audioUrl: item.track.hasMp3
      ? `/api/media/stream/mp3/${encodeURIComponent(item.track.id)}`
      : undefined,
    genre: item.track.category,
    mood: item.track.category,
    bpm: 0,
    key: "-",
    duration: item.track.durationSeconds,
    price: item.track.pricePaise / 100,
    coverUrl: item.track.pack.coverUrl || "from-zesty-red to-mid-purple",
    waveform: fallbackWaveform(),
    tags: item.track.tags,
    isExclusive: true,
    isTrending: false,
    isSellingFast: false,
    region: item.track.pack.category,
    language: "Instrumental",
    stems: false,
    plays: 0,
  };

  return {
    track,
    likedAt: item.likedAt,
    packId: item.track.pack.id,
    packTitle: item.track.pack.title,
    saleStatus: item.track.saleStatus,
    owned: item.track.owned,
  };
}

function readLegacyLikedTrackIds(email: string) {
  try {
    const raw = window.localStorage.getItem(`keval-store:${email.toLowerCase()}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      wishlist?: Array<{ id?: unknown; type?: unknown }>;
    };
    return Array.from(
      new Set(
        (parsed.wishlist ?? [])
          .filter((item) => item.type === "track" && typeof item.id === "string")
          .map((item) => item.id as string)
      )
    );
  } catch {
    return [];
  }
}

async function updateLike(trackId: string, liked: boolean, signal?: AbortSignal) {
  const response = await fetch("/api/account/liked-songs", {
    method: "PUT",
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, liked }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(body.message || "Your liked songs could not be updated.");
  }
}

export function LikedSongsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingTrackIds = useRef(new Set<string>());

  const loadLikedSongs = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/account/liked-songs", {
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: { Accept: "application/json" },
    });
    const body = (await response.json().catch(() => ({}))) as ApiResponse;
    if (!response.ok) {
      throw new Error(body.message || "Liked Songs is temporarily unavailable.");
    }
    const next = (body.likedSongs ?? []).map(toLikedSong);
    setLikedSongs(next);
    return next;
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !user?.email) {
      setLikedSongs([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const serverLikes = await loadLikedSongs(controller.signal);
        const serverIds = new Set(serverLikes.map((item) => item.track.id));
        const migrationKey = `keval-liked-songs-migrated-v1:${user.email.toLowerCase()}`;
        const legacyIds = window.localStorage.getItem(migrationKey)
          ? []
          : readLegacyLikedTrackIds(user.email).filter((trackId) => !serverIds.has(trackId));

        if (legacyIds.length) {
          await Promise.all(
            legacyIds.map((trackId) => updateLike(trackId, true, controller.signal))
          );
          await loadLikedSongs(controller.signal);
        }
        window.localStorage.setItem(migrationKey, new Date().toISOString());
      } catch (failure) {
        if (failure instanceof DOMException && failure.name === "AbortError") return;
        setError(failure instanceof Error ? failure.message : "Liked Songs is unavailable.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isAuthenticated, isReady, loadLikedSongs, user?.email]);

  const likedIds = useMemo(
    () => new Set(likedSongs.map((item) => item.track.id)),
    [likedSongs]
  );

  const setLike = useCallback(async (track: Track, liked: boolean) => {
    if (pendingTrackIds.current.has(track.id)) return;
    pendingTrackIds.current.add(track.id);
    setError(null);

    const previous = likedSongs;
    const optimistic: LikedSong = {
      track,
      likedAt: new Date().toISOString(),
      packId: null,
      packTitle: track.genre,
      saleStatus: "AVAILABLE",
      owned: false,
    };
    setLikedSongs((current) =>
      liked
        ? [optimistic, ...current.filter((item) => item.track.id !== track.id)]
        : current.filter((item) => item.track.id !== track.id)
    );

    try {
      await updateLike(track.id, liked);
      await loadLikedSongs();
    } catch (failure) {
      setLikedSongs(previous);
      setError(failure instanceof Error ? failure.message : "Your liked songs could not be updated.");
    } finally {
      pendingTrackIds.current.delete(track.id);
    }
  }, [likedSongs, loadLikedSongs]);

  const value = useMemo<LikedSongsContextValue>(() => ({
    likedSongs,
    likedCount: likedSongs.length,
    isLoading,
    error,
    isLiked: (trackId) => likedIds.has(trackId),
    toggleLike: async (track) => setLike(track, !likedIds.has(track.id)),
    removeLike: async (track) => setLike(track, false),
    refresh: async () => {
      setError(null);
      await loadLikedSongs();
    },
  }), [error, isLoading, likedIds, likedSongs, loadLikedSongs, setLike]);

  return <LikedSongsContext.Provider value={value}>{children}</LikedSongsContext.Provider>;
}

export function useLikedSongs() {
  const context = useContext(LikedSongsContext);
  if (!context) {
    throw new Error("useLikedSongs must be used within a LikedSongsProvider");
  }
  return context;
}
