/**
 * Streaming Pipeline Orchestrator — The central entry point for the streaming pipeline.
 *
 * COMPLETELY SEPARATE from the main pipeline (`/lib/pipeline`).
 * - Different data types (StreamableMovie vs Movie)
 * - Different cache system (streaming-cache vs pipeline-cache)
 * - Different API routes (/api/streaming/* vs /api/pipeline/*)
 * - No shared database writes
 *
 * Architecture:
 *   Blender Foundation (hardcoded, always available)
 *   + Internet Archive (public domain, no API key needed)
 *   + YouTube Free Movies (requires YOUTUBE_API_KEY)
 *   + TMDB Enrichment (optional, adds better metadata from existing TMDB client)
 *   → Merge & Deduplicate → Build Categories → Cache → Response
 *
 * Usage:
 *   import { getStreamingCatalog, getStreamingMovie, searchStreamingMovies } from '@/lib/streaming-pipeline';
 */

import type { StreamableMovie, StreamingCatalog, StreamingCategory } from './types';
import { getCached, setCached, clearAllCached, getCacheStats } from './cache';
import { getBlenderMovies } from './sources/blender';
import { fetchYouTubeFreeMovies, searchYouTubeFreeMovie } from './sources/youtube';
import { fetchArchiveMovies, searchArchiveMovies } from './sources/internet-archive';

// ─── Configuration ───────────────────────────────────────────────────────────

const CATALOG_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const MOVIE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ─── Category Definitions ────────────────────────────────────────────────────

function buildCategories(movies: StreamableMovie[]): StreamingCategory[] {
  const categories: StreamingCategory[] = [
    {
      id: 'trending',
      label: 'Trending Now',
      icon: 'Sparkles',
      movieIds: movies
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 20)
        .map(m => m.id),
    },
    {
      id: '4k-ultra-hd',
      label: '4K Ultra HD',
      icon: 'Crown',
      movieIds: movies.filter(m => m.is4K).map(m => m.id),
    },
    {
      id: 'animation',
      label: 'Animation',
      icon: 'Palette',
      movieIds: movies
        .filter(m => m.genres.some(g => g.toLowerCase().includes('animation')))
        .map(m => m.id),
    },
    {
      id: 'sci-fi',
      label: 'Sci-Fi & Fantasy',
      icon: 'Wand2',
      movieIds: movies
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('sci-fi') ||
            g.toLowerCase().includes('science fiction') ||
            g.toLowerCase().includes('fantasy')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'action',
      label: 'Action & Adventure',
      icon: 'Swords',
      movieIds: movies
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('action') ||
            g.toLowerCase().includes('adventure')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'comedy',
      label: 'Comedy',
      icon: 'Smile',
      movieIds: movies
        .filter(m => m.genres.some(g => g.toLowerCase().includes('comedy')))
        .map(m => m.id),
    },
    {
      id: 'drama',
      label: 'Drama',
      icon: 'Theater',
      movieIds: movies
        .filter(m => m.genres.some(g => g.toLowerCase().includes('drama')))
        .map(m => m.id),
    },
    {
      id: 'horror',
      label: 'Horror & Thriller',
      icon: 'Skull',
      movieIds: movies
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('horror') ||
            g.toLowerCase().includes('thriller')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'family',
      label: 'Family & Kids',
      icon: 'Heart',
      movieIds: movies
        .filter(m =>
          m.genres.some(g =>
            g.toLowerCase().includes('family') ||
            g.toLowerCase().includes('kids')
          )
        )
        .map(m => m.id),
    },
    {
      id: 'public-domain',
      label: 'Public Domain Classics',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.sourceLicense.toLowerCase().includes('public domain'))
        .map(m => m.id),
    },
    {
      id: 'cc-licensed',
      label: 'Creative Commons',
      icon: 'Shield',
      movieIds: movies
        .filter(m =>
          m.sourceLicense.toLowerCase().includes('cc ') ||
          m.sourceLicense.toLowerCase().includes('creative commons')
        )
        .map(m => m.id),
    },
    {
      id: 'featured',
      label: 'Editor\'s Picks',
      icon: 'Star',
      movieIds: movies
        .filter(m => m.rating >= 7.0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .map(m => m.id),
    },
  ];

  // Filter out categories with no movies
  return categories.filter(c => c.movieIds.length > 0);
}

// ─── Fetch All Movies ────────────────────────────────────────────────────────

/**
 * Fetch movies from all streaming sources.
 * Handles failures gracefully — if one source fails, others still return data.
 */
async function fetchAllMovies(): Promise<StreamableMovie[]> {
  const allMovies: StreamableMovie[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];

  // 1. Blender Foundation (always available, hardcoded)
  try {
    const blenderMovies = getBlenderMovies();
    for (const movie of blenderMovies) {
      if (!seenIds.has(movie.id)) {
        allMovies.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    errors.push(`Blender: ${err}`);
  }

  // 2. Internet Archive (free, no API key needed)
  try {
    const archiveMovies = await fetchArchiveMovies();
    for (const movie of archiveMovies) {
      if (!seenIds.has(movie.id)) {
        allMovies.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    errors.push(`Archive: ${err}`);
  }

  // 3. YouTube Free Movies (requires API key)
  try {
    const youtubeMovies = await fetchYouTubeFreeMovies();
    for (const movie of youtubeMovies) {
      if (!seenIds.has(movie.id)) {
        allMovies.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    errors.push(`YouTube: ${err}`);
  }

  if (errors.length > 0) {
    console.warn('[StreamingPipeline] Source errors:', errors.join('; '));
  }

  return allMovies;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the full streaming catalog with categories.
 * Cached for 6 hours.
 */
export async function getStreamingCatalog(): Promise<StreamingCatalog> {
  const cacheKey = 'streaming-catalog-full';
  const cached = getCached<StreamingCatalog>(cacheKey);
  if (cached) return cached;

  const movies = await fetchAllMovies();
  const categories = buildCategories(movies);

  const catalog: StreamingCatalog = {
    movies,
    categories,
    lastUpdated: new Date().toISOString(),
  };

  setCached(cacheKey, catalog, CATALOG_CACHE_TTL);

  // Also cache individual movies for fast lookups
  for (const movie of movies) {
    setCached(`streaming-movie:${movie.id}`, movie, MOVIE_CACHE_TTL);
  }

  return catalog;
}

/**
 * Get a single streaming movie by ID.
 * Tries cache first, then falls back to full catalog fetch.
 */
export async function getStreamingMovie(id: string): Promise<StreamableMovie | null> {
  // Try cache first
  const cacheKey = `streaming-movie:${id}`;
  const cached = getCached<StreamableMovie>(cacheKey);
  if (cached) return cached;

  // If not in cache, fetch the full catalog (which will cache everything)
  const catalog = await getStreamingCatalog();
  return catalog.movies.find(m => m.id === id) || null;
}

/**
 * Search streaming movies by query.
 * Searches across all sources in parallel.
 */
export async function searchStreamingMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const q = query.toLowerCase().trim();
  const results: StreamableMovie[] = [];
  const seenIds = new Set<string>();

  // 1. Search in local catalog first (fast)
  try {
    const catalog = await getStreamingCatalog();
    for (const movie of catalog.movies) {
      const titleMatch = movie.title.toLowerCase().includes(q);
      const genreMatch = movie.genres.some(g => g.toLowerCase().includes(q));
      const descMatch = movie.description.toLowerCase().includes(q);
      if (titleMatch || genreMatch || descMatch) {
        if (!seenIds.has(movie.id)) {
          results.push(movie);
          seenIds.add(movie.id);
        }
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Local search error:', err);
  }

  // 2. Search YouTube (API-based search)
  try {
    const ytResults = await searchYouTubeFreeMovie(query);
    for (const movie of ytResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] YouTube search error:', err);
  }

  // 3. Search Internet Archive
  try {
    const archiveResults = await searchArchiveMovies(query);
    for (const movie of archiveResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Archive search error:', err);
  }

  // Sort: title matches first, then by rating
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(q) ? 0 : 1;
    const bTitle = b.title.toLowerCase().includes(q) ? 0 : 1;
    if (aTitle !== bTitle) return aTitle - bTitle;
    return b.rating - a.rating;
  });

  setCached(cacheKey, results, SEARCH_CACHE_TTL);
  return results;
}

/**
 * Get streaming movies by category.
 */
export async function getStreamingMoviesByCategory(categoryId: string): Promise<StreamableMovie[]> {
  const catalog = await getStreamingCatalog();
  const category = catalog.categories.find(c => c.id === categoryId);
  if (!category) return [];

  return category.movieIds
    .map(id => catalog.movies.find(m => m.id === id))
    .filter((m): m is StreamableMovie => m !== undefined);
}

/**
 * Get movies similar to a given movie (based on genre overlap).
 */
export async function getSimilarStreamingMovies(movieId: string, limit: number = 8): Promise<StreamableMovie[]> {
  const catalog = await getStreamingCatalog();
  const movie = catalog.movies.find(m => m.id === movieId);
  if (!movie) return [];

  const movieGenres = new Set(movie.genres.map(g => g.toLowerCase()));

  const scored = catalog.movies
    .filter(m => m.id !== movieId)
    .map(m => {
      const overlap = m.genres.filter(g => movieGenres.has(g.toLowerCase())).length;
      return { movie: m, score: overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(s => s.movie);
}

/**
 * Get streaming pipeline status.
 */
export function getStreamingPipelineStatus(): {
  sources: {
    blender: boolean;
    internetArchive: boolean;
    youtube: boolean;
  };
  cache: {
    size: number;
    hitRate: number;
  };
} {
  const stats = getCacheStats();
  return {
    sources: {
      blender: true, // Always available (hardcoded)
      internetArchive: true, // Always available (no API key needed)
      youtube: !!(process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
    },
    cache: {
      size: stats.size,
      hitRate: stats.hitRate,
    },
  };
}

/**
 * Clear all streaming pipeline cache.
 */
export function clearStreamingCache(): number {
  return clearAllCached();
}

/**
 * Refresh the streaming catalog (clear cache and re-fetch).
 */
export async function refreshStreamingCatalog(): Promise<StreamingCatalog> {
  clearAllCached();
  return getStreamingCatalog();
}
