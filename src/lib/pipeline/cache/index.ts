/**
 * Pipeline Cache — File-based cache for merged movie data.
 *
 * Stores fully-merged movie objects on disk so that:
 *   - Repeated page loads don't re-fetch from APIs
 *   - Batch-processed data persists across server restarts
 *   - Admin can inspect/flush cached data
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Movie } from '@/lib/types';

// ─── Configuration ───

const CACHE_DIR = path.join(process.cwd(), 'data', 'pipeline');
const DEFAULT_TTL_HOURS = 24;

// ─── Types ───

interface CacheEntry {
  key: string;
  movie: Movie;
  sources: string[];
  completeness: number;
  createdAt: string;
  expiresAt: string;
  hitCount: number;
}

interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitRate: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  avgCompleteness: number;
}

// ─── Internal State ───

let hitCount = 0;
let missCount = 0;

// ─── Helpers ───

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheFilePath(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${sanitized}.json`);
}

// ─── Public API ───

/**
 * Get a cached movie by key (usually `tmdb:{id}` or `slug:{slug}`).
 */
export function getCachedMovie(key: string): { movie: Movie; sources: string[]; completeness: number } | null {
  ensureCacheDir();
  const filePath = cacheFilePath(key);

  if (!fs.existsSync(filePath)) {
    missCount++;
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);

    // Check expiry
    if (Date.now() > new Date(entry.expiresAt).getTime()) {
      fs.unlinkSync(filePath);
      missCount++;
      return null;
    }

    // Update hit count
    entry.hitCount++;
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));

    hitCount++;
    return {
      movie: entry.movie,
      sources: entry.sources,
      completeness: entry.completeness,
    };
  } catch {
    missCount++;
    // Corrupted file — remove it
    try { fs.unlinkSync(filePath); } catch {}
    return null;
  }
}

/**
 * Cache a merged movie result.
 */
export function setCachedMovie(
  key: string,
  movie: Movie,
  sources: string[],
  completeness: number,
  ttlHours: number = DEFAULT_TTL_HOURS,
): void {
  ensureCacheDir();

  const entry: CacheEntry = {
    key,
    movie,
    sources,
    completeness,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
    hitCount: 0,
  };

  try {
    fs.writeFileSync(cacheFilePath(key), JSON.stringify(entry, null, 2));
  } catch (err) {
    console.warn('[Cache] Failed to write cache entry:', err);
  }
}

/**
 * Remove a specific cached movie.
 */
export function invalidateCachedMovie(key: string): boolean {
  const filePath = cacheFilePath(key);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch { return false; }
  }
  return false;
}

/**
 * Clear all cached movies.
 */
export function clearAllCachedMovies(): number {
  ensureCacheDir();
  let count = 0;
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        count++;
      }
    }
  } catch {}
  return count;
}

/**
 * Remove expired cache entries.
 */
export function pruneCache(): number {
  ensureCacheDir();
  let pruned = 0;
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
          const entry: CacheEntry = JSON.parse(raw);
          if (now >= new Date(entry.expiresAt).getTime()) {
            fs.unlinkSync(path.join(CACHE_DIR, file));
            pruned++;
          }
        } catch {}
      }
    }
  } catch {}
  return pruned;
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): CacheStats {
  ensureCacheDir();

  let totalEntries = 0;
  let totalSizeBytes = 0;
  let oldestEntry: string | null = null;
  let newestEntry: string | null = null;
  let totalCompleteness = 0;

  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(CACHE_DIR, file);
          const stat = fs.statSync(filePath);
          totalSizeBytes += stat.size;

          const raw = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(raw);
          totalEntries++;
          totalCompleteness += entry.completeness;

          if (!oldestEntry || entry.createdAt < oldestEntry) {
            oldestEntry = entry.createdAt;
          }
          if (!newestEntry || entry.createdAt > newestEntry) {
            newestEntry = entry.createdAt;
          }
        } catch {}
      }
    }
  } catch {}

  const total = hitCount + missCount;
  return {
    totalEntries,
    totalSizeBytes,
    hitRate: total > 0 ? hitCount / total : 0,
    oldestEntry,
    newestEntry,
    avgCompleteness: totalEntries > 0 ? Math.round(totalCompleteness / totalEntries) : 0,
  };
}

/**
 * Get all cached movies (for listing in admin).
 */
export function getAllCachedMovies(): Array<{
  key: string;
  title: string;
  tmdbId: number;
  completeness: number;
  sources: string[];
  createdAt: string;
  expiresAt: string;
  hitCount: number;
}> {
  ensureCacheDir();
  const results: Array<{
    key: string;
    title: string;
    tmdbId: number;
    completeness: number;
    sources: string[];
    createdAt: string;
    expiresAt: string;
    hitCount: number;
  }> = [];

  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
          const entry: CacheEntry = JSON.parse(raw);
          results.push({
            key: entry.key,
            title: entry.movie.title,
            tmdbId: entry.movie.tmdb_id,
            completeness: entry.completeness,
            sources: entry.sources,
            createdAt: entry.createdAt,
            expiresAt: entry.expiresAt,
            hitCount: entry.hitCount,
          });
        } catch {}
      }
    }
  } catch {}

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
