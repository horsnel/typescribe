/**
 * Plex Free Movies Source
 *
 * Fetches free movies from Plex's free streaming service.
 * Plex offers ad-supported free movies. Since we can't embed
 * their player, entries use videoType: 'linkout'.
 *
 * API: https://discover.provider.plex.tv/ (public, no key needed)
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const PLEX_DISCOVER_API = 'https://discover.provider.plex.tv';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Internal Types ─────────────────────────────────────────────────────────

interface PlexMediaItem {
  ratingKey?: string;
  title?: string;
  summary?: string;
  year?: number;
  duration?: number; // milliseconds
  genre?: Array<{ tag?: string }>;
  thumb?: string;
  art?: string;
  type?: string;
  leafCount?: number;
  originallyAvailableAt?: string;
  contentRating?: string;
}

interface PlexCollectionResponse {
  MediaContainer?: {
    Metadata?: PlexMediaItem[];
    size?: number;
  };
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms <= 0) return 'Unknown';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function toStreamableMovie(item: PlexMediaItem): StreamableMovie {
  const ratingKey = item.ratingKey || String(Date.now());
  const genres: string[] = [];
  if (item.genre && Array.isArray(item.genre)) {
    for (const g of item.genre) {
      if (g.tag) genres.push(g.tag);
    }
  }

  const poster = item.thumb
    ? (item.thumb.startsWith('http') ? item.thumb : `https://metadata.provider.plex.tv${item.thumb}`)
    : '';
  const backdrop = item.art
    ? (item.art.startsWith('http') ? item.art : `https://metadata.provider.plex.tv${item.art}`)
    : poster;

  return {
    id: `plex-${ratingKey}`,
    title: item.title ?? 'Plex Free Movie',
    description: (item.summary ?? 'A free movie available on Plex.').slice(0, 500),
    year: item.year ?? 0,
    duration: formatDuration(item.duration ?? 0),
    durationSeconds: Math.floor((item.duration ?? 0) / 1000),
    genres,
    rating: 0,
    quality: '720p',
    poster,
    backdrop,
    source: 'plex-free',
    sourceUrl: `https://app.plex.tv/watch#/provider/movies/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `https://app.plex.tv/watch#/provider/movies/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`,
    videoType: 'linkout',
    isEmbeddable: false,
    languages: [
      { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'en', label: 'English', isDefault: true },
    ],
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch free movies from Plex's discover API.
 */
export async function fetchPlexFreeMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-plex-free-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];
  const seenKeys = new Set<string>();

  // Plex discover content slugs for free movies
  const contentQueries = [
    'contentType=movie&free=true&limit=30&sort=popularity.desc',
    'contentType=movie&free=true&limit=20&sort=year.desc',
    'contentType=movie&free=true&limit=20&genre=anime',
  ];

  for (const query of contentQueries) {
    try {
      const url = `${PLEX_DISCOVER_API}/library?${query}`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'X-Plex-Product': 'Typescribe',
          'X-Plex-Version': '1.0',
        },
      }, 8_000);

      if (!res?.ok) continue;

      const data = await safeJsonParse<PlexCollectionResponse>(res);
      const items = data?.MediaContainer?.Metadata;
      if (!items) continue;

      for (const item of items) {
        const key = item.ratingKey;
        if (!key || seenKeys.has(key)) continue;
        // Skip TV shows
        if (item.type === 'show' || item.leafCount) continue;

        seenKeys.add(key);
        movies.push(toStreamableMovie(item));
      }
    } catch (err) {
      console.warn('[StreamingPipeline:PlexFree] Error fetching movies:', err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search Plex free movies for matching content.
 */
export async function searchPlexFreeMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-plex-free-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${PLEX_DISCOVER_API}/library?contentType=movie&free=true&limit=20&query=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'X-Plex-Product': 'Typescribe',
        'X-Plex-Version': '1.0',
      },
    }, 8_000);

    if (!res?.ok) return [];

    const data = await safeJsonParse<PlexCollectionResponse>(res);
    const items = data?.MediaContainer?.Metadata;
    if (!items) return [];

    const movies = items
      .filter(item => !item.leafCount) // Skip shows
      .map(item => toStreamableMovie(item));

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PlexFree] Search error:', err);
    return [];
  }
}
