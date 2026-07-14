/**
 * Streaming Pipeline Cache — Separate from the main pipeline cache.
 *
 * Architecture (3-tier, matches `src/lib/pipeline/cache/index.ts`):
 *   1. In-memory Map (per-instance, instant reads, lost on cold start)
 *   2. Supabase `streaming_cache` table (cross-instance, persists across cold
 *      starts — primary persistent backend on Vercel)
 *   3. Filesystem (/tmp/streaming-cache on Vercel, data/streaming-cache in dev)
 *      — local-dev durability only, lost on every Vercel cold start
 *
 * The Supabase backend is auto-enabled when SUPABASE_SERVICE_ROLE_KEY +
 * NEXT_PUBLIC_SUPABASE_URL env vars are present (always true on Vercel).
 * Falls back to memory + file only if Supabase is unreachable.
 *
 * Without tier 2, every Vercel cold start re-fetches the streaming catalog
 * from 14+ upstream sources even though another instance fetched the same
 * catalog 30 seconds ago.
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

// ─── Supabase backend (lazy-loaded to avoid build-time crash) ────────────────
//
// Same lazy-import pattern used by src/lib/pipeline/cache/index.ts. We defer
// the import so that build-time evaluation doesn't crash if env vars are
// missing during `next build`.

let supabaseAdmin: any = null;
let supabaseChecked = false;

async function getSupabase(): Promise<any | null> {
  if (supabaseChecked) return supabaseAdmin;
  supabaseChecked = true;
  try {
    const mod = await import('@/lib/supabase/admin');
    supabaseAdmin = (mod as any).supabaseAdmin ?? null;
  } catch {
    supabaseAdmin = null;
  }
  return supabaseAdmin;
}

async function supabaseGet(key: string): Promise<StreamingCacheEntry | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('streaming_cache')
      .select('value, expires_at')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return null;
    if (Date.now() > new Date(data.expires_at).getTime()) {
      // Expired — fire-and-forget delete
      sb.from('streaming_cache').delete().eq('key', key).then(() => {});
      return null;
    }
    const entry: StreamingCacheEntry = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return entry;
  } catch {
    return null;
  }
}

async function supabaseSet(key: string, entry: StreamingCacheEntry): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try {
    await sb
      .from('streaming_cache')
      .upsert({
        key,
        value: entry, // stored as jsonb
        expires_at: new Date(entry.expiresAt).toISOString(),
        created_at: new Date(entry.createdAt).toISOString(),
        hit_count: 0,
      }, { onConflict: 'key' });
  } catch {
    // Silently ignore — in-memory + file cache still work
  }
}

async function supabaseDelete(key: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try { await sb.from('streaming_cache').delete().eq('key', key); } catch {}
}

async function supabaseClearAll(): Promise<number> {
  const sb = await getSupabase();
  if (!sb) return 0;
  try {
    const { count } = await sb.from('streaming_cache').select('key', { count: 'exact', head: true });
    await sb.from('streaming_cache').delete().neq('key', '__never__');
    return count ?? 0;
  } catch { return 0; }
}

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
 * Note: only evicts from the in-memory tier; the Supabase tier is unbounded
 * (TTL-based expiration handles cleanup there).
 */
function evictIfNeeded(): void {
  if (cache.size <= MAX_ENTRIES) return;
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
 * Get a cached value by key.
 * Tier 1: in-memory → Tier 2: Supabase → Tier 3: filesystem
 * Returns null on miss or if expired.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  // ─── Tier 1: in-memory ───
  const memEntry = cache.get(key);
  if (memEntry) {
    if (isExpired(memEntry)) {
      cache.delete(key);
      missCount++;
      // Fall through to Supabase / file (don't return null yet)
    } else {
      hitCount++;
      return memEntry.data as T;
    }
  }

  // ─── Tier 2: Supabase ───
  const sbEntry = await supabaseGet(key);
  if (sbEntry) {
    // Promote to memory cache for subsequent reads
    cache.set(key, sbEntry);
    hitCount++;
    return sbEntry.data as T;
  }

  // ─── Tier 3: filesystem ───
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
        // Promote to memory + Supabase
        cache.set(key, entry);
        void supabaseSet(key, entry);
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
 * Writes to all available tiers (memory + Supabase + filesystem).
 */
export async function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): Promise<void> {
  const entry: StreamingCacheEntry = {
    key,
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  // Tier 1: memory
  cache.set(key, entry);
  evictIfNeeded();

  // Tier 2: Supabase (fire-and-forget; don't block the caller)
  void supabaseSet(key, entry);

  // Tier 3: filesystem
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
 * Remove a specific cached entry from all tiers.
 */
export async function invalidateCached(key: string): Promise<void> {
  cache.delete(key);
  await supabaseDelete(key);
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }
}

/**
 * Clear all cached entries from all tiers.
 * Returns the total count cleared (max of memory + supabase + file counts).
 */
export async function clearAllCached(): Promise<number> {
  const memCount = cache.size;
  cache.clear();

  const sbCount = await supabaseClearAll();

  let fileCount = 0;
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) return Math.max(memCount, sbCount);
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try { fs.unlinkSync(path.join(CACHE_DIR, file)); fileCount++; } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  return Math.max(memCount, sbCount, fileCount);
}

/**
 * Get cache statistics (in-memory tier only — Supabase tier stats require a
 * separate query and aren't included here to keep this synchronous).
 */
export function getCacheStats(): { size: number; hitRate: number } {
  const total = hitCount + missCount;
  return {
    size: cache.size,
    hitRate: total > 0 ? hitCount / total : 0,
  };
}
