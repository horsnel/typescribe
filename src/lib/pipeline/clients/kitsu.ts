/**
 * Kitsu API Client — Free REST API for anime data + streaming links.
 * No API key required. Rate limit: reasonable use.
 *
 * Provides: Anime search, streaming links, episode data.
 * Primary use case: "Where to Watch" streaming availability.
 */

import { fetchWithTimeout, safeJsonParse, enforceCacheLimit } from '@/lib/pipeline/core/resilience';

// ─── Constants ───

const BASE_URL = 'https://kitsu.io/api/edge';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MS = 300;

// ─── Types ───

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface KitsuAnimeResult {
  kitsuId: string;
  slug: string;
  title: string;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleJapanese: string | null;
  synopsis: string | null;
  posterImage: string | null;
  coverImage: string | null;
  episodeCount: number | null;
  episodeLength: number | null;
  status: string | null;
  ratingRank: number | null;
  averageRating: string | null;
  popularityRank: number | null;
  startDate: string | null;
  endDate: string | null;
  ageRating: string | null;
  ageRatingGuide: string | null;
  subType: string | null;
  showType: string | null;
  nsfw: boolean;
  youtubeVideoId: string | null;
}

export interface KitsuStreamingLink {
  kitsuId: string;
  animeTitle: string;
  platform: string;
  url: string;
  subs: string[];
  dubs: string[];
}

// ─── Internal State ───

const cache = new Map<string, CacheEntry<unknown>>();
let lastRequestTime = 0;

// ─── Rate Limiter ───

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Cache ───

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
  enforceCacheLimit(cache);
}

export function clearKitsuCache(): void {
  cache.clear();
}

// ─── Logging ───

function log(...args: unknown[]): void {
  console.log('[Kitsu]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Kitsu]', ...args);
}

// ─── Transform ───

function transformAnimeAttributes(attrs: any, id: string): KitsuAnimeResult {
  return {
    kitsuId: id,
    slug: attrs.slug ?? '',
    title: attrs.canonicalTitle ?? attrs.titles?.en ?? attrs.titles?.en_jp ?? '',
    titleEnglish: attrs.titles?.en ?? null,
    titleRomaji: attrs.titles?.en_jp ?? null,
    titleJapanese: attrs.titles?.ja_jp ?? null,
    synopsis: attrs.synopsis ?? null,
    posterImage: attrs.posterImage?.large ?? attrs.posterImage?.medium ?? null,
    coverImage: attrs.coverImage?.large ?? attrs.coverImage?.original ?? null,
    episodeCount: attrs.episodeCount ?? null,
    episodeLength: attrs.episodeLength ?? null,
    status: attrs.status ?? null,
    ratingRank: attrs.ratingRank ?? null,
    averageRating: attrs.averageRating ?? null,
    popularityRank: attrs.popularityRank ?? null,
    startDate: attrs.startDate ?? null,
    endDate: attrs.endDate ?? null,
    ageRating: attrs.ageRating ?? null,
    ageRatingGuide: attrs.ageRatingGuide ?? null,
    subType: attrs.subtype ?? null,
    showType: attrs.showType ?? null,
    nsfw: attrs.nsfw ?? false,
    youtubeVideoId: attrs.youtubeVideoId ?? null,
  };
}

// ─── Raw Fetch ───

async function kitsuFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  ttl: number = CACHE_TTL_MS,
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`;

  const cached = getCached<T>(url);
  if (cached !== null) return cached;

  try {
    await enforceRateLimit();

    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      next: { revalidate: 0 },
    }, 10_000);

    if (!res) {
      console.error('[Kitsu] Request failed (timeout/network)');
      return null;
    }
    if (!res.ok) {
      warn(`${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    const json = await safeJsonParse<T>(res);
    if (!json) {
      console.error('[Kitsu] Failed to parse JSON response');
      return null;
    }
    setCache(url, json, ttl);
    return json;
  } catch (err) {
    warn('Request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public API ───

/** Check if Kitsu is configured (always true). */
export function isKitsuConfigured(): boolean {
  return true;
}

/** Search for anime on Kitsu. Returns up to `limit` results. */
export async function searchAnime(
  query: string,
  limit: number = 10,
): Promise<KitsuAnimeResult[]> {
  const data = await kitsuFetch<any>(
    '/anime',
    {
      'filter[text]': query,
      'page[limit]': limit,
    },
  );

  if (!data?.data || !Array.isArray(data.data)) {
    warn(`No results for "${query}"`);
    return [];
  }

  return data.data.map((item: any) =>
    transformAnimeAttributes(item.attributes, item.id),
  );
}

/** Get anime details by Kitsu ID. */
export async function getAnimeDetails(
  kitsuId: string,
): Promise<KitsuAnimeResult | null> {
  const data = await kitsuFetch<any>(`/anime/${kitsuId}`);

  if (!data?.data) {
    warn(`No Kitsu entry for ID ${kitsuId}`);
    return null;
  }

  return transformAnimeAttributes(data.data.attributes, data.data.id);
}

/** Get streaming links for an anime by Kitsu ID. */
export async function getStreamingLinks(
  kitsuId: string,
): Promise<KitsuStreamingLink[]> {
  const data = await kitsuFetch<any>(
    `/anime/${kitsuId}/streaming-links`,
    { 'page[limit]': 20 },
  );

  if (!data?.data || !Array.isArray(data.data)) {
    return [];
  }

  // Need to also fetch the media entries for platform names
  const links: KitsuStreamingLink[] = [];

  for (const item of data.data) {
    const attrs = item.attributes || {};
    const relationships = item.relationships || {};

    // Try to extract platform from URL or included data
    const url = attrs.url || '';
    const subs = attrs.subs || [];
    const dubs = attrs.dubs || [];
    const platform = extractPlatformFromUrl(url);

    // Get anime title from included or just use ID
    const animeTitle = relationships.anime?.data?.id ?? '';

    links.push({
      kitsuId: item.id,
      animeTitle,
      platform: platform || 'Unknown',
      url,
      subs,
      dubs,
    });
  }

  return links;
}

/** Find a Kitsu anime by title and get its streaming links. */
export async function findStreamingLinks(
  title: string,
): Promise<KitsuStreamingLink[]> {
  const results = await searchAnime(title, 1);
  if (results.length === 0) return [];

  return getStreamingLinks(results[0].kitsuId);
}

// ─── Helpers ───

function extractPlatformFromUrl(url: string): string {
  if (!url) return 'Unknown';
  const lower = url.toLowerCase();

  if (lower.includes('crunchyroll')) return 'Crunchyroll';
  if (lower.includes('funimation')) return 'Funimation';
  if (lower.includes('hidive')) return 'HIDIVE';
  if (lower.includes('vrv')) return 'VRV';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('hulu')) return 'Hulu';
  if (lower.includes('amazon')) return 'Amazon Prime';
  if (lower.includes('disney')) return 'Disney+';
  if (lower.includes('tubitv')) return 'Tubi';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('vimeo')) return 'Vimeo';

  // Try to extract domain name
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const name = hostname.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown';
  }
}
