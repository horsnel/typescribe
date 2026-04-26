/**
 * Fanart.tv Client
 *
 * Provides high-quality movie/TV images: logos, posters, backgrounds,
 * thumbnails, and clearart. Complements TMDb images with fan-made
 * alternatives that are often higher quality or more diverse.
 *
 * API docs: https://fanart.tv/api-docs/
 * Free tier: unlimited requests (rate-limited)
 */

// ─── Types ───

export interface FanartMovieImages {
  movieposter?: Array<{ id: string; url: string; lang: string; likes: string }>;
  moviebackground?: Array<{ id: string; url: string; lang: string; likes: string }>;
  movielogo?: Array<{ id: string; url: string; lang: string; likes: string }>;
  moviethumb?: Array<{ id: string; url: string; lang: string; likes: string }>;
  moviebanner?: Array<{ id: string; url: string; lang: string; likes: string }>;
  hdmovielogo?: Array<{ id: string; url: string; lang: string; likes: string }>;
  hdmovieclearart?: Array<{ id: string; url: string; lang: string; likes: string }>;
  moviedisc?: Array<{ id: string; url: string; lang: string; likes: string }>;
}

export interface FanartTvImages {
  tvposter?: Array<{ id: string; url: string; lang: string; likes: string; season?: string }>;
  showbackground?: Array<{ id: string; url: string; lang: string; likes: string }>;
  hdtvlogo?: Array<{ id: string; url: string; lang: string; likes: string }>;
  hdclearart?: Array<{ id: string; url: string; lang: string; likes: string }>;
  tvthumb?: Array<{ id: string; url: string; lang: string; likes: string }>;
  tvbanner?: Array<{ id: string; url: string; lang: string; likes: string }>;
  seasonposter?: Array<{ id: string; url: string; lang: string; likes: string; season: string }>;
  seasonthumb?: Array<{ id: string; url: string; lang: string; likes: string; season: string }>;
  seasonbanner?: Array<{ id: string; url: string; lang: string; likes: string; season: string }>;
}

export interface FanartResult {
  /** Best English (or any-language) poster URL */
  poster: string | null;
  /** Best English (or any-language) background/fanart URL */
  background: string | null;
  /** Best English (or any-language) logo URL (transparent PNG) */
  logo: string | null;
  /** Best English (or any-language) clearart URL */
  clearart: string | null;
  /** Best English (or any-language) thumbnail URL */
  thumb: string | null;
  /** Best English (or any-language) banner URL */
  banner: string | null;
  /** All available images by type */
  allImages: Record<string, string[]>;
}

// ─── Config ───

const API_BASE = 'https://webservice.fanart.tv/v3/movies';
const TV_API_BASE = 'https://webservice.fanart.tv/v3/tv';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — images rarely change
const RATE_LIMIT_MS = 300; // 300ms between requests

// ─── In-memory cache ───

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<FanartResult>>();
let lastRequestAt = 0;

function getCached(key: string): FanartResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: FanartResult): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Helpers ───

function getApiKey(): string {
  return process.env.FANART_TV_API_KEY || '';
}

export function isFanartConfigured(): boolean {
  return !!getApiKey();
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

function log(...args: unknown[]): void {
  console.log('[FanartTV]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[FanartTV]', ...args);
}

/**
 * Pick the best image from an array, preferring English ('en' or '00'),
 * then by most likes.
 */
function pickBest(
  images: Array<{ id: string; url: string; lang: string; likes: string }> | undefined,
): string | null {
  if (!images || images.length === 0) return null;

  // Sort: English first, then by likes descending
  const sorted = [...images].sort((a, b) => {
    const aEn = a.lang === 'en' || a.lang === '00' ? 0 : 1;
    const bEn = b.lang === 'en' || b.lang === '00' ? 0 : 1;
    if (aEn !== bEn) return aEn - bEn;
    return parseInt(b.likes || '0', 10) - parseInt(a.likes || '0', 10);
  });

  return sorted[0]?.url || null;
}

function extractAllUrls(
  images: Array<{ id: string; url: string; lang: string; likes: string }> | undefined,
): string[] {
  if (!images) return [];
  return images.map(img => img.url).filter(Boolean);
}

// ─── Core Fetch ───

async function fetchMovieImages(tmdbId: number): Promise<FanartResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cacheKey = `movie:${tmdbId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for movie ${tmdbId}`);
    return cached;
  }

  await enforceRateLimit();

  const url = `${API_BASE}/${tmdbId}?api_key=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      if (res.status === 404) {
        log(`No fanart found for movie ${tmdbId}`);
        return null;
      }
      warn(`HTTP ${res.status} for movie ${tmdbId}`);
      return null;
    }

    const data: FanartMovieImages = await res.json();

    const result: FanartResult = {
      poster: pickBest(data.movieposter),
      background: pickBest(data.moviebackground),
      logo: pickBest(data.hdmovielogo || data.movielogo),
      clearart: pickBest(data.hdmovieclearart),
      thumb: pickBest(data.moviethumb),
      banner: pickBest(data.moviebanner),
      allImages: {
        posters: extractAllUrls(data.movieposter),
        backgrounds: extractAllUrls(data.moviebackground),
        logos: extractAllUrls(data.hdmovielogo || data.movielogo),
        clearart: extractAllUrls(data.hdmovieclearart),
        thumbs: extractAllUrls(data.moviethumb),
        banners: extractAllUrls(data.moviebanner),
        discs: extractAllUrls(data.moviedisc),
      },
    };

    setCache(cacheKey, result);
    log(`Fetched images for movie ${tmdbId} — poster:${result.poster ? 'yes' : 'no'} bg:${result.background ? 'yes' : 'no'} logo:${result.logo ? 'yes' : 'no'}`);

    return result;
  } catch (err) {
    warn(`Fetch error for movie ${tmdbId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchTvImages(tvdbId: number): Promise<FanartResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cacheKey = `tv:${tvdbId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for TV ${tvdbId}`);
    return cached;
  }

  await enforceRateLimit();

  const url = `${TV_API_BASE}/${tvdbId}?api_key=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      warn(`HTTP ${res.status} for TV ${tvdbId}`);
      return null;
    }

    const data: FanartTvImages = await res.json();

    const result: FanartResult = {
      poster: pickBest(data.tvposter),
      background: pickBest(data.showbackground),
      logo: pickBest(data.hdtvlogo),
      clearart: pickBest(data.hdclearart),
      thumb: pickBest(data.tvthumb),
      banner: pickBest(data.tvbanner),
      allImages: {
        posters: extractAllUrls(data.tvposter),
        backgrounds: extractAllUrls(data.showbackground),
        logos: extractAllUrls(data.hdtvlogo),
        clearart: extractAllUrls(data.hdclearart),
        thumbs: extractAllUrls(data.tvthumb),
        banners: extractAllUrls(data.tvbanner),
        seasonPosters: extractAllUrls(data.seasonposter),
      },
    };

    setCache(cacheKey, result);
    log(`Fetched images for TV ${tvdbId} — poster:${result.poster ? 'yes' : 'no'} bg:${result.background ? 'yes' : 'no'}`);

    return result;
  } catch (err) {
    warn(`Fetch error for TV ${tvdbId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public API ───

/**
 * Get fanart images for a movie by TMDb ID.
 * Fanart.tv uses TMDb IDs for movies.
 */
export async function getMovieImages(tmdbId: number): Promise<FanartResult | null> {
  return fetchMovieImages(tmdbId);
}

/**
 * Get fanart images for a TV show by TVDB ID.
 * Note: Fanart.tv uses TVDB IDs (not TMDb) for TV shows.
 * You can get the TVDB ID from TMDb's external_ids endpoint.
 */
export async function getTvImages(tvdbId: number): Promise<FanartResult | null> {
  return fetchTvImages(tvdbId);
}

/** Clear all cached fanart data */
export function clearFanartCache(): void {
  cache.clear();
  log('Cache cleared');
}

/** Get cache size */
export function fanartCacheSize(): number {
  return cache.size;
}
