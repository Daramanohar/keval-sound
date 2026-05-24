let playerPreloadPromise: Promise<unknown> | null = null;
let playerCatalogPreloadPromise: Promise<unknown> | null = null;

export function preloadKevalPlayer() {
  playerPreloadPromise ??= import("@/components/KevalPlayer");
  playerCatalogPreloadPromise ??= import("@/lib/production-catalog");
  return Promise.all([playerPreloadPromise, playerCatalogPreloadPromise]);
}
