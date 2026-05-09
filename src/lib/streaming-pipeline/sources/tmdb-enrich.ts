/**
 * TMDB Enrichment Source for Streaming Pipeline
 *
 * Uses the existing TMDB client (read-only) to enrich streaming movies
 * with better metadata (posters, backdrops, ratings, genres, descriptions).
 *
 * This is SAFE because:
 * - Only reads from the TMDB API (no writes to main pipeline cache/DB)
 * - Uses the streaming pipeline's own cache (separate from main pipeline)
 * - Falls back gracefully if TMDB is unavailable
 * - Only enriches, never creates the base movie data
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const CACHE_TTL = 48 * 60 * 60 * 1000; // 48 hours (metadata rarely changes)

// ─── TMDB API Key ───────────────────────────────────────────────────────────

function getTmdbKey(): string | undefined {
  return process.env.TMDB_API_KEY;
}

// ─── TMDB Types ──────────────────────────────────────────────────────────────

interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[];
  total_results?: number;
}

interface TmdbGenreMap {
  [id: number]: string;
}

// ─── Genre Map ───────────────────────────────────────────────────────────────

const TMDB_GENRES: TmdbGenreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

function genreIdsToNames(ids: number[]): string[] {
  return ids.map(id => TMDB_GENRES[id]).filter(Boolean);
}

function getPosterUrl(path: string | undefined): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/w500${path}`;
}

function getBackdropUrl(path: string | undefined): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/original${path}`;
}

// ─── Search TMDB ────────────────────────────────────────────────────────────

/**
 * Search TMDB for a movie by title.
 * Returns the best matching result.
 */
async function searchTmdb(title: string, year?: number): Promise<TmdbSearchResult | null> {
  const apiKey = getTmdbKey();
  if (!apiKey) return null;

  const cacheKey = `streaming-tmdb-search:${title}${year ? `-${year}` : ''}`;
  const cached = getCached<TmdbSearchResult>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      include_adult: 'false',
      ...(year ? { primary_release_year: String(year) } : {}),
    }).toString();

    const res = await fetchWithTimeout(`${TMDB_BASE}/search/movie?${params}`, undefined, 8_000);
    if (!res?.ok) return null;

    const data = await safeJsonParse<TmdbSearchResponse>(res);
    if (!data?.results?.length) return null;

    const bestMatch = data.results[0];
    setCached(cacheKey, bestMatch, CACHE_TTL);
    return bestMatch;
  } catch (err) {
    console.warn(`[StreamingPipeline:TMDB] Search error for "${title}":`, err);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enrich a StreamableMovie with TMDB metadata.
 * Updates poster, backdrop, rating, genres, and description if TMDB has better data.
 * Returns a new object — does not mutate the input.
 */
export async function enrichWithTmdb(movie: StreamableMovie): Promise<StreamableMovie> {
  const tmdbResult = await searchTmdb(movie.title, movie.year || undefined);
  if (!tmdbResult) return movie;

  // Only override if TMDB has better data
  const enriched: StreamableMovie = { ...movie };

  // TMDB poster is usually higher quality
  if (tmdbResult.poster_path) {
    enriched.poster = getPosterUrl(tmdbResult.poster_path);
  }

  // TMDB backdrop is usually better
  if (tmdbResult.backdrop_path) {
    enriched.backdrop = getBackdropUrl(tmdbResult.backdrop_path);
  }

  // TMDB rating is more reliable
  if (tmdbResult.vote_average && tmdbResult.vote_average > 0) {
    enriched.rating = Math.round(tmdbResult.vote_average * 10) / 10;
  }

  // TMDB genres are more structured
  if (tmdbResult.genre_ids && tmdbResult.genre_ids.length > 0) {
    const tmdbGenres = genreIdsToNames(tmdbResult.genre_ids);
    if (tmdbGenres.length > 0) {
      enriched.genres = tmdbGenres;
    }
  }

  // TMDB description is usually more comprehensive
  if (tmdbResult.overview && tmdbResult.overview.length > movie.description.length) {
    enriched.description = tmdbResult.overview;
  }

  return enriched;
}

/**
 * Enrich a batch of StreamableMovies with TMDB metadata.
 * Processes in parallel with a concurrency limit to avoid rate limiting.
 */
export async function enrichBatchWithTmdb(
  movies: StreamableMovie[],
  concurrency: number = 3
): Promise<StreamableMovie[]> {
  const results: StreamableMovie[] = [];
  const batches: StreamableMovie[][] = [];

  for (let i = 0; i < movies.length; i += concurrency) {
    batches.push(movies.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const enriched = await Promise.all(batch.map(m => enrichWithTmdb(m)));
    results.push(...enriched);
  }

  return results;
}

/**
 * Check if TMDB enrichment is available.
 */
export function isTmdbEnrichmentAvailable(): boolean {
  return !!getTmdbKey();
}
