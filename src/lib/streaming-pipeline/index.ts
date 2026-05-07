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
 *   + YouTube Regional (requires YOUTUBE_API_KEY)
 *   + Vimeo CC (curated, always available)
 *   + Public Domain Anime (curated with real Archive.org URLs)
 *   + Tubi (curated link-out catalog)
 *   + Pluto TV (curated link-out catalog)
 *   + Crackle (curated link-out catalog)
 *   + RetroCrush (curated link-out catalog)
 *   + CONtv (curated link-out catalog)
 *   + Bilibili (curated embeddable catalog)
 *   + Indie Animation (curated mixed catalog)
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
import { fetchYouTubeRegionalMovies, getRegionalConfigs } from './sources/youtube-regional';
import { fetchVimeoCCMovies, searchVimeoCCMovies } from './sources/vimeo';
import { fetchPublicDomainAnime, searchPublicDomainAnime } from './sources/public-domain-anime';
import { fetchTubiMovies, searchTubiMovies } from './sources/tubi';
import { fetchPlutoTVMovies, searchPlutoTVMovies } from './sources/pluto-tv';
import { fetchCrackleMovies, searchCrackleMovies } from './sources/crackle';
import { fetchRetroCrushMovies, searchRetroCrushMovies } from './sources/retrocrush';
import { fetchCONtvMovies, searchCONtvMovies } from './sources/contv';
import { fetchBilibiliMovies, searchBilibiliMovies } from './sources/bilibili';
import { fetchIndieAnimationMovies, searchIndieAnimationMovies } from './sources/indie-animation';

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
      id: 'anime-classics',
      label: 'Classic Anime (Public Domain)',
      icon: 'Swords',
      movieIds: movies
        .filter(m =>
          m.source === 'public-domain' &&
          m.genres.some(g => g.toLowerCase().includes('animation') || g.toLowerCase().includes('anime'))
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
      id: 'crackle-free',
      label: 'Free on Crackle',
      icon: 'Tv',
      movieIds: movies
        .filter(m => m.source === 'crackle')
        .map(m => m.id),
    },
    {
      id: 'retrocrush-anime',
      label: 'RetroCrush Anime',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.source === 'retrocrush')
        .map(m => m.id),
    },
    {
      id: 'contv-classics',
      label: 'CONtv Sci-Fi & Horror',
      icon: 'Film',
      movieIds: movies
        .filter(m => m.source === 'contv')
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
      id: 'indie-shorts',
      label: 'Indie Animation Shorts',
      icon: 'Clapperboard',
      movieIds: movies
        .filter(m => m.source === 'indie-animation')
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
      id: 'embeddable-movies',
      label: 'Watch Right Here',
      icon: 'Play',
      movieIds: movies
        .filter(m => m.isEmbeddable)
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

// ─── Fetch All Movies ────────────────────────────────────────────────────────

/**
 * Fetch movies from all streaming sources.
 * Handles failures gracefully — if one source fails, others still return data.
 */
async function fetchAllMovies(): Promise<StreamableMovie[]> {
  const allMovies: StreamableMovie[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];

  // Run all sources in parallel for speed
  const results = await Promise.allSettled([
    // 1. Blender Foundation (always available, hardcoded)
    (async () => {
      const blenderMovies = getBlenderMovies();
      for (const movie of blenderMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 2. Internet Archive (free, no API key needed)
    (async () => {
      const archiveMovies = await fetchArchiveMovies();
      for (const movie of archiveMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 3. YouTube Free Movies (requires API key)
    (async () => {
      const youtubeMovies = await fetchYouTubeFreeMovies();
      for (const movie of youtubeMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 4. YouTube Regional Movies (requires YOUTUBE_API_KEY)
    (async () => {
      const regionalMovies = await fetchYouTubeRegionalMovies();
      for (const movie of regionalMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 5. Vimeo CC (curated Creative Commons shorts)
    (async () => {
      const vimeoMovies = await fetchVimeoCCMovies();
      for (const movie of vimeoMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 6. Public Domain Anime (curated with real Archive.org URLs)
    (async () => {
      const pdAnime = await fetchPublicDomainAnime();
      for (const movie of pdAnime) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 7. Tubi (curated link-out catalog)
    (async () => {
      const tubiMovies = await fetchTubiMovies();
      for (const movie of tubiMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 8. Pluto TV (curated link-out catalog)
    (async () => {
      const plutoTVMovies = await fetchPlutoTVMovies();
      for (const movie of plutoTVMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 9. Crackle (curated link-out catalog)
    (async () => {
      const crackleMovies = await fetchCrackleMovies();
      for (const movie of crackleMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 10. RetroCrush (curated anime link-out catalog)
    (async () => {
      const retroCrushMovies = await fetchRetroCrushMovies();
      for (const movie of retroCrushMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 11. CONtv (curated sci-fi/horror link-out catalog)
    (async () => {
      const contvMovies = await fetchCONtvMovies();
      for (const movie of contvMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 12. Bilibili (curated embeddable anime catalog)
    (async () => {
      const bilibiliMovies = await fetchBilibiliMovies();
      for (const movie of bilibiliMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),

    // 13. Indie Animation (curated mixed catalog)
    (async () => {
      const indieMovies = await fetchIndieAnimationMovies();
      for (const movie of indieMovies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie);
          seenIds.add(movie.id);
        }
      }
    })(),
  ]);

  // Log any errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      errors.push(`Source${i + 1}: ${String(result.reason)}`);
    }
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

  // 4. Search Vimeo CC
  try {
    const vimeoResults = await searchVimeoCCMovies(query);
    for (const movie of vimeoResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Vimeo CC search error:', err);
  }

  // 5. Search Public Domain Anime
  try {
    const pdAnimeResults = await searchPublicDomainAnime(query);
    for (const movie of pdAnimeResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Public Domain Anime search error:', err);
  }

  // 6. Search Tubi
  try {
    const tubiResults = await searchTubiMovies(query);
    for (const movie of tubiResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Tubi search error:', err);
  }

  // 7. Search Pluto TV
  try {
    const plutoTVResults = await searchPlutoTVMovies(query);
    for (const movie of plutoTVResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Pluto TV search error:', err);
  }

  // 8. Search Crackle
  try {
    const crackleResults = await searchCrackleMovies(query);
    for (const movie of crackleResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Crackle search error:', err);
  }

  // 9. Search RetroCrush
  try {
    const retroCrushResults = await searchRetroCrushMovies(query);
    for (const movie of retroCrushResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] RetroCrush search error:', err);
  }

  // 10. Search CONtv
  try {
    const contvResults = await searchCONtvMovies(query);
    for (const movie of contvResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] CONtv search error:', err);
  }

  // 11. Search Bilibili
  try {
    const bilibiliResults = await searchBilibiliMovies(query);
    for (const movie of bilibiliResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Bilibili search error:', err);
  }

  // 12. Search Indie Animation
  try {
    const indieResults = await searchIndieAnimationMovies(query);
    for (const movie of indieResults) {
      if (!seenIds.has(movie.id)) {
        results.push(movie);
        seenIds.add(movie.id);
      }
    }
  } catch (err) {
    console.warn('[StreamingPipeline] Indie Animation search error:', err);
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
    youtubeRegional: boolean;
    vimeoCC: boolean;
    publicDomainAnime: boolean;
    tubi: boolean;
    plutoTV: boolean;
    crackle: boolean;
    retrocrush: boolean;
    contv: boolean;
    bilibili: boolean;
    indieAnimation: boolean;
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
      youtubeRegional: !!(process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
      vimeoCC: true, // Always available (curated catalog)
      publicDomainAnime: true, // Always available (curated catalog)
      tubi: true, // Always available (curated link-out catalog)
      plutoTV: true, // Always available (curated link-out catalog)
      crackle: true, // Always available (curated link-out catalog)
      retrocrush: true, // Always available (curated link-out catalog)
      contv: true, // Always available (curated link-out catalog)
      bilibili: true, // Always available (curated embeddable catalog)
      indieAnimation: true, // Always available (curated catalog)
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
