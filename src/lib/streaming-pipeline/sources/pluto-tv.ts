/**
 * Pluto TV Free Streaming Source
 *
 * Fetches free movies from Pluto TV's public content API.
 * Pluto TV is a free ad-supported streaming service. Since we can't
 * embed their player, entries use videoType: 'linkout' with real Pluto TV
 * watch URLs that open in a new tab.
 *
 * API: https://api.pluto.tv/v2/ (public, no key needed)
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const PLUTO_API = 'https://api.pluto.tv';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Internal Types ─────────────────────────────────────────────────────────

interface PlutoTVItem {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  year?: number;
  duration?: number;
  genre?: string;
  genres?: string[];
  posterPath?: string;
  backdropPath?: string;
  type?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  _id?: string;
  highlightImage?: string;
  coverImage?: string;
}

interface PlutoTVCategoryResponse {
  name?: string;
  slug?: string;
  items?: PlutoTVItem[];
  error?: string;
}

interface PlutoTVSearchResponse {
  vodItems?: PlutoTVItem[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function toStreamableMovie(item: PlutoTVItem): StreamableMovie {
  const itemId = item._id || item.id || String(Math.random());
  const slug = item.slug || itemId;
  const poster = item.posterPath || item.coverImage || '';
  const backdrop = item.backdropPath || item.highlightImage || poster;

  const genres: string[] = [];
  if (item.genres && Array.isArray(item.genres)) {
    genres.push(...item.genres);
  } else if (item.genre) {
    genres.push(item.genre);
  }

  return {
    id: `plutotv-${slug}`,
    title: item.name ?? `Pluto TV Movie ${slug}`,
    description: (item.description ?? 'A free movie available on Pluto TV.').slice(0, 500),
    year: item.year ?? 0,
    duration: formatDuration(item.duration ?? 0),
    durationSeconds: item.duration ?? 0,
    genres,
    rating: 0,
    quality: 'Unknown',
    poster,
    backdrop,
    source: 'pluto-tv',
    sourceUrl: `https://pluto.tv/on-demand/movies/${slug}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `https://pluto.tv/on-demand/movies/${slug}`,
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
 * Fetch movies from Pluto TV using their public API.
 * Tries multiple category endpoints to find free movies.
 */
export async function fetchPlutoTVMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-plutotv-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];
  const seenIds = new Set<string>();

  // Try multiple Pluto TV content category slugs
  const categorySlugs = [
    'movies',
    'action-movies',
    'horror-movies',
    'comedy-movies',
    'scifi',
  ];

  for (const slug of categorySlugs) {
    try {
      const url = `${PLUTO_API}/v2/categories/${encodeURIComponent(slug)}?deviceType=web`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      }, 8_000);

      if (!res?.ok) continue;

      const data = await safeJsonParse<PlutoTVCategoryResponse>(res);
      if (!data?.items) continue;

      for (const item of data.items) {
        // Skip TV episodes
        if (item.episodeNumber || item.seasonNumber) continue;
        if (item.type === 'episode' || item.type === 'series') continue;

        const movieId = item._id || item.id;
        if (!movieId || seenIds.has(String(movieId))) continue;

        seenIds.add(String(movieId));
        movies.push(toStreamableMovie(item));
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:PlutoTV] Error fetching category "${slug}":`, err);
    }
  }

  // Also try the search endpoint for anime
  try {
    const url = `${PLUTO_API}/v2/search?query=anime&deviceType=web`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    }, 8_000);

    if (res?.ok) {
      const data = await safeJsonParse<PlutoTVSearchResponse>(res);
      if (data?.vodItems) {
        for (const item of data.vodItems) {
          if (item.episodeNumber || item.seasonNumber) continue;
          const movieId = item._id || item.id;
          if (!movieId || seenIds.has(String(movieId))) continue;
          seenIds.add(String(movieId));

          const movie = toStreamableMovie(item);
          // Ensure anime genre is tagged
          if (!movie.genres.some(g => g.toLowerCase().includes('anime'))) {
            movie.genres.push('Anime');
          }
          movies.push(movie);
        }
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Anime search error:', err);
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search Pluto TV for movies matching a query.
 */
export async function searchPlutoTVMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-plutotv-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${PLUTO_API}/v2/search?query=${encodeURIComponent(query)}&deviceType=web`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    }, 8_000);

    if (!res?.ok) return [];

    const data = await safeJsonParse<PlutoTVSearchResponse>(res);
    if (!data?.vodItems) return [];

    const movies = data.vodItems
      .filter(item => !item.episodeNumber && !item.seasonNumber)
      .map(item => toStreamableMovie(item));

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:PlutoTV] Search error:', err);
    return [];
  }
}
