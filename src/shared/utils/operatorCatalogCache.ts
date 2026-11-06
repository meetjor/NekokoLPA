import {catalogCache} from '@/shared/storage';
import {OperatorEntry, catalogUrl, parseOperatorCatalog} from './operatorCatalog';
/** How long a country's catalog is used before it is fetched again. */
const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Catalog = Record<string, OperatorEntry>;

/** Catalogs already read this session, keyed by MCC. */
const loaded = new Map<string, {catalog: Catalog; fetchedAt: number}>();
const listeners = new Set<(mcc: string, catalog: Catalog) => void>();

/** Fetches in progress, so twenty rows of one country make one request. */
const inFlight = new Map<string, Promise<Catalog>>();

function cacheKey(mcc: string): string {
  return `catalog:${mcc}`;
}

function readCache(mcc: string): {catalog: Catalog; fetchedAt: number} | null {
  const raw = catalogCache.getString(cacheKey(mcc));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return {catalog: parsed.catalog ?? {}, fetchedAt: parsed.fetchedAt ?? 0};
  } catch {
    return null;
  }
}

/**
 * Downloads one country's catalog and caches it.
 *
 * A country with no catalog file is cached as an empty one: without that, the
 * lookup for a profile the catalog does not cover would go out to the network
 * again on every render.
 */
async function fetchCatalog(mcc: string): Promise<Catalog> {
  const pending = inFlight.get(mcc);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let catalog: Catalog;
      try {
        const response = await fetch(catalogUrl(mcc), {signal: controller.signal});
        if (!response.ok && response.status !== 404) throw new Error('Catalog unavailable');
        catalog = response.ok ? parseOperatorCatalog(await response.text()) : {};
      } finally { clearTimeout(timeout); }
      const entry = {catalog, fetchedAt: Date.now()};
      catalogCache.set(cacheKey(mcc), JSON.stringify(entry));
      loaded.set(mcc, entry);
      listeners.forEach(listener => listener(mcc, catalog));
      return catalog;
    } catch {
      // Preserve a previous catalog. Offline failures must not become a cached
      // empty success; the next lookup/foreground transition can retry.
      return loaded.get(mcc)?.catalog ?? readCache(mcc)?.catalog ?? {};
    } finally {
      inFlight.delete(mcc);
    }
  })();

  inFlight.set(mcc, request);
  return request;
}

/** Serves the catalog from memory or cache, refreshing a stale one behind it. */
export async function catalogFor(mcc: string): Promise<Catalog> {
  const cached = loaded.get(mcc) ?? readCache(mcc);
  if (cached) {
    loaded.set(mcc, cached);
    if (Date.now() - cached.fetchedAt > CATALOG_TTL_MS) void fetchCatalog(mcc);
    return cached.catalog;
  }

  return fetchCatalog(mcc);
}

export function subscribeCatalog(listener: (mcc: string, catalog: Catalog) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
