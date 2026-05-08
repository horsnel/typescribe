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
 *   Tier 1 (instant): Blender Foundation + Seed Data → return immediately
 *   Tier 2 (fast, <3s): Internet Archive, YouTube, Vimeo CC, YouTube Regional
 *   Tier 3 (slow, <5s): Tubi, Pluto TV, Bilibili, Plex Free, OpenFlix, Crunchyroll
 *   → Merge & Deduplicate → Build Categories → Cache → Response
 *
 * Progressive Loading:
 *   - getStreamingCatalogFast() returns Tier 1 + Tier 2 data quickly
 *   - getStreamingCatalogFull() returns everything (existing behavior)
 *   - getStreamingCatalog() returns cached data or seed data immediately,
 *     then fetches the rest in the background
 */

import type { StreamableMovie, StreamingCatalog, StreamingCategory } from './types';
import { getCached, setCached, clearAllCached, getCacheStats } from './cache';
import { getSeedMovies } from './seed';
import { getBlenderMovies } from './sources/blender';
import { fetchYouTubeFreeMovies, searchYouTubeFreeMovie, fetchYouTubeAnime } from './sources/youtube';
import { fetchArchiveMovies, searchArchiveMovies, fetchArchiveAnime, searchArchiveAnime } from './sources/internet-archive';
import { fetchYouTubeRegionalMovies, getRegionalConfigs } from './sources/youtube-regional';
import { fetchVimeoCCMovies, searchVimeoCCMovies } from './sources/vimeo';
import { fetchTubiMovies, searchTubiMovies } from './sources/tubi';
import { fetchPlutoTVMovies, searchPlutoTVMovies } from './sources/pluto-tv';
import { fetchBilibiliMovies, searchBilibiliMovies } from './sources/bilibili';
import { fetchPlexFreeMovies, searchPlexFreeMovies } from './sources/plex-free';
import { fetchOpenflixMovies, searchOpenflixMovies } from './sources/openflix';
import { fetchCrunchyrollMovies, searchCrunchyrollMovies } from './sources/crunchyroll';

// ─── Configuration ───────────────────────────────────────────────────────────

const CATALOG_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (reduced from 1 hour for fresher data)
const MOVIE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const SOURCE_TIMEOUT = 5_000; // 5 seconds per source
const TIER2_TIMEOUT = 2_000; // 2 seconds for fast sources

// ─── Background refresh state ────────────────────────────────────────────────

let backgroundRefreshInProgress = false;

// ─── Timeout Helper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Source timeout after ${ms}ms`)), ms)
    ),
  ]);
}

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
      id: 'watch-here',
      label: 'Watch Right Here',
      icon: 'Play',
      movieIds: movies
        .filter(m => m.isEmbeddable)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 30)
        .map(m => m.id),
    },
    {
      id: 'anime-all',
      label: 'Anime Collection',
      icon: 'Swords',
      movieIds: movies
        .filter(m => m.genres.some(g =>
          g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation')
        ))
        .map(m => m.id),
    },
    {
      id: 'anime-playable',
      label: 'Play Anime Now',
      icon: 'Play',
      movieIds: movies
        .filter(m =>
          m.isEmbeddable &&
          m.genres.some(g => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))
        )
        .map(m => m.id),
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
      label: "Editor's Picks",
      icon: 'Star',
      movieIds: movies
        .filter(m => m.rating >= 7.0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10)
        .map(m => m.id),
    },
    // ─── Source-Specific Categories ───
    {
      id: 'blender-cc',
      label: 'Blender Open Movies',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.source === 'blender-foundation')
        .map(m => m.id),
    },
    {
      id: 'archive-classics',
      label: 'Internet Archive Classics',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.source === 'internet-archive')
        .map(m => m.id),
    },
    {
      id: 'youtube-free',
      label: 'Free on YouTube',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'youtube')
        .map(m => m.id),
    },
    {
      id: 'vimeo-shorts',
      label: 'Vimeo Animated Shorts',
      icon: 'Clapperboard',
      movieIds: movies
        .filter(m => m.source === 'vimeo-cc')
        .map(m => m.id),
    },
    {
      id: 'anime-archive',
      label: 'Classic Anime (Archive.org)',
      icon: 'Film',
      movieIds: movies
        .filter(m =>
          m.source === 'internet-archive' &&
          m.genres.some(g => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))
        )
        .map(m => m.id),
    },
    {
      id: 'tubi-free',
      label: 'Free on Tubi',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'tubi')
        .map(m => m.id),
    },
    {
      id: 'pluto-tv',
      label: 'Free on Pluto TV',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'pluto-tv')
        .map(m => m.id),
    },
    {
      id: 'bilibili-anime',
      label: 'Bilibili Anime',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'bilibili')
        .map(m => m.id),
    },
    {
      id: 'plex-free',
      label: 'Free on Plex',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'plex-free')
        .map(m => m.id),
    },
    {
      id: 'openflix',
      label: 'OpenFlix Collection',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.source === 'openflix')
        .map(m => m.id),
    },
    {
      id: 'crunchyroll-anime',
      label: 'Crunchyroll Anime',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'crunchyroll')
        .map(m => m.id),
    },
    {
      id: 'romance',
      label: 'Romance',
      icon: 'Heart',
      movieIds: movies
        .filter(m => m.genres.some(g => g.toLowerCase().includes('romance')))
        .map(m => m.id),
    },
    {
      id: 'documentary',
      label: 'Documentary',
      icon: 'Camera',
      movieIds: movies
        .filter(m => m.genres.some(g => g.toLowerCase().includes('documentary')))
        .map(m => m.id),
    },
    {
      id: 'linkout-movies',
      label: 'Watch Free on Streaming Services',
      icon: 'ExternalLink',
      movieIds: movies
        .filter(m => m.videoType === 'linkout')
        .map(m => m.id),
    },
    {
      id: 'all-free-streaming',
      label: 'All Free Streaming',
      icon: 'Play',
      movieIds: movies
        .sort((a, b) => b.rating - a.rating)
        .map(m => m.id),
    },
  ];

  // Country-specific categories from YouTube Regional
  const regionalConfigs = getRegionalConfigs();
  for (const config of regionalConfigs) {
    const regionMovies = movies.filter(m => {
      return m.id.includes(`-${config.code.toLowerCase()}-`) ||
             m.id.startsWith(`yt-${config.code.toLowerCase()}-`);
    });
    if (regionMovies.length > 0) {
      categories.push({
        id: `country-${config.code.toLowerCase()}`,
        label: config.name + ' Cinema',
        icon: 'Globe',
        movieIds: regionMovies.map(m => m.id),
      });
    }
  }

  // Filter out categories with no movies
  return categories.filter(c => c.movieIds.length > 0);
}

// ─── Deduplication Helper ────────────────────────────────────────────────────

function deduplicateMovies(movies: StreamableMovie[]): StreamableMovie[] {
  const seen = new Set<string>();
  const result: StreamableMovie[] = [];
  for (const movie of movies) {
    if (!seen.has(movie.id)) {
      seen.add(movie.id);
      result.push(movie);
    }
  }
  return result;
}

// ─── Tier 1: Instant (no network) ────────────────────────────────────────────

/**
 * Tier 1 sources: Blender (hardcoded) + seed data.
 * Returns immediately with no network calls.
 */
function fetchTier1Movies(): StreamableMovie[] {
  const blenderMovies = getBlenderMovies();
  const seedMovies = getSeedMovies();
  // Deduplicate — blender movies exist in both
  return deduplicateMovies([...blenderMovies, ...seedMovies]);
}

// ─── Tier 2: Fast (<3s) ─────────────────────────────────────────────────────

/**
 * Tier 2 sources: Internet Archive, YouTube, Vimeo CC, YouTube Regional.
 * These are generally fast APIs that respond within 3 seconds.
 */
async function fetchTier2Movies(): Promise<StreamableMovie[]> {
  const results = await Promise.allSettled([
    // Internet Archive Movies (real API, usually fast)
    withTimeout(fetchArchiveMovies(), TIER2_TIMEOUT),

    // Internet Archive Anime (anime-specific searches)
    withTimeout(fetchArchiveAnime(), TIER2_TIMEOUT),

    // YouTube Free Movies (requires YOUTUBE_API_KEY)
    withTimeout(fetchYouTubeFreeMovies(), TIER2_TIMEOUT),

    // YouTube Anime (requires YOUTUBE_API_KEY)
    withTimeout(fetchYouTubeAnime(), TIER2_TIMEOUT),

    // YouTube Regional (requires YOUTUBE_API_KEY)
    withTimeout(fetchYouTubeRegionalMovies(), TIER2_TIMEOUT),

    // Vimeo CC (verified CC-licensed videos)
    withTimeout(fetchVimeoCCMovies(), TIER2_TIMEOUT),
  ]);

  const sourceNames = ['Archive-Movies', 'Archive-Anime', 'YouTube', 'YouTube-Anime', 'YouTube-Regional', 'Vimeo-CC'];
  const allMovies: StreamableMovie[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      allMovies.push(...result.value);
    } else if (result.status === 'rejected') {
      console.warn(`[StreamingPipeline:Tier2] ${sourceNames[i]}: ${String(result.reason)}`);
    }
  }

  return allMovies;
}

// ─── Tier 3: Slow (<8s) ─────────────────────────────────────────────────────

/**
 * Tier 3 sources: Tubi, Pluto TV, Bilibili, Plex Free, OpenFlix.
 * These are slower APIs or require multiple round trips.
 */
async function fetchTier3Movies(): Promise<StreamableMovie[]> {
  const results = await Promise.allSettled([
    // Tubi (real API search, linkout)
    withTimeout(fetchTubiMovies(), SOURCE_TIMEOUT),

    // Pluto TV (real API, linkout)
    withTimeout(fetchPlutoTVMovies(), SOURCE_TIMEOUT),

    // Bilibili (real API search, embeddable!)
    withTimeout(fetchBilibiliMovies(), SOURCE_TIMEOUT),

    // Plex Free (real API, linkout)
    withTimeout(fetchPlexFreeMovies(), SOURCE_TIMEOUT),

    // OpenFlix (Archive.org based, direct play)
    withTimeout(fetchOpenflixMovies(), SOURCE_TIMEOUT),

    // Crunchyroll (curated anime, linkout)
    withTimeout(fetchCrunchyrollMovies(), SOURCE_TIMEOUT),
  ]);

  const sourceNames = ['Tubi', 'PlutoTV', 'Bilibili', 'Plex-Free', 'OpenFlix', 'Crunchyroll'];
  const allMovies: StreamableMovie[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      allMovies.push(...result.value);
    } else if (result.status === 'rejected') {
      console.warn(`[StreamingPipeline:Tier3] ${sourceNames[i]}: ${String(result.reason)}`);
    }
  }

  return allMovies;
}

// ─── Fetch All Movies (existing behavior, kept for compatibility) ────────────

/**
 * Fetch movies from all streaming sources.
 * Each source has an 8-second timeout. Failed sources return empty arrays.
 * NO mock data fallback — all data comes from real APIs.
 */
async function fetchAllMovies(): Promise<StreamableMovie[]> {
  const tier1 = fetchTier1Movies();
  const [tier2, tier3] = await Promise.all([
    fetchTier2Movies(),
    fetchTier3Movies(),
  ]);

  return deduplicateMovies([...tier1, ...tier2, ...tier3]);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get a fast streaming catalog with Tier 1 + Tier 2 data.
 * Returns quickly (typically within 3 seconds).
 * Use this for initial page load.
 */
export async function getStreamingCatalogFast(): Promise<StreamingCatalog> {
  const cacheKey = 'streaming-catalog-fast';
  const cached = getCached<StreamingCatalog>(cacheKey);
  if (cached) return cached;

  const tier1 = fetchTier1Movies();
  const tier2 = await fetchTier2Movies();
  const movies = deduplicateMovies([...tier1, ...tier2]);
  const categories = buildCategories(movies);

  const catalog: StreamingCatalog = {
    movies,
    categories,
    lastUpdated: new Date().toISOString(),
  };

  setCached(cacheKey, catalog, CATALOG_CACHE_TTL);

  // Also cache individual movies
  for (const movie of movies) {
    setCached(`streaming-movie:${movie.id}`, movie, MOVIE_CACHE_TTL);
  }

  return catalog;
}

/**
 * Get the full streaming catalog with all tiers.
 * This fetches from ALL sources and may take up to 30+ seconds on cold start.
 * Use getStreamingCatalog() for progressive loading instead.
 */
export async function getStreamingCatalogFull(): Promise<StreamingCatalog> {
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

  // Also update the fast cache with the full data
  setCached('streaming-catalog-fast', catalog, CATALOG_CACHE_TTL);

  // Cache individual movies for fast lookups
  for (const movie of movies) {
    setCached(`streaming-movie:${movie.id}`, movie, MOVIE_CACHE_TTL);
  }

  return catalog;
}

/**
 * Get the streaming catalog with progressive loading support.
 *
 * Strategy:
 * 1. If cached catalog exists → return immediately
 * 2. If no cache → return seed data (Tier 1) immediately, then
 *    trigger a background refresh to populate the full catalog
 * 3. Next request will get the cached full catalog
 */
export async function getStreamingCatalog(): Promise<StreamingCatalog> {
  // Try full cache first
  const fullCacheKey = 'streaming-catalog-full';
  const cached = getCached<StreamingCatalog>(fullCacheKey);
  if (cached) return cached;

  // Try fast cache
  const fastCacheKey = 'streaming-catalog-fast';
  const fastCached = getCached<StreamingCatalog>(fastCacheKey);
  if (fastCached) return fastCached;

  // No cache — return seed data immediately and trigger background refresh
  const seedMovies = getSeedMovies();
  const seedCategories = buildCategories(seedMovies);

  const seedCatalog: StreamingCatalog = {
    movies: seedMovies,
    categories: seedCategories,
    lastUpdated: new Date().toISOString(),
  };

  // Trigger background refresh (non-blocking)
  triggerBackgroundRefresh();

  return seedCatalog;
}

/**
 * Trigger a background refresh of the full catalog.
 * Does not block the current request.
 */
function triggerBackgroundRefresh(): void {
  if (backgroundRefreshInProgress) return;
  backgroundRefreshInProgress = true;

  // Use setImmediate-like pattern to avoid blocking
  getStreamingCatalogFull()
    .then(catalog => {
      console.log(`[StreamingPipeline] Background refresh complete: ${catalog.movies.length} movies`);
    })
    .catch(err => {
      console.warn('[StreamingPipeline] Background refresh failed:', err);
    })
    .finally(() => {
      backgroundRefreshInProgress = false;
    });
}

/**
 * Get a single streaming movie by ID.
 * Tries cache first, then tries fast-path lookup from individual sources,
 * then falls back to full catalog fetch.
 */
export async function getStreamingMovie(id: string): Promise<StreamableMovie | null> {
  // Try cache first
  const cacheKey = `streaming-movie:${id}`;
  const cached = getCached<StreamableMovie>(cacheKey);
  if (cached) return cached;

  // Check seed data
  const seedMovies = getSeedMovies();
  const seedMovie = seedMovies.find(m => m.id === id);
  if (seedMovie) return seedMovie;

  // Fast-path: try to resolve from individual sources based on ID prefix
  try {
    const fastMovie = await resolveMovieFromId(id);
    if (fastMovie) {
      setCached(cacheKey, fastMovie, MOVIE_CACHE_TTL);
      return fastMovie;
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Fast-path lookup failed, falling back to catalog:', err);
  }

  // If fast-path fails, fetch the full catalog (which will cache everything)
  const catalog = await getStreamingCatalog();
  return catalog.movies.find(m => m.id === id) || null;
}

/**
 * Fast-path: resolve a movie from its ID by looking up just the relevant source.
 */
async function resolveMovieFromId(id: string): Promise<StreamableMovie | null> {
  // Blender movies (hardcoded, instant)
  if (id.startsWith('blender-')) {
    const blenderMovies = getBlenderMovies();
    return blenderMovies.find(m => m.id === id) || null;
  }

  // Vimeo CC
  if (id.startsWith('vimeo-')) {
    const vimeoMovies = await fetchVimeoCCMovies();
    return vimeoMovies.find(m => m.id === id) || null;
  }

  // Tubi
  if (id.startsWith('tubi-')) {
    const tubiMovies = await fetchTubiMovies();
    return tubiMovies.find(m => m.id === id) || null;
  }

  // Pluto TV
  if (id.startsWith('plutotv-')) {
    const plutoMovies = await fetchPlutoTVMovies();
    return plutoMovies.find(m => m.id === id) || null;
  }

  // Bilibili
  if (id.startsWith('bilibili-')) {
    const bilibiliMovies = await fetchBilibiliMovies();
    return bilibiliMovies.find(m => m.id === id) || null;
  }

  // Internet Archive
  if (id.startsWith('archive-')) {
    const archiveMovies = await fetchArchiveMovies();
    return archiveMovies.find(m => m.id === id) || null;
  }

  // OpenFlix
  if (id.startsWith('openflix-')) {
    const openflixMovies = await fetchOpenflixMovies();
    return openflixMovies.find(m => m.id === id) || null;
  }

  // Plex Free
  if (id.startsWith('plex-')) {
    const plexMovies = await fetchPlexFreeMovies();
    return plexMovies.find(m => m.id === id) || null;
  }

  // YouTube (needs API call)
  if (id.startsWith('youtube-') || id.startsWith('yt-')) {
    const ytMovies = await fetchYouTubeFreeMovies();
    const found = ytMovies.find(m => m.id === id);
    if (found) return found;
    // Try regional
    const regionalMovies = await fetchYouTubeRegionalMovies();
    return regionalMovies.find(m => m.id === id) || null;
  }

  // Crunchyroll (curated anime)
  if (id.startsWith('crunchyroll-')) {
    const crunchyrollMovies = await fetchCrunchyrollMovies();
    return crunchyrollMovies.find(m => m.id === id) || null;
  }

  return null;
}

/**
 * Search streaming movies by query.
 * Searches across all sources.
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

  // 2. Search individual APIs in parallel
  const apiSearches = await Promise.allSettled([
    searchYouTubeFreeMovie(query),
    searchArchiveMovies(query),
    searchArchiveAnime(query),
    searchVimeoCCMovies(query),
    searchTubiMovies(query),
    searchPlutoTVMovies(query),
    searchBilibiliMovies(query),
    searchPlexFreeMovies(query),
    searchOpenflixMovies(query),
    searchCrunchyrollMovies(query),
  ]);

  for (const result of apiSearches) {
    if (result.status === 'fulfilled' && result.value) {
      for (const movie of result.value) {
        if (!seenIds.has(movie.id)) {
          results.push(movie);
          seenIds.add(movie.id);
        }
      }
    }
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
    internetArchiveAnime: boolean;
    youtube: boolean;
    youtubeAnime: boolean;
    youtubeRegional: boolean;
    vimeoCC: boolean;
    tubi: boolean;
    plutoTV: boolean;
    bilibili: boolean;
    plexFree: boolean;
    openflix: boolean;
    crunchyroll: boolean;
  };
  cache: {
    size: number;
    hitRate: number;
  };
  backgroundRefreshInProgress: boolean;
} {
  const stats = getCacheStats();
  return {
    sources: {
      blender: true, // Always available (real CC videos)
      internetArchive: true, // Always available (no API key needed)
      internetArchiveAnime: true, // Always available (no API key needed)
      youtube: !!(process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
      youtubeAnime: !!(process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
      youtubeRegional: !!(process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
      vimeoCC: true, // Always available (verified CC videos)
      tubi: true, // Always available (public API)
      plutoTV: true, // Always available (public API)
      bilibili: true, // Always available (public API)
      plexFree: true, // Always available (public API)
      openflix: true, // Always available (Archive.org based)
      crunchyroll: true, // Always available (curated anime linkouts)
    },
    cache: {
      size: stats.size,
      hitRate: stats.hitRate,
    },
    backgroundRefreshInProgress,
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
 * Uses the full fetch (all tiers).
 */
export async function refreshStreamingCatalog(): Promise<StreamingCatalog> {
  clearAllCached();
  return getStreamingCatalogFull();
}
