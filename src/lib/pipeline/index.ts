/**
 * Pipeline Orchestrator — The central entry point for the data pipeline.
 *
 * Architecture: Free-First Pipeline
 *
 * Free Sources (Primary): TMDb + OMDb + AniList + Jikan + Fanart.tv + iTunes + 6 Tier-A scrapers
 * Fallback Sources (gaps): 7 Tier-B scrapers + 3 Tier-C scrapers (ScrapingAnt-dependent)
 *
 * Trailer Strategy: TMDb Videos → iTunes → YouTube Data API → Embed
 *
 * Data flow:
 *   Request → Cache check → TMDb foundation → Free sources first →
 *   Fallback scrapers (gap-fill) → Merge → Cache → Response
 *
 * Usage:
 *   import { getMovie, browseMovies, searchMovies } from '@/lib/pipeline';
 */

import type { Movie, BrowseFilters, MediaFormat } from '@/lib/types';
import { mergeMovieData, mergeMovieBatch, type PipelineConfig, type MergedMovieResult, type BatchMergeResult, ALL_SCRAPER_NAMES } from '@/lib/pipeline/merger';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import * as OMDb from '@/lib/pipeline/clients/omdb';
import * as AniList from '@/lib/pipeline/clients/anilist';
import * as Cache from '@/lib/pipeline/cache';
import { getPipelineHealthReport, type PipelineHealthReport } from '@/lib/pipeline/core/health-monitor';
import { getScrapingBeeStats, isScrapingBeeConfigured } from '@/lib/pipeline/core/scrapingbee';
import { getAllCircuitStates, resetCircuit, resetAllCircuits } from '@/lib/pipeline/core/circuit-breaker';

// ─── Pipeline Status ───

interface PipelineStatus {
  configured: boolean;
  scrapingEnabled: boolean;
  sources: {
    // Free APIs (Primary)
    tmdb: boolean;
    omdb: boolean;
    itunes: boolean;
    youtube: boolean;
    newsapi: boolean;
    newsdataIo: boolean;
    fanartTv: boolean;
    gemini: boolean;
    anilist: boolean;
    jikan: boolean;
    // Scrapers (Free Tier-A primary + Fallback Tier-B/C)
    scrapers: Record<string, { tier: string; enabled: boolean; circuitOpen: boolean }>;
  };
  cache: {
    totalEntries: number;
    hitRate: number;
    avgCompleteness: number;
  };
  scrapingAnt: {
    configured: boolean;
    totalRequests: number;
    successRate: number;
    totalUsed: number;
    totalRemaining: number;
    activeKeys: number;
    keyStats: any;
  };
  omdbDaily: {
    used: number;
    limit: number;
    remaining: number;
  };
}

/**
 * Get the current pipeline status — which sources are configured, cache stats, etc.
 */
export function getPipelineStatus(): PipelineStatus {
  const tmdbKey = process.env.TMDB_API_KEY || '';
  const omdbKey = process.env.OMDB_API_KEY || '';
  const cacheStats = Cache.getCacheStats();
  const omdbStats = OMDb.getOmdbDailyStats();
  const sbStats = getScrapingBeeStats();
  const circuitStates = getAllCircuitStates();

  // Build scraper status map
  const scrapers: Record<string, { tier: string; enabled: boolean; circuitOpen: boolean }> = {};
  const tierMap: Record<string, string> = {
    wikipedia: 'a', senscritique: 'a', filmweb: 'a', csfd: 'a', dramabeans: 'a',
    animenewsnetwork: 'a',
    rottentomatoes: 'b', metacritic: 'b', mydramalist: 'b', commonsensemedia: 'b',
    thenumbers: 'b', filmaffinity: 'b', allocine: 'b',
    boxofficemojo: 'c', douban: 'c', kinopoisk: 'c',
  };

  for (const name of ALL_SCRAPER_NAMES) {
    const circuit = circuitStates[name];
    scrapers[name] = {
      tier: tierMap[name] || 'b',
      enabled: !circuit || circuit.state !== 'open',
      circuitOpen: circuit?.state === 'open',
    };
  }

  return {
    configured: !!(tmdbKey && omdbKey),
    scrapingEnabled: isScrapingBeeConfigured(),
    sources: {
      tmdb: !!tmdbKey,
      omdb: !!omdbKey,
      itunes: true, // Always configured (free, no key needed)
      youtube: !!process.env.YOUTUBE_API_KEY,
      newsapi: !!process.env.NEWS_API_KEY,
      newsdataIo: !!process.env.NEWSDATA_IO_API_KEY,
      fanartTv: !!process.env.FANART_TV_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      anilist: true, // Always configured (free API, no key needed)
      jikan: true, // Always configured (free API, no key needed — MAL proxy)
      scrapers,
    },
    cache: {
      totalEntries: cacheStats.totalEntries,
      hitRate: cacheStats.hitRate,
      avgCompleteness: cacheStats.avgCompleteness,
    },
    scrapingAnt: {
      configured: sbStats.configured,
      totalRequests: sbStats.totalRequests,
      successRate: sbStats.successRate,
      totalUsed: sbStats.totalUsed,
      totalRemaining: sbStats.totalRemaining,
      activeKeys: sbStats.activeKeys,
      keyStats: sbStats.keyStats,
    },
    omdbDaily: {
      used: omdbStats.used,
      limit: omdbStats.limit,
      remaining: omdbStats.remaining,
    },
  };
}

// ─── Get a Single Movie ───

/**
 * Get a fully-merged movie by TMDb ID.
 * Runs the full 70/30 pipeline: scraping + APIs.
 */
export async function getMovie(tmdbId: number, config?: PipelineConfig): Promise<MergedMovieResult> {
  // Check cache
  const cacheKey = `tmdb:${tmdbId}`;
  const cached = Cache.getCachedMovie(cacheKey);
  if (cached) {
    return {
      movie: cached.movie,
      sources: cached.sources,
      completeness: cached.completeness,
      warnings: ['Served from cache'],
      durationMs: 0,
    };
  }

  // Run pipeline
  const result = await mergeMovieData(tmdbId, config);

  // Cache the result (only if we got useful data)
  if (result.completeness > 0) {
    Cache.setCachedMovie(cacheKey, result.movie, result.sources, result.completeness);
    // Also cache by slug for slug-based lookups
    Cache.setCachedMovie(`slug:${result.movie.slug}`, result.movie, result.sources, result.completeness);
  }

  return result;
}

/**
 * Get a movie by its slug.
 */
export async function getMovieBySlug(slug: string, config?: PipelineConfig): Promise<MergedMovieResult | null> {
  // Check cache by slug first
  const cacheKey = `slug:${slug}`;
  const cached = Cache.getCachedMovie(cacheKey);
  if (cached) {
    return {
      movie: cached.movie,
      sources: cached.sources,
      completeness: cached.completeness,
      warnings: ['Served from cache'],
      durationMs: 0,
    };
  }

  // Try to extract TMDb ID from slug (format: "title-123")
  const slugIdMatch = slug.match(/-(\d+)$/);
  if (slugIdMatch) {
    const tmdbId = parseInt(slugIdMatch[1], 10);
    if (tmdbId > 0) {
      console.log(`[Pipeline] Resolving slug "${slug}" to TMDb ID ${tmdbId}`);
      try {
        const result = await getMovie(tmdbId, config);
        if (result.movie) return result;
      } catch (err) {
        console.warn(`[Pipeline] Failed to fetch TMDb ID ${tmdbId} from slug`, err);
      }
    }
  }

  // If no ID in slug, try searching TMDb by title
  const titlePart = slug.replace(/-/g, ' ').replace(/\s+\d+$/, '').trim();
  if (titlePart.length >= 2) {
    console.log(`[Pipeline] Searching TMDb for title: "${titlePart}"`);
    try {
      const searchResult = await TMDb.searchMulti(titlePart);
      if (searchResult && searchResult.length > 0) {
        const firstMatch = searchResult[0];
        const result = await getMovie(firstMatch.tmdb_id, config);
        if (result.movie) return result;
      }
    } catch (err) {
      console.warn(`[Pipeline] Search for slug "${slug}" failed`, err);
    }
  }

  return null;
}

// ─── Browse / Discover ───

export interface BrowseResult {
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
  sources: string[];
  durationMs: number;
}

/**
 * Browse movies using TMDb discover API with the configured filters.
 * For list views, we use TMDb directly — scraping happens on detail pages.
 */
export async function browseMovies(filters: {
  format: MediaFormat;
  country?: string;
  genreIds?: number[];
  themeKeywordId?: number | null;
  sort?: string;
  minRating?: number;
  yearFrom?: number;
  yearTo?: number;
  page?: number;
}, config?: PipelineConfig): Promise<BrowseResult> {
  const start = Date.now();
  const sources: string[] = [];
  const genreStr = filters.genreIds?.join(',');
  const isTv = filters.format === 'tv';
  const isAnime = filters.format === 'anime';

  let movies: Movie[] = [];
  let page = filters.page || 1;
  let totalPages = 1;
  let totalResults = 0;

  // Anime browse: Use TMDb discover with Animation genre (16) + JP origin
  if (isAnime) {
    const animeGenres = filters.genreIds
      ? `${filters.genreIds.join(',')},16`
      : '16';
    const animeCountries = filters.country && filters.country !== 'all'
      ? filters.country
      : undefined;

    // Try TV first (most anime is TV), then movies
    const [tvResult, movieResult] = await Promise.all([
      TMDb.discoverTv({
        with_origin_country: animeCountries || 'JP',
        with_genres: animeGenres,
        with_keywords: filters.themeKeywordId ? String(filters.themeKeywordId) : undefined,
        sort_by: filters.sort || 'popularity.desc',
        'vote_average.gte': filters.minRating || undefined,
        first_air_date_gte: filters.yearFrom ? `${filters.yearFrom}-01-01` : undefined,
        first_air_date_lte: filters.yearTo ? `${filters.yearTo}-12-31` : undefined,
        page,
        'vote_count.gte': 20,
      }, config?.tmdbApiKey || undefined),
      TMDb.discoverMovies({
        with_origin_country: animeCountries || 'JP',
        with_genres: animeGenres,
        with_keywords: filters.themeKeywordId ? String(filters.themeKeywordId) : undefined,
        sort_by: filters.sort || 'popularity.desc',
        'vote_average.gte': filters.minRating || undefined,
        primary_release_date_gte: filters.yearFrom ? `${filters.yearFrom}-01-01` : undefined,
        primary_release_date_lte: filters.yearTo ? `${filters.yearTo}-12-31` : undefined,
        page,
        'vote_count.gte': 50,
      }, config?.tmdbApiKey || undefined),
    ]);

    // Merge TV and movie anime results, marking as anime
    const tvMovies = (tvResult?.results || []).map(m => ({ ...m, media_type: 'anime' as const, is_anime: true }));
    const movieMovies = (movieResult?.results || []).map(m => ({ ...m, media_type: 'anime' as const, is_anime: true }));

    // Combine and deduplicate by tmdb_id
    const seen = new Set<number>();
    for (const m of [...tvMovies, ...movieMovies]) {
      if (!seen.has(m.tmdb_id)) {
        movies.push(m);
        seen.add(m.tmdb_id);
      }
    }

    // Use TV pagination as primary (most anime is TV format)
    page = tvResult?.page || 1;
    totalPages = Math.max(tvResult?.total_pages || 1, movieResult?.total_pages || 1);
    totalResults = (tvResult?.total_results || 0) + (movieResult?.total_results || 0);
    if (tvResult || movieResult) sources.push('TMDb');
  } else if (isTv) {
    const result = await TMDb.discoverTv({
      with_origin_country: filters.country && filters.country !== 'all' ? filters.country : undefined,
      with_genres: genreStr || undefined,
      with_keywords: filters.themeKeywordId ? String(filters.themeKeywordId) : undefined,
      sort_by: filters.sort || 'popularity.desc',
      'vote_average.gte': filters.minRating || undefined,
      first_air_date_gte: filters.yearFrom ? `${filters.yearFrom}-01-01` : undefined,
      first_air_date_lte: filters.yearTo ? `${filters.yearTo}-12-31` : undefined,
      page,
      'vote_count.gte': 20,
    }, config?.tmdbApiKey || undefined);

    if (result) {
      movies = result.results;
      page = result.page;
      totalPages = result.total_pages;
      totalResults = result.total_results;
      sources.push('TMDb');
    }
  } else {
    const result = await TMDb.discoverMovies({
      with_origin_country: filters.country && filters.country !== 'all' ? filters.country : undefined,
      with_genres: genreStr || undefined,
      with_keywords: filters.themeKeywordId ? String(filters.themeKeywordId) : undefined,
      sort_by: filters.sort || 'popularity.desc',
      'vote_average.gte': filters.minRating || undefined,
      primary_release_date_gte: filters.yearFrom ? `${filters.yearFrom}-01-01` : undefined,
      primary_release_date_lte: filters.yearTo ? `${filters.yearTo}-12-31` : undefined,
      page,
      'vote_count.gte': 50,
    }, config?.tmdbApiKey || undefined);

    if (result) {
      movies = result.results;
      page = result.page;
      totalPages = result.total_pages;
      totalResults = result.total_results;
      sources.push('TMDb');
    }
  }

  return { movies, page, totalPages, totalResults, sources, durationMs: Date.now() - start };
}

// ─── Search ───

export interface SearchResult {
  movies: Movie[];
  totalResults: number;
  sources: string[];
  durationMs: number;
}

export async function searchMovies(query: string, config?: PipelineConfig): Promise<SearchResult> {
  const start = Date.now();
  const sources: string[] = [];

  const results = await TMDb.searchMulti(query, config?.tmdbApiKey || undefined);
  if (results) {
    sources.push('TMDb');
  }

  return {
    movies: results || [],
    totalResults: results?.length || 0,
    sources,
    durationMs: Date.now() - start,
  };
}

// ─── Anime Search (AniList + TMDb) ───

export async function searchAnime(query: string): Promise<SearchResult> {
  const start = Date.now();
  const sources: string[] = [];
  const movies: Movie[] = [];

  // Search AniList first (anime-specific)
  try {
    const anilistResults = await AniList.searchAnime(query);
    if (anilistResults && anilistResults.length > 0) {
      sources.push('AniList');
      for (const result of anilistResults.slice(0, 10)) {
        movies.push({
          id: result.anilistId,
          tmdb_id: 0, // Will be resolved on detail page
          slug: (result.title.english || result.title.romaji || 'unknown')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-${result.anilistId}`,
          title: result.title.english || result.title.romaji || 'Unknown',
          original_title: result.title.native || result.title.romaji || '',
          overview: result.description?.replace(/<[^>]*>/g, '').trim() || '',
          release_date: result.startDate?.year
            ? `${result.startDate.year}-${String(result.startDate.month || 1).padStart(2, '0')}-${String(result.startDate.day || 1).padStart(2, '0')}`
            : '',
          poster_path: result.coverImage?.large || '',
          backdrop_path: result.bannerImage || '',
          genres: (result.genres || []).map(g => ({ id: -1, name: g })),
          runtime: result.duration || 0,
          vote_average: (result.meanScore || 0) / 10,
          vote_count: 0,
          imdb_rating: '',
          rotten_tomatoes: '',
          metascore: '',
          trailer_youtube_id: '',
          news_headlines: [],
          ai_review: '',
          director: '',
          cast: [],
          tagline: '',
          budget: 0,
          revenue: 0,
          original_language: 'ja',
          origin_country: 'JP',
          media_type: 'anime',
          production_companies: result.studios || [],
          status: result.status || '',
          created_at: new Date().toISOString(),
          is_anime: true,
          anime_mal_id: result.malId || undefined,
          anime_mal_score: result.meanScore ? Math.round((result.meanScore / 10) * 10) / 10 : undefined,
          anime_studios: result.studios || undefined,
          anime_source: result.source || undefined,
          anime_season: result.season && result.seasonYear
            ? `${result.season.charAt(0).toUpperCase() + result.season.slice(1).toLowerCase()} ${result.seasonYear}`
            : undefined,
          anime_tags: result.tags?.filter(t => t.rank >= 60).map(t => t.name) || undefined,
          anime_streaming: result.streaming?.map(s => ({ platform: s.site, url: s.url })) || undefined,
          anime_episodes_aired: result.nextAiringEpisode?.episode ? result.nextAiringEpisode.episode - 1 : result.episodes || undefined,
          anime_next_episode: result.nextAiringEpisode
            ? new Date(result.nextAiringEpisode.airingAt * 1000).toISOString() : undefined,
        });
      }
    }
  } catch (err) {
    console.warn('[Pipeline] AniList search error:', err);
  }

  // Also search TMDb for anime (as fallback/supplement)
  try {
    const tmdbResults = await TMDb.searchAnime(query);
    if (tmdbResults && tmdbResults.length > 0) {
      sources.push('TMDb');
      const existingTitles = new Set(movies.map(m => m.title.toLowerCase()));
      for (const m of tmdbResults) {
        if (!existingTitles.has(m.title.toLowerCase())) {
          movies.push({ ...m, media_type: 'anime', is_anime: true });
        }
      }
    }
  } catch (err) {
    console.warn('[Pipeline] TMDb anime search error:', err);
  }

  return {
    movies,
    totalResults: movies.length,
    sources,
    durationMs: Date.now() - start,
  };
}

// ─── Trending / Top Rated / Now Playing ───

export async function getTrending(timeWindow: 'day' | 'week' = 'week'): Promise<BrowseResult> {
  const start = Date.now();
  const result = await TMDb.getTrending(timeWindow);

  return {
    movies: result?.results || [],
    page: result?.page || 1,
    totalPages: result?.total_pages || 1,
    totalResults: result?.total_results || 0,
    sources: result ? ['TMDb'] : [],
    durationMs: Date.now() - start,
  };
}

export async function getTopRated(page: number = 1): Promise<BrowseResult> {
  const start = Date.now();
  const result = await TMDb.getTopRated(page);

  return {
    movies: result?.results || [],
    page: result?.page || 1,
    totalPages: result?.total_pages || 1,
    totalResults: result?.total_results || 0,
    sources: result ? ['TMDb'] : [],
    durationMs: Date.now() - start,
  };
}

export async function getNowPlaying(page: number = 1): Promise<BrowseResult> {
  const start = Date.now();
  const result = await TMDb.getNowPlaying(page);

  return {
    movies: result?.results || [],
    page: result?.page || 1,
    totalPages: result?.total_pages || 1,
    totalResults: result?.total_results || 0,
    sources: result ? ['TMDb'] : [],
    durationMs: Date.now() - start,
  };
}

export async function getUpcoming(page: number = 1): Promise<BrowseResult> {
  const start = Date.now();
  const result = await TMDb.getUpcoming(page);

  return {
    movies: result?.results || [],
    page: result?.page || 1,
    totalPages: result?.total_pages || 1,
    totalResults: result?.total_results || 0,
    sources: result ? ['TMDb'] : [],
    durationMs: Date.now() - start,
  };
}

// ─── Batch Processing ───

export async function processBatch(
  tmdbIds: number[],
  config?: PipelineConfig,
): Promise<BatchMergeResult> {
  return mergeMovieBatch(tmdbIds, config);
}

// ─── Health & Admin ───

export { getPipelineHealthReport, type PipelineHealthReport };
export { resetCircuit, resetAllCircuits, getAllCircuitStates };

// ─── Cache Management ───

export { clearAllCachedMovies, pruneCache, getCacheStats, getAllCachedMovies } from '@/lib/pipeline/cache';
export { clearTmdbCache } from '@/lib/pipeline/clients/tmdb';
export { clearOmdbCache } from '@/lib/pipeline/clients/omdb';

// ─── Fallback: Use Mock Data ───

export function isPipelineConfigured(): boolean {
  return !!(process.env.TMDB_API_KEY);
}

export async function getMoviesWithFallback(
  source: 'trending' | 'top_rated' | 'now_playing',
  page: number = 1,
): Promise<{ movies: Movie[]; fromAPI: boolean }> {
  if (isPipelineConfigured()) {
    let result: BrowseResult;
    switch (source) {
      case 'trending':
        result = await getTrending('week');
        break;
      case 'top_rated':
        result = await getTopRated(page);
        break;
      case 'now_playing':
        result = await getNowPlaying(page);
        break;
    }
    return { movies: result.movies, fromAPI: true };
  }

  const { movies } = await import('@/lib/data');
  return { movies: movies, fromAPI: false };
}
