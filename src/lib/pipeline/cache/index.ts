/**
 * Pipeline Cache — Hybrid cache for merged movie data.
 *
 * Architecture (3-tier):
 *   1. In-memory Map (per-instance, instant reads, lost on cold start)
 *   2. Supabase `pipeline_cache` table (cross-instance, persists across cold starts,
 *      shared between all serverless instances — primary persistent backend on Vercel)
 *   3. Filesystem (/tmp on Vercel, project/data in dev) — local-dev durability only
 *
 * On Vercel serverless, only tier 2 is shared across instances. Without it, every cold
 * start would re-scrape from upstream APIs even though another instance scraped the
 * same movie 30 seconds ago.
 *
 * The Supabase backend is auto-enabled when SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 * env vars are present (always true on Vercel). Falls back to in-memory + file only
 * if Supabase is unreachable.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Movie } from '@/lib/types';

// ─── Configuration ───

const CACHE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'pipeline-cache')
  : path.join(process.cwd(), 'data', 'pipeline');
const DEFAULT_TTL_HOURS = 24;

// ─── Detect if filesystem is writable ───

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

// In-memory cache (always available, per-instance)
const memoryCache = new Map<string, CacheEntry>();

// ─── Supabase backend (lazy-loaded to avoid build-time crash) ───

let supabaseAdmin: any = null;
let supabaseChecked = false;

async function getSupabase(): Promise<any | null> {
  if (supabaseChecked) return supabaseAdmin;
  supabaseChecked = true;
  try {
    // Dynamic import to avoid build-time evaluation when env vars are missing.
    const mod = await import('@/lib/supabase/admin');
    supabaseAdmin = (mod as any).supabaseAdmin ?? null;
  } catch {
    supabaseAdmin = null;
  }
  return supabaseAdmin;
}

async function supabaseGet(key: string): Promise<CacheEntry | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('pipeline_cache')
      .select('value, expires_at')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return null;
    if (Date.now() > new Date(data.expires_at).getTime()) {
      // Expired — fire-and-forget delete
      sb.from('pipeline_cache').delete().eq('key', key).then(() => {});
      return null;
    }
    const entry: CacheEntry = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return entry;
  } catch {
    return null;
  }
}

async function supabaseSet(key: string, entry: CacheEntry): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try {
    await sb
      .from('pipeline_cache')
      .upsert({
        key,
        value: entry, // stored as jsonb
        expires_at: entry.expiresAt,
        created_at: entry.createdAt,
        hit_count: 0,
      }, { onConflict: 'key' });
  } catch {
    // Silently ignore — in-memory cache still works
  }
}

async function supabaseDelete(key: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try { await sb.from('pipeline_cache').delete().eq('key', key); } catch {}
}

async function supabaseClearAll(): Promise<number> {
  const sb = await getSupabase();
  if (!sb) return 0;
  try {
    const { count } = await sb.from('pipeline_cache').select('key', { count: 'exact', head: true });
    await sb.from('pipeline_cache').delete().neq('key', '__never__');
    return count ?? 0;
  } catch { return 0; }
}

async function supabasePrune(): Promise<number> {
  const sb = await getSupabase();
  if (!sb) return 0;
  try {
    const now = new Date().toISOString();
    const { count } = await sb.from('pipeline_cache').delete().lt('expires_at', now).select('key', { count: 'exact' });
    return count ?? 0;
  } catch { return 0; }
}

async function supabaseGetAll(): Promise<CacheEntry[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  try {
    const { data } = await sb.from('pipeline_cache').select('value');
    if (!data) return [];
    return data.map((row: any) => (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) as CacheEntry);
  } catch { return []; }
}

async function supabaseGetStats(): Promise<{ totalEntries: number; oldestEntry: string | null; newestEntry: string | null; avgCompleteness: number } | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('pipeline_cache').select('created_at, value');
    if (error || !data || data.length === 0) return { totalEntries: 0, oldestEntry: null, newestEntry: null, avgCompleteness: 0 };
    const entries = data.map((row: any) => (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) as CacheEntry);
    return {
      totalEntries: entries.length,
      oldestEntry: entries.reduce((a, b) => a.createdAt < b.createdAt ? a : b).createdAt,
      newestEntry: entries.reduce((a, b) => a.createdAt > b.createdAt ? a : b).createdAt,
      avgCompleteness: Math.round(entries.reduce((s, e) => s + e.completeness, 0) / entries.length),
    };
  } catch { return null; }
}

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
 * Tier 1: in-memory → Tier 2: Supabase → Tier 3: filesystem
 */
export async function getCachedMovie(key: string): Promise<{ movie: Movie; sources: string[]; completeness: number } | null> {
  // Tier 1: in-memory
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (isExpired(memEntry)) {
      memoryCache.delete(key);
      missCount++;
      // Continue to check other tiers (might already be re-cached elsewhere)
    } else {
      memEntry.hitCount++;
      hitCount++;
      return { movie: memEntry.movie, sources: memEntry.sources, completeness: memEntry.completeness };
    }
  }

  // Tier 2: Supabase (cross-instance on Vercel)
  const sbEntry = await supabaseGet(key);
  if (sbEntry) {
    if (isExpired(sbEntry)) {
      missCount++;
      return null;
    }
    sbEntry.hitCount++;
    // Promote to memory
    memoryCache.set(key, sbEntry);
    // Best-effort hit-count increment (don't await)
    supabaseSet(key, sbEntry).catch(() => {});
    hitCount++;
    return { movie: sbEntry.movie, sources: sbEntry.sources, completeness: sbEntry.completeness };
  }

  // Tier 3: filesystem (local dev or warm /tmp)
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
        memoryCache.set(key, entry);
        // Promote to Supabase too (if available)
        supabaseSet(key, entry).catch(() => {});
        hitCount++;
        return { movie: entry.movie, sources: entry.sources, completeness: entry.completeness };
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
 * Cache a merged movie result. Writes to all available tiers.
 */
export async function setCachedMovie(
  key: string,
  movie: Movie,
  sources: string[],
  completeness: number,
  ttlHours: number = DEFAULT_TTL_HOURS,
): Promise<void> {
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

  // Persist to Supabase (cross-instance — the main reason this refactor exists)
  await supabaseSet(key, entry);

  // Also write to file if available (local dev durability)
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
 * Remove a specific cached movie from all tiers.
 */
export async function invalidateCachedMovie(key: string): Promise<boolean> {
  const had = memoryCache.has(key);
  memoryCache.delete(key);
  await supabaseDelete(key);
  if (fsAvailable) {
    const filePath = cacheFilePath(key);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
  return had;
}

/**
 * Clear all cached movies from all tiers.
 */
export async function clearAllCachedMovies(): Promise<number> {
  const memCount = memoryCache.size;
  memoryCache.clear();
  const sbCount = await supabaseClearAll();
  let fileCount = 0;
  if (fsAvailable) {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try { fs.unlinkSync(path.join(CACHE_DIR, file)); fileCount++; } catch {}
          }
        }
      }
    } catch {}
  }
  return Math.max(memCount, sbCount, fileCount);
}

/**
 * Remove expired cache entries from all tiers.
 */
export async function pruneCache(): Promise<number> {
  let pruned = 0;
  // Prune memory cache
  for (const [key, entry] of memoryCache.entries()) {
    if (isExpired(entry)) {
      memoryCache.delete(key);
      pruned++;
    }
  }
  // Prune Supabase
  pruned += await supabasePrune();
  // Prune file cache
  if (fsAvailable) {
    try {
      if (fs.existsSync(CACHE_DIR)) {
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
      }
    } catch {}
  }
  return pruned;
}

/**
 * Get cache statistics aggregated across all tiers.
 */
export async function getCacheStats(): Promise<CacheStats> {
  const entries: CacheEntry[] = [];

  // Collect from memory
  for (const entry of memoryCache.values()) {
    entries.push(entry);
  }

  // Collect from Supabase (this is the source of truth on Vercel)
  const sbEntries = await supabaseGetAll();
  for (const e of sbEntries) entries.push(e);

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
export async function getAllCachedMovies(): Promise<Array<{
  key: string;
  title: string;
  tmdbId: number;
  completeness: number;
  sources: string[];
  createdAt: string;
  expiresAt: string;
  hitCount: number;
}>> {
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

  // From Supabase
  const sbEntries = await supabaseGetAll();
  for (const entry of sbEntries) {
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

// ─── Backwards-compat: synchronous wrappers (deprecated, will be removed in v2) ───
//
// Several call-sites (cron/prune-cache, admin pages) call these functions
// synchronously. To avoid a breaking refactor, we expose sync wrappers that
// work against the in-memory + filesystem tiers only. New callers should
// use the async versions above.

export function getCachedMovieSync(key: string): { movie: Movie; sources: string[]; completeness: number } | null {
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (isExpired(memEntry)) {
      memoryCache.delete(key);
      missCount++;
      return null;
    }
    memEntry.hitCount++;
    hitCount++;
    return { movie: memEntry.movie, sources: memEntry.sources, completeness: memEntry.completeness };
  }
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
        memoryCache.set(key, entry);
        hitCount++;
        return { movie: entry.movie, sources: entry.sources, completeness: entry.completeness };
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

export function setCachedMovieSync(
  key: string,
  movie: Movie,
  sources: string[],
  completeness: number,
  ttlHours: number = DEFAULT_TTL_HOURS,
): void {
  const entry: CacheEntry = {
    key, movie, sources, completeness,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
    hitCount: 0,
  };
  memoryCache.set(key, entry);
  // Fire-and-forget Supabase persist
  supabaseSet(key, entry).catch(() => {});
  if (fsAvailable) {
    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFilePath(key), JSON.stringify(entry, null, 2));
    } catch {}
  }
}
