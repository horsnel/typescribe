/**
 * TMDb API v3 Client for O.L.H.M.E.S
 * https://developer.themoviedb.org/docs
 */

import { withCache } from './cache';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) {
    console.warn('[TMDb] NEXT_PUBLIC_TMDB_API_KEY is not set');
  }
  return key ?? '';
}

// ─── Image helpers ───────────────────────────────────────────────────────────

export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export function imageUrl(path: string | null, size: ImageSize = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface TMDbPageResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface TMDbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

// ─── Movie Types ─────────────────────────────────────────────────────────────

export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  video: boolean;
}

export interface TMDbMovieDetail extends TMDbMovie {
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  budget: number;
  genres: TMDbGenre[];
  homepage: string | null;
  imdb_id: string | null;
  origin_country: string[];
  overview: string;
  popularity: number;
  production_companies: TMDbProductionCompany[];
  production_countries: TMDbProductionCountry[];
  revenue: number;
  runtime: number | null;
  spoken_languages: TMDbSpokenLanguage[];
  status: string;
  tagline: string | null;
}

export interface TMDbCreditPerson {
  adult: boolean;
  gender: number | null;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
}

export interface TMDbCastMember extends TMDbCreditPerson {
  cast_id: number;
  character: string;
  credit_id: string;
  order: number;
}

export interface TMDbCrewMember extends TMDbCreditPerson {
  credit_id: string;
  department: string;
  job: string;
}

export interface TMDbCredits {
  id: number;
  cast: TMDbCastMember[];
  crew: TMDbCrewMember[];
}

export interface TMDbVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string;
  size: number;
  type: string;
}

export interface TMDbVideosResponse {
  id: number;
  results: TMDbVideo[];
}

// ─── Trending Types ──────────────────────────────────────────────────────────

export type TMDbTimeWindow = 'day' | 'week';

// ─── API Response Wrapper ────────────────────────────────────────────────────

export interface TMDbResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

// ─── Internal fetch helper ───────────────────────────────────────────────────

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<TMDbResponse<T>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, data: null, error: 'TMDb API key not configured' };
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, data: null, error: `TMDb ${res.status}: ${text || res.statusText}` };
    }
    const data = (await res.json()) as T;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, data: null, error: message };
  }
}

// ─── Public Functions ────────────────────────────────────────────────────────

/**
 * Search for movies by query string.
 */
export async function searchMovies(
  query: string,
  page = 1,
): Promise<TMDbResponse<TMDbPageResponse<TMDbMovie>>> {
  return withCache(
    `tmdb:search:${query}:${page}`,
    () =>
      tmdbFetch<TMDbPageResponse<TMDbMovie>>('/search/movie', {
        query,
        page: String(page),
        include_adult: 'false',
      }),
    { category: 'movie' },
  );
}

/**
 * Get full details for a single movie, including budget and revenue.
 */
export async function getMovieDetails(movieId: number): Promise<TMDbResponse<TMDbMovieDetail>> {
  return withCache(
    `tmdb:movie:${movieId}`,
    () =>
      tmdbFetch<TMDbMovieDetail>(`/movie/${movieId}`, {
        append_to_response: 'credits,videos,similar',
      }),
    { category: 'movie' },
  );
}

/**
 * Get trending movies for a given time window.
 */
export async function getTrending(
  timeWindow: TMDbTimeWindow = 'week',
  page = 1,
): Promise<TMDbResponse<TMDbPageResponse<TMDbMovie>>> {
  return withCache(
    `tmdb:trending:${timeWindow}:${page}`,
    () =>
      tmdbFetch<TMDbPageResponse<TMDbMovie>>(`/trending/movie/${timeWindow}`, {
        page: String(page),
      }),
    { category: 'movie' },
  );
}

/**
 * Get top-rated movies.
 */
export async function getTopRated(page = 1): Promise<TMDbResponse<TMDbPageResponse<TMDbMovie>>> {
  return withCache(
    `tmdb:toprated:${page}`,
    () =>
      tmdbFetch<TMDbPageResponse<TMDbMovie>>('/movie/top_rated', {
        page: String(page),
      }),
    { category: 'movie' },
  );
}

/**
 * Get now-playing / new-release movies.
 */
export async function getNewReleases(page = 1): Promise<TMDbResponse<TMDbPageResponse<TMDbMovie>>> {
  return withCache(
    `tmdb:nowplaying:${page}`,
    () =>
      tmdbFetch<TMDbPageResponse<TMDbMovie>>('/movie/now_playing', {
        page: String(page),
      }),
    { category: 'movie' },
  );
}

/**
 * Get cast and crew for a movie.
 */
export async function getMovieCredits(movieId: number): Promise<TMDbResponse<TMDbCredits>> {
  return withCache(
    `tmdb:credits:${movieId}`,
    () => tmdbFetch<TMDbCredits>(`/movie/${movieId}/credits`),
    { category: 'movie' },
  );
}

/**
 * Get similar movies.
 */
export async function getSimilarMovies(
  movieId: number,
  page = 1,
): Promise<TMDbResponse<TMDbPageResponse<TMDbMovie>>> {
  return withCache(
    `tmdb:similar:${movieId}:${page}`,
    () =>
      tmdbFetch<TMDbPageResponse<TMDbMovie>>(`/movie/${movieId}/similar`, {
        page: String(page),
      }),
    { category: 'movie' },
  );
}

/**
 * Get official videos (trailers, teasers, etc.) for a movie.
 */
export async function getMovieVideos(movieId: number): Promise<TMDbResponse<TMDbVideosResponse>> {
  return withCache(
    `tmdb:videos:${movieId}`,
    () => tmdbFetch<TMDbVideosResponse>(`/movie/${movieId}/videos`),
    { category: 'movie' },
  );
}
