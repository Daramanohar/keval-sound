"use client";

import { useEffect, useMemo, useState } from "react";
import { packs as basePacks, tracks as baseTracks, type Pack, type Track } from "@/lib/mock-data";
import { preloadProductionCatalog } from "@/lib/production-catalog-preload";

function findBaseContext(id?: string): { track: Track | null; pack: Pack | null } {
  if (!id) return { track: null, pack: null };
  for (const pack of basePacks) {
    const track = pack.tracks.find((candidate) => candidate.id === id);
    if (track) return { track, pack };
  }
  return { track: baseTracks.find((candidate) => candidate.id === id) ?? null, pack: null };
}

export function useResolvedPlayerTrack(id?: string) {
  const base = useMemo(() => findBaseContext(id), [id]);
  const [production, setProduction] = useState<{
    id: string | null;
    track: Track | null;
    pack: Pack | null;
  }>({ id: null, track: null, pack: null });

  useEffect(() => {
    if (!id || base.track) return;
    let cancelled = false;
    preloadProductionCatalog().then(({ productionPacks }) => {
      if (cancelled) return;
      for (const pack of productionPacks) {
        const track = pack.tracks.find((candidate) => candidate.id === id);
        if (track) {
          setProduction({ id, track, pack });
          return;
        }
      }
      setProduction({ id, track: null, pack: null });
    }).catch(() => {
      if (!cancelled) setProduction({ id, track: null, pack: null });
    });
    return () => { cancelled = true; };
  }, [base.track, id]);

  const resolved = production.id === id ? production : null;
  return {
    track: base.track ?? resolved?.track ?? null,
    pack: base.pack ?? resolved?.pack ?? null,
  };
}
