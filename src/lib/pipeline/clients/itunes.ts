/**
 * iTunes Search API Client for Typescribe
 *
 * Free, no API key required.
 * Used as a fallback trailer source when TMDb Videos doesn't have a trailer.
 *
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideoConceptual/iTuneSearchAPI/index.html
 *
 * Features:
 *  - Search for movie trailers / previews by title
 *  - Returns 30-second preview URLs (not full trailers)
 *  - No rate limit (reasonable use)
 *  - No API key needed
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface ITunesTrailerResult {
  /** 30-second preview URL (m4v video) */
  previewUrl: string;
  /** Full iTunes page URL */
  trackViewUrl: string;
  /** Trailer / preview title */
  trackName: string;
  /** Artwork URL (100x100 or higher) */
  artworkUrl: string;
  /** Release date */
  releaseDate: string;
  /** Runtime in milliseconds */
  trackTimeMillis: number;
}

interface ITunesSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl: string;
  trackViewUrl: string;
  artworkUrl100: string;
  releaseDate: string;
  trackTimeMillis: number;
  kind: string;
  wrapperType: string;
  primaryGenreName?: string;
  longDescription?: string;
}

interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesSearchResult[];
}

// ─── Configuration ────────────────────────────────────────────────────────

const BASE_URL = 'https://itunes.apple.com/search';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: ITunesTrailerResult | null; expiresAt: number }>();

function getCached(key: string): ITunesTrailerResult | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key: string, data: ITunesTrailerResult | null): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

/** Clear the entire iTunes cache. */
export function clearITunesCache(): void {
  cache.clear();
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Search iTunes for a movie trailer preview.
 *
 * Queries for `"{movieTitle} {year}"` with entity=movie and returns the
 * first movie result that has a preview URL.
 *
 * @param movieTitle  The movie title to search for.
 * @param year        Optional release year to narrow results.
 * @returns A `ITunesTrailerResult` or `null` on error / not found.
 */
export async function searchTrailer(
  movieTitle: string,
  year?: number,
): Promise<ITunesTrailerResult | null> {
  const query = year
    ? `${movieTitle} ${year}`
    : movieTitle;

  const cacheKey = `search:${query}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const params = new URLSearchParams({
      term: query,
      entity: 'movie',
      media: 'movie',
      limit: '5',
      country: 'US',
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.warn(`[iTunes] HTTP ${res.status} for search "${query}"`);
      setCache(cacheKey, null);
      return null;
    }

    const data = (await res.json()) as ITunesSearchResponse;

    if (!data.results || data.results.length === 0) {
      console.info(`[iTunes] No results for "${query}"`);
      setCache(cacheKey, null);
      return null;
    }

    // Find first result with a preview URL
    const movieResult = data.results.find(
      (r) => r.previewUrl && (r.kind === 'feature-movie' || r.wrapperType === 'track'),
    );

    if (!movieResult) {
      console.info(`[iTunes] No preview URL found for "${query}"`);
      setCache(cacheKey, null);
      return null;
    }

    const result: ITunesTrailerResult = {
      previewUrl: movieResult.previewUrl,
      trackViewUrl: movieResult.trackViewUrl,
      trackName: movieResult.trackName,
      artworkUrl: movieResult.artworkUrl100?.replace('100x100', '600x600') || movieResult.artworkUrl100 || '',
      releaseDate: movieResult.releaseDate,
      trackTimeMillis: movieResult.trackTimeMillis,
    };

    setCache(cacheKey, result);
    console.info(`[iTunes] Found trailer preview for "${movieTitle}"`);
    return result;
  } catch (err) {
    console.error('[iTunes] Search error:', err);
    setCache(cacheKey, null);
    return null;
  }
}

/**
 * Check if iTunes client is configured (always true — no key needed).
 */
export function isITunesConfigured(): boolean {
  return true;
}
