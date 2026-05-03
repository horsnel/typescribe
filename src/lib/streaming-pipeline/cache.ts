/**
 * Streaming Pipeline Cache — Separate from the main pipeline cache.
 *
 * Memory-first with optional file fallback at `data/streaming-cache/`.
 * Uses LRU eviction when exceeding MAX_ENTRIES.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { StreamingCacheEntry } from './types';

// ─── Configuration ───────────────────────────────────────────────────────────

const CACHE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'streaming-cache')
  : path.join(process.cwd(), 'data', 'streaming-cache');

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 200;

// ─── Detect if filesystem is writable ────────────────────────────────────────

let fsAvailable = true;
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const testFile = path.join(CACHE_DIR, '.write-test');
  fs.writeFileSync(testFile, '1');
  fs.unlinkSync(testFile);
} catch {
  fsAvailable = false;
}

// ─── Internal State ─────────────────────────────────────────────────────────

const cache = new Map<string, StreamingCacheEntry>();
let hitCount = 0;
let missCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cacheFilePath(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${sanitized}.json`);
}

function isExpired(entry: StreamingCacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

/**
 * Evict the oldest entries when cache exceeds MAX_ENTRIES (LRU-style).
 */
function evictIfNeeded(): void {
  if (cache.size <= MAX_ENTRIES) return;

  // Delete oldest 20% of entries (Map preserves insertion order)
  const deleteCount = Math.floor(cache.size * 0.2);
  let deleted = 0;
  for (const key of cache.keys()) {
    if (deleted >= deleteCount) break;
    cache.delete(key);
    deleted++;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get a cached value by key. Returns null on miss or if expired.
 */
export function getCached<T>(key: string): T | null {
  // Try memory cache first
  const memEntry = cache.get(key);
  if (memEntry) {
    if (isExpired(memEntry)) {
      cache.delete(key);
      missCount++;
      return null;
    }
    hitCount++;
    return memEntry.data as T;
  }

  // Try file cache if available
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const entry: StreamingCacheEntry = JSON.parse(raw);
        if (isExpired(entry)) {
          fs.unlinkSync(filePath);
          missCount++;
          return null;
        }
        // Promote to memory cache
        cache.set(key, entry);
        hitCount++;
        return entry.data as T;
      } catch {
        missCount++;
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        return null;
      }
    }
  }

  missCount++;
  return null;
}

/**
 * Cache a value with an optional TTL (defaults to 24 hours).
 */
export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  const entry: StreamingCacheEntry = {
    key,
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  // Set in memory
  cache.set(key, entry);
  evictIfNeeded();

  // Also write to file if available
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(cacheFilePath(key), JSON.stringify(entry, null, 2));
    } catch {
      // Silently ignore file write failures
    }
  }
}

/**
 * Remove a specific cached entry.
 */
export function invalidateCached(key: string): void {
  cache.delete(key);
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }
}

/**
 * Clear all cached entries.
 */
export function clearAllCached(): number {
  const memCount = cache.size;
  cache.clear();

  let fileCount = 0;
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) return memCount;
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try { fs.unlinkSync(path.join(CACHE_DIR, file)); fileCount++; } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  return Math.max(memCount, fileCount);
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { size: number; hitRate: number } {
  const total = hitCount + missCount;
  return {
    size: cache.size,
    hitRate: total > 0 ? hitCount / total : 0,
  };
}
