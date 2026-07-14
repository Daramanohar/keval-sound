"use client";

import { useEffect, useRef } from "react";
import { usePlayerControls, usePlayerProgress } from "@/lib/player-context";

export default function MediaSessionManager() {
  const { currentItem, isPlaying, isPlaybackRequested, togglePlayback, nextTrack, previousTrack } = usePlayerControls();
  const { duration, currentTime, seekToTime, seekBy } = usePlayerProgress();
  const lastPositionUpdateRef = useRef(0);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentItem) return;
    const artworkUrl = currentItem.coverUrl?.startsWith("/")
      ? new URL(currentItem.coverUrl, window.location.origin).toString()
      : currentItem.coverUrl?.startsWith("http") ? currentItem.coverUrl : null;
    const artwork = artworkUrl ? [{ src: artworkUrl, sizes: "512x512" }] : undefined;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem.title,
      artist: currentItem.artist,
      album: currentItem.sourcePackTitle ?? currentItem.source ?? "Keval Sound",
      artwork,
    });

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => { if (!isPlaybackRequested) togglePlayback(); }],
      ["pause", () => { if (isPlaybackRequested) togglePlayback(); }],
      ["nexttrack", nextTrack],
      ["previoustrack", previousTrack],
      ["seekbackward", (details) => seekBy(-(details.seekOffset ?? 10))],
      ["seekforward", (details) => seekBy(details.seekOffset ?? 10)],
      ["seekto", (details) => {
        if (details.seekTime !== undefined) seekToTime(details.seekTime);
      }],
    ];
    handlers.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    });
    return () => {
      handlers.forEach(([action]) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      });
    };
  }, [currentItem, isPlaybackRequested, nextTrack, previousTrack, seekBy, seekToTime, togglePlayback]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = currentItem ? (isPlaying ? "playing" : "paused") : "none";
  }, [currentItem, isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration || !Number.isFinite(duration)) return;
    const now = performance.now();
    if (now - lastPositionUpdateRef.current < 750 && currentTime < duration) return;
    lastPositionUpdateRef.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {}
  }, [currentTime, duration]);

  return null;
}
