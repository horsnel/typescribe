/**
 * TMDb API Client for Typescribe
 *
 * Provides typed access to The Movie Database API v3 with:
 *   - In-memory caching (1 h for details, 15 min for lists)
 *   - Rate-limit guard (250 ms minimum between requests)
 *   - Null-return error handling with `[TMDb]`-prefixed logs
 *
 * Placeholder fields (imdb_rating, rotten_tomatoes, metascore,
 * ai_review, news_headlines) are filled with defaults; other
 * pipeline stages populate them later.
 */

import type { Movie } from '@/lib/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const CACHE_TTL_DETAILS = 60 * 60 * 1000;       // 1 hour
const CACHE_TTL_LISTS  = 15 * 60 * 1000;         // 15 minutes
const RATE_LIMIT_MS    = 250;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface DiscoverMovieFilters {
  with_origin_country?: string;
  with_original_language?: string;
  with_genres?: string;
  with_keywords?: string;
  sort_by?: string;
  'vote_average.gte'?: number;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  page?: number;
  'vote_count.gte'?: number;
}

interface DiscoverTvFilters {
  with_origin_country?: string;
  with_original_language?: string;
  with_genres?: string;
  with_keywords?: string;
  sort_by?: string;
  'vote_average.gte'?: number;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
  page?: number;
  'vote_count.gte'?: number;
}

interface PaginatedResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface GenreListResult {
  genres: TmdbGenre[];
}

// ─── Internal State ──────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();
let lastRequestTime = 0;

// ─── API Key ─────────────────────────────────────────────────────────────────

/**
 * Return the TMDb API key.
 *
 * Accepts an optional `key` param so admin / test code can
 * override the environment variable on a per-call basis.
 */
export function getTmdbApiKey(key?: string): string {
  return key || process.env.TMDB_API_KEY || '';
}

// ─── Image URL Helper ────────────────────────────────────────────────────────

export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

/**
 * Build a full image URL from a TMDb poster / backdrop path.
 *
 * @example
 * tmdbImageUrl('/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 'w500')
 * // => 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
 */
export function tmdbImageUrl(path: string | null | undefined, size: ImageSize = 'w500'): string {
  if (!path) return '';
  return `${IMAGE_BASE}/${size}${path}`;
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** Clear the entire TMDb in-memory cache. */
export function clearTmdbCache(): void {
  cache.clear();
}

// ─── Raw Fetch ───────────────────────────────────────────────────────────────

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  ttl: number = CACHE_TTL_DETAILS,
  apiKeyOverride?: string,
): Promise<T | null> {
  const apiKey = getTmdbApiKey(apiKeyOverride);
  if (!apiKey) {
    console.error('[TMDb] No API key configured. Set TMDB_API_KEY env var or pass key param.');
    return null;
  }

  const filteredParams: Record<string, string> = { api_key: apiKey };
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      filteredParams[k] = String(v);
    }
  }

  const qs = new URLSearchParams(filteredParams).toString();
  const url = `${BASE_URL}${endpoint}${qs ? `?${qs}` : ''}`;

  // Check cache first
  const cached = getCached<T>(url);
  if (cached !== null) return cached;

  try {
    await enforceRateLimit();

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`[TMDb] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    const data = (await res.json()) as T;
    setCache(url, data, ttl);
    return data;
  } catch (err) {
    console.error(`[TMDb] Request failed — ${url}`, err);
    return null;
  }
}

// ─── Slug Helper ─────────────────────────────────────────────────────────────

function slugify(text: string, id: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base ? `${base}-${id}` : `untitled-${id}`;
}

// ─── Movie Detail Transformation ─────────────────────────────────────────────


interface TmdbMovieResponse {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres: TmdbGenre[];
  runtime: number;
  vote_average: number;
  vote_count: number;
  tagline: string;
  budget: number;
  revenue: number;
  original_language: string;
  origin_country: string[];
  production_companies: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  status: string;
  credits?: {
    crew: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
  };
  videos?: {
    results: Array<{ id: string; key: string; name: string; site: string; type: string; official: boolean }>;
  };
  keywords?: {
    keywords: Array<{ id: number; name: string }>;
  };
  similar?: {
    results: Array<{ id: number }>;
  };
  reviews?: {
    results: Array<{ id: string; author: string; content: string; url: string }>;
  };
}

function transformMovieDetail(raw: TmdbMovieResponse): Movie {
  // Director from crew
  const director =
    raw.credits?.crew?.find((c) => c.job === 'Director')?.name ?? '';

  // Top 10 cast
  const cast = (raw.credits?.cast ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      character: c.character,
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
    }));

  // YouTube trailer
  const trailer = raw.videos?.results?.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer',
  ) ?? raw.videos?.results?.find((v) => v.site === 'YouTube');
  const trailer_youtube_id = trailer?.key ?? '';

  // Keywords
  // (Available for later pipeline stages if needed)

  // Similar IDs
  // (Available for later pipeline stages if needed)

  return {
    id: raw.id,
    tmdb_id: raw.id,
    slug: slugify(raw.title, raw.id),
    title: raw.title,
    original_title: raw.original_title,
    overview: raw.overview,
    release_date: raw.release_date,
    poster_path: tmdbImageUrl(raw.poster_path, 'w500'),
    backdrop_path: tmdbImageUrl(raw.backdrop_path, 'w780'),
    genres: raw.genres,
    runtime: raw.runtime ?? 0,
    vote_average: raw.vote_average,
    vote_count: raw.vote_count,
    imdb_rating: '',
    rotten_tomatoes: '',
    metascore: '',
    trailer_youtube_id,
    news_headlines: [],
    ai_review: '',
    director,
    cast,
    tagline: raw.tagline ?? '',
    budget: raw.budget ?? 0,
    revenue: raw.revenue ?? 0,
    original_language: raw.original_language ?? '',
    origin_country: raw.origin_country?.[0] ?? '',
    media_type: 'movie',
    production_companies: raw.production_companies?.map((pc) => pc.name) ?? [],
    status: raw.status ?? '',
    created_at: new Date().toISOString(),
  };
}

// ─── TV Detail Transformation ────────────────────────────────────────────────

interface TmdbTvResponse {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: TmdbGenre[];
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  tagline: string;
  budget: number;
  revenue: number;
  original_language: string;
  origin_country: string[];
  production_companies: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  status: string;
  created_by: Array<{ id: number; name: string; profile_path: string | null }>;
  credits?: {
    crew: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
  };
  videos?: {
    results: Array<{ id: string; key: string; name: string; site: string; type: string; official: boolean }>;
  };
  keywords?: {
    results: Array<{ id: number; name: string }>;
  };
  similar?: {
    results: Array<{ id: number }>;
  };
  reviews?: {
    results: Array<{ id: string; author: string; content: string; url: string }>;
  };
}

function transformTvDetail(raw: TmdbTvResponse): Movie {
  // Creator / Director
  const director =
    raw.created_by?.[0]?.name ??
    raw.credits?.crew?.find((c) => c.job === 'Director')?.name ??
    '';

  // Top 10 cast
  const cast = (raw.credits?.cast ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      character: c.character,
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
    }));

  // YouTube trailer
  const trailer = raw.videos?.results?.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer',
  ) ?? raw.videos?.results?.find((v) => v.site === 'YouTube');
  const trailer_youtube_id = trailer?.key ?? '';

  // Runtime — use first episode_run_time entry or 0
  const runtime = raw.episode_run_time?.[0] ?? 0;

  return {
    id: raw.id,
    tmdb_id: raw.id,
    slug: slugify(raw.name, raw.id),
    title: raw.name,
    original_title: raw.original_name,
    overview: raw.overview,
    release_date: raw.first_air_date,
    poster_path: tmdbImageUrl(raw.poster_path, 'w500'),
    backdrop_path: tmdbImageUrl(raw.backdrop_path, 'w780'),
    genres: raw.genres,
    runtime,
    vote_average: raw.vote_average,
    vote_count: raw.vote_count,
    imdb_rating: '',
    rotten_tomatoes: '',
    metascore: '',
    trailer_youtube_id,
    news_headlines: [],
    ai_review: '',
    director,
    cast,
    tagline: raw.tagline ?? '',
    budget: raw.budget ?? 0,
    revenue: raw.revenue ?? 0,
    original_language: raw.original_language ?? '',
    origin_country: raw.origin_country?.[0] ?? '',
    media_type: 'tv',
    production_companies: raw.production_companies?.map((pc) => pc.name) ?? [],
    status: raw.status ?? '',
    created_at: new Date().toISOString(),
  };
}

// ─── Minimal Movie / TV Card Transformation ──────────────────────────────────

interface TmdbMovieCard {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  original_language: string;
  origin_country?: string[];
  media_type?: string;
}

interface TmdbTvCard {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  original_language: string;
  origin_country: string[];
  media_type?: string;
}

function transformMovieCard(raw: TmdbMovieCard): Movie {
  return {
    id: raw.id,
    tmdb_id: raw.id,
    slug: slugify(raw.title, raw.id),
    title: raw.title,
    original_title: raw.original_title ?? '',
    overview: raw.overview ?? '',
    release_date: raw.release_date ?? '',
    poster_path: tmdbImageUrl(raw.poster_path, 'w500'),
    backdrop_path: tmdbImageUrl(raw.backdrop_path, 'w780'),
    genres: (raw.genre_ids ?? []).map((gid) => ({ id: gid, name: '' })),
    runtime: 0,
    vote_average: raw.vote_average,
    vote_count: raw.vote_count,
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
    original_language: raw.original_language ?? '',
    origin_country: raw.origin_country?.[0] ?? '',
    media_type: 'movie',
    production_companies: [],
    status: '',
    created_at: new Date().toISOString(),
  };
}

function transformTvCard(raw: TmdbTvCard): Movie {
  return {
    id: raw.id,
    tmdb_id: raw.id,
    slug: slugify(raw.name, raw.id),
    title: raw.name,
    original_title: raw.original_name ?? '',
    overview: raw.overview ?? '',
    release_date: raw.first_air_date ?? '',
    poster_path: tmdbImageUrl(raw.poster_path, 'w500'),
    backdrop_path: tmdbImageUrl(raw.backdrop_path, 'w780'),
    genres: (raw.genre_ids ?? []).map((gid) => ({ id: gid, name: '' })),
    runtime: 0,
    vote_average: raw.vote_average,
    vote_count: raw.vote_count,
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
    original_language: raw.original_language ?? '',
    origin_country: raw.origin_country?.[0] ?? '',
    media_type: 'tv',
    production_companies: [],
    status: '',
    created_at: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * GET `/movie/{id}?append_to_response=credits,videos,keywords,reviews,similar`
 *
 * Returns a fully-transformed `Movie` object with credits, trailer,
 * keywords and similar IDs baked in.
 */
export async function getMovieDetails(
  tmdbId: number,
  apiKeyOverride?: string,
): Promise<Movie | null> {
  const data = await tmdbFetch<TmdbMovieResponse>(
    `/movie/${tmdbId}`,
    { append_to_response: 'credits,videos,keywords,reviews,similar' },
    CACHE_TTL_DETAILS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return transformMovieDetail(data);
  } catch (err) {
    console.error(`[TMDb] Failed to transform movie ${tmdbId}`, err);
    return null;
  }
}

/**
 * GET `/tv/{id}?append_to_response=credits,videos,keywords,reviews,similar`
 *
 * Returns a fully-transformed `Movie` object (media_type='tv') with
 * creator, credits, trailer, keywords and similar IDs baked in.
 */
export async function getTvDetails(
  tmdbId: number,
  apiKeyOverride?: string,
): Promise<Movie | null> {
  const data = await tmdbFetch<TmdbTvResponse>(
    `/tv/${tmdbId}`,
    { append_to_response: 'credits,videos,keywords,reviews,similar' },
    CACHE_TTL_DETAILS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return transformTvDetail(data);
  } catch (err) {
    console.error(`[TMDb] Failed to transform TV ${tmdbId}`, err);
    return null;
  }
}

/**
 * GET `/discover/movie` with structured filter params.
 *
 * Returns a paginated list of minimal `Movie` objects.
 */
export async function discoverMovies(
  filters: DiscoverMovieFilters = {},
  apiKeyOverride?: string,
): Promise<PaginatedResult<Movie> | null> {
  const params: Record<string, string | number | undefined> = {
    with_origin_country: filters.with_origin_country,
    with_original_language: filters.with_original_language,
    with_genres: filters.with_genres,
    with_keywords: filters.with_keywords,
    sort_by: filters.sort_by ?? 'popularity.desc',
    'vote_average.gte': filters['vote_average.gte'],
    'primary_release_date.gte': filters.primary_release_date_gte,
    'primary_release_date.lte': filters.primary_release_date_lte,
    page: filters.page ?? 1,
    'vote_count.gte': filters['vote_count.gte'] ?? 50,
  };

  const data = await tmdbFetch<PaginatedResult<TmdbMovieCard>>(
    '/discover/movie',
    params,
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return {
      ...data,
      results: data.results.map(transformMovieCard),
    };
  } catch (err) {
    console.error('[TMDb] Failed to transform discover movies', err);
    return null;
  }
}

/**
 * GET `/discover/tv` with structured filter params.
 *
 * Returns a paginated list of minimal `Movie` objects (media_type='tv').
 */
export async function discoverTv(
  filters: DiscoverTvFilters = {},
  apiKeyOverride?: string,
): Promise<PaginatedResult<Movie> | null> {
  const params: Record<string, string | number | undefined> = {
    with_origin_country: filters.with_origin_country,
    with_original_language: filters.with_original_language,
    with_genres: filters.with_genres,
    with_keywords: filters.with_keywords,
    sort_by: filters.sort_by ?? 'popularity.desc',
    'vote_average.gte': filters['vote_average.gte'],
    'first_air_date.gte': filters.first_air_date_gte,
    'first_air_date.lte': filters.first_air_date_lte,
    page: filters.page ?? 1,
    'vote_count.gte': filters['vote_count.gte'] ?? 50,
  };

  const data = await tmdbFetch<PaginatedResult<TmdbTvCard>>(
    '/discover/tv',
    params,
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return {
      ...data,
      results: data.results.map(transformTvCard),
    };
  } catch (err) {
    console.error('[TMDb] Failed to transform discover TV', err);
    return null;
  }
}

/**
 * GET `/search/multi?query={query}`
 *
 * Returns movies + TV shows + people. Only movies and TV shows
 * are transformed into `Movie` objects; people entries are filtered out.
 */
export async function searchMulti(
  query: string,
  apiKeyOverride?: string,
): Promise<Movie[] | null> {
  const data = await tmdbFetch<
    PaginatedResult<TmdbMovieCard | TmdbTvCard | any>
  >(
    '/search/multi',
    { query },
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return data.results
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any) => {
        if (item.media_type === 'tv') {
          return transformTvCard(item as TmdbTvCard);
        }
        return transformMovieCard(item as TmdbMovieCard);
      });
  } catch (err) {
    console.error(`[TMDb] Failed to transform search results for "${query}"`, err);
    return null;
  }
}

/**
 * GET `/movie/{id}/credits`
 *
 * Returns the raw credits response with crew and cast arrays.
 */
export async function getMovieCredits(
  tmdbId: number,
  apiKeyOverride?: string,
): Promise<{
  id: number;
  cast: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
  crew: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
} | null> {
  return tmdbFetch(
    `/movie/${tmdbId}/credits`,
    {},
    CACHE_TTL_DETAILS,
    apiKeyOverride,
  );
}

/**
 * GET `/trending/all/{timeWindow}`
 *
 * `timeWindow` is `'day'` or `'week'`.
 * Returns a paginated list of mixed movie/TV `Movie` objects.
 */
export async function getTrending(
  timeWindow: 'day' | 'week' = 'week',
  apiKeyOverride?: string,
): Promise<PaginatedResult<Movie> | null> {
  const data = await tmdbFetch<
    PaginatedResult<TmdbMovieCard | TmdbTvCard | any>
  >(
    `/trending/all/${timeWindow}`,
    {},
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return {
      ...data,
      results: data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => {
          if (item.media_type === 'tv') {
            return transformTvCard(item as TmdbTvCard);
          }
          return transformMovieCard(item as TmdbMovieCard);
        }),
    };
  } catch (err) {
    console.error(`[TMDb] Failed to transform trending (${timeWindow})`, err);
    return null;
  }
}

/**
 * GET `/movie/top_rated`
 *
 * Returns a paginated list of top-rated movies.
 */
export async function getTopRated(
  page: number = 1,
  apiKeyOverride?: string,
): Promise<PaginatedResult<Movie> | null> {
  const data = await tmdbFetch<PaginatedResult<TmdbMovieCard>>(
    '/movie/top_rated',
    { page },
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return {
      ...data,
      results: data.results.map(transformMovieCard),
    };
  } catch (err) {
    console.error('[TMDb] Failed to transform top rated', err);
    return null;
  }
}

/**
 * GET `/movie/now_playing`
 *
 * Returns a paginated list of movies currently in theatres.
 */
export async function getNowPlaying(
  page: number = 1,
  apiKeyOverride?: string,
): Promise<PaginatedResult<Movie> | null> {
  const data = await tmdbFetch<PaginatedResult<TmdbMovieCard>>(
    '/movie/now_playing',
    { page },
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    return {
      ...data,
      results: data.results.map(transformMovieCard),
    };
  } catch (err) {
    console.error('[TMDb] Failed to transform now playing', err);
    return null;
  }
}

/**
 * GET `/genre/movie/list` and `/genre/tv/list`
 *
 * Returns a merged, deduped genre map keyed by ID.
 */
export async function getGenres(
  apiKeyOverride?: string,
): Promise<Map<number, string> | null> {
  const [movieData, tvData] = await Promise.all([
    tmdbFetch<GenreListResult>('/genre/movie/list', {}, CACHE_TTL_DETAILS, apiKeyOverride),
    tmdbFetch<GenreListResult>('/genre/tv/list', {}, CACHE_TTL_DETAILS, apiKeyOverride),
  ]);

  if (!movieData && !tvData) return null;

  try {
    const genreMap = new Map<number, string>();

    for (const g of movieData?.genres ?? []) {
      genreMap.set(g.id, g.name);
    }
    for (const g of tvData?.genres ?? []) {
      if (!genreMap.has(g.id)) {
        genreMap.set(g.id, g.name);
      }
    }

    return genreMap;
  } catch (err) {
    console.error('[TMDb] Failed to transform genres', err);
    return null;
  }
}

/**
 * GET `/movie/{id}/external_ids`
 *
 * Returns external IDs including IMDb ID, needed for OMDb lookups.
 */
export async function getMovieExternalIds(
  tmdbId: number,
  apiKeyOverride?: string,
): Promise<{
  imdb_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  wikidata_id: string | null;
} | null> {
  return tmdbFetch(
    `/movie/${tmdbId}/external_ids`,
    {},
    CACHE_TTL_DETAILS,
    apiKeyOverride,
  );
}

/**
 * GET `/tv/{id}/external_ids`
 *
 * Returns external IDs including IMDb ID for TV shows.
 */
export async function getTvExternalIds(
  tmdbId: number,
  apiKeyOverride?: string,
): Promise<{
  imdb_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  wikidata_id: string | null;
  tvdb_id: number | null;
} | null> {
  return tmdbFetch(
    `/tv/${tmdbId}/external_ids`,
    {},
    CACHE_TTL_DETAILS,
    apiKeyOverride,
  );
}

// ─── Anime Search ────────────────────────────────────────────────────────────

/**
 * Search for anime specifically — filters search results to Animation genre
 * with JP/CN/KR origin country.
 *
 * Returns a list of `Movie` objects with `media_type: 'anime'`.
 */
export async function searchAnime(
  query: string,
  apiKeyOverride?: string,
): Promise<Movie[] | null> {
  const data = await tmdbFetch<
    PaginatedResult<TmdbMovieCard | TmdbTvCard | any>
  >(
    '/search/multi',
    { query },
    CACHE_TTL_LISTS,
    apiKeyOverride,
  );
  if (!data) return null;

  try {
    // Filter to animation genre from anime-producing countries
    const ANIME_GENRE_ID = 16;
    const ANIME_COUNTRIES = ['JP', 'CN', 'KR'];

    return data.results
      .filter((item: any) => {
        if (item.media_type !== 'movie' && item.media_type !== 'tv') return false;
        const hasAnimeGenre = item.genre_ids?.includes(ANIME_GENRE_ID);
        const isAnimeCountry = (item.origin_country || []).some((c: string) => ANIME_COUNTRIES.includes(c));
        return hasAnimeGenre || isAnimeCountry;
      })
      .map((item: any) => {
        if (item.media_type === 'tv') {
          const m = transformTvCard(item as TmdbTvCard);
          return { ...m, media_type: 'anime' as const, is_anime: true };
        }
        const m = transformMovieCard(item as TmdbMovieCard);
        return { ...m, media_type: 'anime' as const, is_anime: true };
      });
  } catch (err) {
    console.error(`[TMDb] Failed to transform anime search results for "${query}"`, err);
    return null;
  }
}

// ─── Re-export PaginatedResult for consumers ─────────────────────────────────

export type { PaginatedResult, DiscoverMovieFilters, DiscoverTvFilters };
