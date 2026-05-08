/**
 * Tubi Free Streaming Source
 *
 * Fetches free movies from Tubi's public search API.
 * Tubi is a free ad-supported streaming service (FAST). Since we can't
 * embed their player, entries use videoType: 'linkout' with real Tubi
 * watch URLs that open in a new tab.
 *
 * API: https://backend.tubi.tv/api/search?q=QUERY&type=video
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const TUBI_SEARCH_API = 'https://backend.tubi.tv/api/search';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const SEARCH_QUERIES = [
  'anime',
  'action movies',
  'horror movies',
  'sci-fi movies',
  'comedy movies',
];

// ─── Internal Types ─────────────────────────────────────────────────────────

interface TubiVideoResult {
  id: string | number;
  title?: string;
  description?: string;
  year?: number;
  runtime?: number;
  type?: string;
  episode_number?: number;
  season_number?: number;
  series_id?: string | number;
  images?: {
    thumbnail?: string[];
    poster?: string[];
  };
  genres?: string[];
}

interface TubiSearchResponse {
  results?: {
    type: string;
    id: string;
    videos?: TubiVideoResult[];
  }[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Unknown';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function toStreamableMovie(video: TubiVideoResult): StreamableMovie {
  const videoId = String(video.id);
  const poster = video.images?.poster?.[0] ?? video.images?.thumbnail?.[0] ?? '';
  const backdrop = video.images?.thumbnail?.[0] ?? poster;

  // Determine genres
  const genres: string[] = video.genres ?? [];
  const isAnime = genres.some(g => g.toLowerCase().includes('anime')) ||
    (video.title ?? '').toLowerCase().includes('anime');
  if (isAnime && !genres.some(g => g.toLowerCase().includes('anime'))) {
    genres.push('Anime');
  }

  return {
    id: `tubi-${videoId}`,
    title: video.title ?? `Tubi Movie ${videoId}`,
    description: (video.description ?? 'A free movie available on Tubi.').slice(0, 500),
    year: video.year ?? 0,
    duration: formatDuration(video.runtime ?? 0),
    durationSeconds: (video.runtime ?? 0) * 60,
    genres,
    rating: 0, // Tubi API doesn't provide ratings in search results
    quality: 'Unknown',
    poster,
    backdrop,
    source: 'tubi',
    sourceUrl: `https://tubitv.com/movies/${videoId}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `https://tubitv.com/movies/${videoId}`,
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
 * Fetch movies from Tubi using their public search API.
 */
export async function fetchTubiMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-tubi-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];
  const seenIds = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `${TUBI_SEARCH_API}?q=${encodeURIComponent(query)}&type=video`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      }, 10_000);

      if (!res?.ok) continue;

      const data = await safeJsonParse<TubiSearchResponse>(res);
      if (!data?.results) continue;

      for (const result of data.results) {
        // Process videos from each result group
        if (result.videos && Array.isArray(result.videos)) {
          for (const video of result.videos) {
            const vid = String(video.id);
            if (seenIds.has(vid)) continue;

            // Skip TV episodes (only include movies)
            if (video.type === 's' || video.episode_number || video.season_number) continue;

            seenIds.add(vid);
            movies.push(toStreamableMovie(video));
          }
        }
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:Tubi] Error fetching query "${query}":`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search Tubi for movies matching a query.
 */
export async function searchTubiMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-tubi-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${TUBI_SEARCH_API}?q=${encodeURIComponent(query)}&type=video`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    }, 10_000);

    if (!res?.ok) return [];

    const data = await safeJsonParse<TubiSearchResponse>(res);
    if (!data?.results) return [];

    const movies: StreamableMovie[] = [];
    const seenIds = new Set<string>();

    for (const result of data.results) {
      if (result.videos && Array.isArray(result.videos)) {
        for (const video of result.videos) {
          const vid = String(video.id);
          if (seenIds.has(vid)) continue;
          if (video.type === 's' || video.episode_number || video.season_number) continue;

          seenIds.add(vid);
          movies.push(toStreamableMovie(video));
        }
      }
    }

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Tubi] Search error:', err);
    return [];
  }
}
