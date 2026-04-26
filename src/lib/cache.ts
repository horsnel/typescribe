/**
 * Cache system for O.L.H.M.E.S
 * In-memory cache with TTL support and category-based defaults
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export type CacheCategory = 'movie' | 'anime' | 'news' | 'streaming' | 'general';

export interface CacheOptions {
  ttl?: number;          // Custom TTL in milliseconds
  category?: CacheCategory; // Category-based default TTL
}

// ─── Category Default TTLs (in milliseconds) ────────────────────────────────

const CATEGORY_TTL: Record<CacheCategory, number> = {
  movie: 30 * 60 * 1000,     // 30 minutes
  anime: 10 * 60 * 1000,     // 10 minutes
  news: 60 * 60 * 1000,      // 60 minutes
  streaming: 30 * 60 * 1000, // 30 minutes
  general: 15 * 60 * 1000,   // 15 minutes
};

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const memoryCache = new Map<string, CacheEntry<unknown>>();

// ─── Cleanup Interval ────────────────────────────────────────────────────────

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Periodically clean up expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// ─── Helper: Resolve TTL ─────────────────────────────────────────────────────

function resolveTTL(options?: CacheOptions): number {
  if (options?.ttl && options.ttl > 0) {
    return options.ttl;
  }
  return CATEGORY_TTL[options?.category ?? 'general'];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retrieve a value from cache.
 * Returns `null` if the key doesn't exist or has expired.
 */
export function get<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (now >= entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Store a value in cache with optional TTL / category.
 */
export function set<T>(key: string, data: T, options?: CacheOptions): void {
  const ttl = resolveTTL(options);
  const now = Date.now();

  memoryCache.set(key, {
    data,
    expiresAt: now + ttl,
    createdAt: now,
  });
}

/**
 * Check whether a key exists and is not expired.
 */
export function has(key: string): boolean {
  return get(key) !== null;
}

/**
 * Remove a specific key from cache.
 */
export function invalidate(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * Remove all keys matching a prefix.
 * Useful for invalidating all entries of a certain type, e.g. `invalidatePrefix('tmdb:')`.
 */
export function invalidatePrefix(prefix: string): number {
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Clear the entire cache.
 */
export function clear(): void {
  memoryCache.clear();
}

/**
 * Get current cache size (including potentially expired entries).
 */
export function size(): number {
  return memoryCache.size;
}

/**
 * Get remaining TTL for a key in milliseconds.
 * Returns 0 if the key doesn't exist or has expired.
 */
export function getRemainingTTL(key: string): number {
  const entry = memoryCache.get(key);
  if (!entry) return 0;

  const remaining = entry.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Higher-order function: wrap an async function with caching.
 * If a cached value exists and is fresh, returns it immediately.
 * Otherwise calls the fetcher, caches the result, and returns it.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  set(key, data, options);
  return data;
}
