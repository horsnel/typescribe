/**
 * Jikan API Client — Free REST API for MyAnimeList data.
 * No API key required. Rate limit: ~3 requests/second.
 *
 * Provides: Anime details, characters, seasonal, top anime, search, recommendations.
 */

// ─── Constants ───

const BASE_URL = 'https://api.jikan.moe/v4';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MS = 350; // ~3 req/s with buffer

// ─── Types ───

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface JikanAnimeResult {
  malId: number;
  url: string;
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  type: string | null;
  source: string | null;
  episodes: number | null;
  status: string | null;
  rating: string | null;
  score: number | null;
  scoredBy: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
  genres: string[];
  themes: string[];
  studios: string[];
  producers: string[];
  imageUrl: string | null;
  trailerYoutubeId: string | null;
  airing: boolean;
  broadcast: string | null;
  duration: string | null;
  approved: boolean;
}

export interface JikanCharacterResult {
  malId: number;
  url: string;
  name: string;
  nameKanji: string | null;
  nicknames: string[];
  role: string;
  imageUrl: string | null;
  voiceActors: Array<{
    malId: number;
    name: string;
    language: string;
    imageUrl: string | null;
  }>;
}

export interface JikanRecommendation {
  malId: number;
  url: string;
  title: string;
  imageUrl: string | null;
  recommendationCount: number;
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
}

/** Clear the entire Jikan in-memory cache. */
export function clearJikanCache(): void {
  cache.clear();
}

// ─── Logging ───

function log(...args: unknown[]): void {
  console.log('[Jikan]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Jikan]', ...args);
}

// ─── Transform ───

function transformAnimeNode(node: any): JikanAnimeResult {
  return {
    malId: node.mal_id,
    url: node.url ?? '',
    title: node.title ?? '',
    titleEnglish: node.title_english ?? null,
    titleJapanese: node.title_japanese ?? null,
    titleRomaji: node.title_romaji ?? null,
    type: node.type ?? null,
    source: node.source ?? null,
    episodes: node.episodes ?? null,
    status: node.status ?? null,
    rating: node.rating ?? null,
    score: node.score ?? null,
    scoredBy: node.scored_by ?? null,
    rank: node.rank ?? null,
    popularity: node.popularity ?? null,
    members: node.members ?? null,
    favorites: node.favorites ?? null,
    synopsis: node.synopsis ?? null,
    background: node.background ?? null,
    season: node.season ?? null,
    year: node.year ?? null,
    genres: (node.genres ?? []).map((g: any) => g.name),
    themes: (node.themes ?? []).map((t: any) => t.name),
    studios: (node.studios ?? []).map((s: any) => s.name),
    producers: (node.producers ?? []).map((p: any) => p.name),
    imageUrl: node.images?.jpg?.image_url ?? node.images?.webp?.image_url ?? null,
    trailerYoutubeId: node.trailer?.youtube_id ?? null,
    airing: node.airing ?? false,
    broadcast: node.broadcast?.string ?? node.broadcast ?? null,
    duration: node.duration ?? null,
    approved: node.approved ?? true,
  };
}

// ─── Raw Fetch ───

async function jikanFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  ttl: number = CACHE_TTL_MS,
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE_URL}${endpoint}${qs.toString() ? `?${qs.toString()}` : ''}`;

  // Check cache
  const cached = getCached<T>(url);
  if (cached !== null) return cached;

  try {
    await enforceRateLimit();

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 3_000;
        warn(`Rate limited. Retrying after ${waitMs}ms.`);
        await new Promise(r => setTimeout(r, waitMs));
        return jikanFetch<T>(endpoint, params, ttl); // Retry once
      }
      warn(`${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    const json = await res.json();

    if (json.status === false && json.type === 'HttpException') {
      warn(`API error: ${json.message}`);
      return null;
    }

    const data = json.data !== undefined ? json.data : json;
    setCache(url, data, ttl);
    return data as T;
  } catch (err) {
    warn('Request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public API ───

/** Check if Jikan is configured (always true — no API key needed). */
export function isJikanConfigured(): boolean {
  return true;
}

/** Search for anime by title. Returns up to `limit` results. */
export async function searchAnime(
  query: string,
  limit: number = 10,
): Promise<JikanAnimeResult[]> {
  const data = await jikanFetch<any[]>(
    '/anime',
    { q: query, limit, sfw: 'true' },
  );

  if (!data || !Array.isArray(data)) {
    // Try paginated response
    const paginated = await jikanFetch<{ data: any[] }>(
      '/anime',
      { q: query, limit, sfw: 'true' },
    );
    if (paginated && Array.isArray((paginated as any).data)) {
      return (paginated as any).data.map(transformAnimeNode);
    }
    warn(`No results for "${query}"`);
    return [];
  }

  return data.map(transformAnimeNode);
}

/** Get full anime details by MAL ID. */
export async function getAnimeDetails(
  malId: number,
): Promise<JikanAnimeResult | null> {
  const data = await jikanFetch<any>(`/anime/${malId}`);
  if (!data) return null;
  return transformAnimeNode(data);
}

/** Get anime characters and voice actors by MAL ID. */
export async function getAnimeCharacters(
  malId: number,
): Promise<JikanCharacterResult[]> {
  const data = await jikanFetch<{ data: any[] }>(`/anime/${malId}/characters`);
  if (!data || !Array.isArray((data as any)?.data)) {
    // Try direct array
    if (Array.isArray(data)) {
      return data.map(transformCharacterNode);
    }
    return [];
  }

  return (data as any).data.map(transformCharacterNode);
}

function transformCharacterNode(node: any): JikanCharacterResult {
  return {
    malId: node.character?.mal_id ?? node.mal_id,
    url: node.character?.url ?? node.url ?? '',
    name: node.character?.name ?? node.name ?? '',
    nameKanji: node.character?.name_kanji ?? null,
    nicknames: node.character?.nicknames ?? [],
    role: node.role ?? 'Supporting',
    imageUrl: node.character?.images?.jpg?.image_url ?? node.character?.images?.webp?.image_url ?? null,
    voiceActors: (node.voice_actors ?? []).map((va: any) => ({
      malId: va.person?.mal_id ?? 0,
      name: va.person?.name ?? '',
      language: va.language ?? '',
      imageUrl: va.person?.images?.jpg?.image_url ?? null,
    })),
  };
}

/** Get anime recommendations by MAL ID. */
export async function getAnimeRecommendations(
  malId: number,
): Promise<JikanRecommendation[]> {
  const data = await jikanFetch<{ data: any[] }>(`/anime/${malId}/recommendations`);
  if (!data || !Array.isArray((data as any)?.data)) {
    return [];
  }

  return (data as any).data.map((rec: any) => ({
    malId: rec.entry?.mal_id ?? 0,
    url: rec.entry?.url ?? '',
    title: rec.entry?.title ?? '',
    imageUrl: rec.entry?.images?.jpg?.image_url ?? null,
    recommendationCount: rec.votes ?? 0,
  }));
}

/** Get seasonal anime for a specific season/year. */
export async function getSeasonalAnime(
  year: number,
  season: 'winter' | 'spring' | 'summer' | 'fall',
  filter: 'tv' | 'movie' | 'ova' | 'special' | '' = 'tv',
): Promise<JikanAnimeResult[]> {
  const params: Record<string, string | number | undefined> = {
    filter: filter || undefined,
    sfw: 'true',
    limit: 25,
  };

  const data = await jikanFetch<{ data: any[] }>(
    `/seasons/${year}/${season}`,
    params,
  );

  if (!data || !Array.isArray((data as any)?.data)) {
    return [];
  }

  return (data as any).data.map(transformAnimeNode);
}

/** Get current season anime. */
export async function getCurrentSeason(
  filter: 'tv' | 'movie' | 'ova' | 'special' | '' = '',
): Promise<JikanAnimeResult[]> {
  const params: Record<string, string | number | undefined> = {
    filter: filter || undefined,
    sfw: 'true',
    limit: 25,
  };

  const data = await jikanFetch<{ data: any[] }>('/seasons/now', params);

  if (!data || !Array.isArray((data as any)?.data)) {
    return [];
  }

  return (data as any).data.map(transformAnimeNode);
}

/** Get top anime. */
export async function getTopAnime(
  type: 'tv' | 'movie' | 'ova' | 'special' | '' = '',
  filter: 'airing' | 'upcoming' | 'bypopularity' | 'favorite' | '' = '',
  page: number = 1,
): Promise<JikanAnimeResult[]> {
  const params: Record<string, string | number | undefined> = {
    type: type || undefined,
    filter: filter || undefined,
    page,
    sfw: 'true',
    limit: 25,
  };

  const data = await jikanFetch<{ data: any[] }>('/top/anime', params);

  if (!data || !Array.isArray((data as any)?.data)) {
    return [];
  }

  return (data as any).data.map(transformAnimeNode);
}

/** Get anime user reviews by MAL ID. */
export async function getAnimeReviews(
  malId: number,
): Promise<any[]> {
  const data = await jikanFetch<{ data: any[] }>(`/anime/${malId}/reviews`);
  if (!data || !Array.isArray((data as any)?.data)) {
    return [];
  }
  return (data as any).data;
}
