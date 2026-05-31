type ProductionCatalogModule = typeof import("./production-catalog");

let productionCatalogPromise: Promise<ProductionCatalogModule> | null = null;

export function preloadProductionCatalog() {
  productionCatalogPromise ??= import("./production-catalog");
  return productionCatalogPromise;
}
