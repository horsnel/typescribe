/**
 * Pipeline Cache — Hybrid in-memory + file-based cache for merged movie data.
 *
 * On Vercel (read-only filesystem), uses in-memory Map only.
 * In development/local, also persists to disk for durability.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Movie } from '@/lib/types';

// ─── Configuration ───

const CACHE_DIR = path.join(process.cwd(), 'data', 'pipeline');
const DEFAULT_TTL_HOURS = 24;

// ─── Detect if filesystem is writable ───

let fsAvailable = true;
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  // Test write
  const testFile = path.join(CACHE_DIR, '.write-test');
  fs.writeFileSync(testFile, '1');
  fs.unlinkSync(testFile);
} catch {
  fsAvailable = false;
}

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

// In-memory cache (always available)
const memoryCache = new Map<string, CacheEntry>();

// ─── Helpers ───

function cacheFilePath(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${sanitized}.json`);
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > new Date(entry.expiresAt).getTime();
}

// ─── Public API ───

/**
 * Get a cached movie by key (usually `tmdb:{id}` or `slug:{slug}`).
 */
export function getCachedMovie(key: string): { movie: Movie; sources: string[]; completeness: number } | null {
  // Try memory cache first
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (isExpired(memEntry)) {
      memoryCache.delete(key);
      missCount++;
      return null;
    }
    memEntry.hitCount++;
    hitCount++;
    return {
      movie: memEntry.movie,
      sources: memEntry.sources,
      completeness: memEntry.completeness,
    };
  }

  // Try file cache if available
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(raw);
        if (isExpired(entry)) {
          fs.unlinkSync(filePath);
          missCount++;
          return null;
        }
        entry.hitCount++;
        try { fs.writeFileSync(filePath, JSON.stringify(entry, null, 2)); } catch {}
        // Promote to memory cache
        memoryCache.set(key, entry);
        hitCount++;
        return {
          movie: entry.movie,
          sources: entry.sources,
          completeness: entry.completeness,
        };
      } catch {
        missCount++;
        try { fs.unlinkSync(filePath); } catch {}
        return null;
      }
    }
  }

  missCount++;
  return null;
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
  const entry: CacheEntry = {
    key,
    movie,
    sources,
    completeness,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
    hitCount: 0,
  };

  // Always set in memory
  memoryCache.set(key, entry);

  // Also write to file if available
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(cacheFilePath(key), JSON.stringify(entry, null, 2));
    } catch (err) {
      // Silently ignore file write failures (Vercel read-only)
    }
  }
}

/**
 * Remove a specific cached movie.
 */
export function invalidateCachedMovie(key: string): boolean {
  memoryCache.delete(key);
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); return true; } catch { return false; }
    }
  }
  return memoryCache.has(key);
}

/**
 * Clear all cached movies.
 */
export function clearAllCachedMovies(): number {
  const memCount = memoryCache.size;
  memoryCache.clear();
  let fileCount = 0;
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) return memCount;
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try { fs.unlinkSync(path.join(CACHE_DIR, file)); fileCount++; } catch {}
        }
      }
    } catch {}
  }
  return Math.max(memCount, fileCount);
}

/**
 * Remove expired cache entries.
 */
export function pruneCache(): number {
  let pruned = 0;
  // Prune memory cache
  for (const [key, entry] of memoryCache.entries()) {
    if (isExpired(entry)) {
      memoryCache.delete(key);
      pruned++;
    }
  }
  // Prune file cache
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) return pruned;
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
  }
  return pruned;
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): CacheStats {
  const entries: CacheEntry[] = [];

  // Collect from memory
  for (const entry of memoryCache.values()) {
    entries.push(entry);
  }

  // Collect from files if available
  if (fsAvailable) {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
              entries.push(JSON.parse(raw));
            } catch {}
          }
        }
      }
    } catch {}
  }

  // Deduplicate by key
  const seen = new Set<string>();
  const unique: CacheEntry[] = [];
  for (const e of entries) {
    if (!seen.has(e.key)) {
      seen.add(e.key);
      unique.push(e);
    }
  }

  const total = hitCount + missCount;
  return {
    totalEntries: unique.length,
    totalSizeBytes: 0,
    hitRate: total > 0 ? hitCount / total : 0,
    oldestEntry: unique.length > 0 ? unique.reduce((a, b) => a.createdAt < b.createdAt ? a : b).createdAt : null,
    newestEntry: unique.length > 0 ? unique.reduce((a, b) => a.createdAt > b.createdAt ? a : b).createdAt : null,
    avgCompleteness: unique.length > 0 ? Math.round(unique.reduce((s, e) => s + e.completeness, 0) / unique.length) : 0,
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

  const seen = new Set<string>();

  // From memory
  for (const entry of memoryCache.values()) {
    if (!seen.has(entry.key)) {
      seen.add(entry.key);
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
    }
  }

  // From files
  if (fsAvailable) {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
              const entry: CacheEntry = JSON.parse(raw);
              if (!seen.has(entry.key)) {
                seen.add(entry.key);
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
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
