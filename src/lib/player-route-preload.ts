import { preloadProductionCatalog } from "./production-catalog-preload";

let playerPreloadPromise: Promise<unknown> | null = null;

export function preloadKevalPlayer() {
  playerPreloadPromise ??= import("@/components/KevalPlayer");
  return Promise.all([playerPreloadPromise, preloadProductionCatalog()]);
}
