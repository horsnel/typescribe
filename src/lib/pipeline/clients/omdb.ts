/**
 * OMDb API Client for the Typescribe movie site.
 *
 * Docs:  http://www.omdbapi.com/
 * Base:  https://www.omdbapi.com/
 * Auth:  ?apikey=KEY
 *
 * Features:
 *  - get-by-IMDb-ID, get-by-title, and search methods
 *  - typed response objects with parsed numeric ratings
 *  - daily request-counter (1 000 free-tier limit) with 200 ms inter-request delay
 *  - in-memory Map cache (6 h TTL) with `clearOmdbCache()` export
 *  - graceful error handling (returns null, logs with `[OMDb]` prefix)
 *  - `getOmdbDailyStats()` export for quota introspection
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OMDbMovieData {
  imdbId: string;
  title: string;
  year: string;
  rated: string;
  released: string;
  runtime: string;
  genre: string;
  director: string;
  writer: string;
  actors: string;
  plot: string;
  language: string;
  country: string;
  awards: string;
  poster: string;
  imdbRating: number | null;
  imdbVotes: number | null;
  rottenTomatoesScore: number | null;
  rtConsensus: string | null;
  rtAudienceScore: number | null;
  metascore: number | null;
  boxOffice: string | null;
  production: string | null;
  type: "movie" | "series" | "episode" | "game";
}

export interface OMDbSearchResult {
  title: string;
  year: string;
  imdbId: string;
  type: string;
  poster: string;
}

export interface OMDbSearchResponse {
  results: OMDbSearchResult[];
  totalResults: number;
}

export interface OMDbDailyStats {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers – raw OMDb JSON shapes
// ---------------------------------------------------------------------------

interface OMDbRawRating {
  Source: string;
  Value: string;
}

interface OMDbRawMovie {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OMDbRawRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  // tomatoes=true extras (not always present)
  tomatoURL?: string;
  tomatoRating?: string;
  tomatoImage?: string;
  tomatoConsensus?: string;
  tomatoUserRating?: string;
  tomatoUserMeter?: string;
  tomatoUserReviews?: string;
  Response: string;
  Error?: string;
}

interface OMDbRawSearchItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

interface OMDbRawSearchResponse {
  Search: OMDbRawSearchItem[];
  totalResults: string;
  Response: string;
  Error?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.omdbapi.com";
const DAILY_LIMIT = 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const INTER_REQUEST_DELAY_MS = 200;

/**
 * Resolve the OMDb API key. Accepts an explicit override; otherwise reads
 * `OMDB_API_KEY` from `process.env`.
 */
function getApiKey(override?: string): string | undefined {
  if (override) return override;
  return process.env.OMDB_API_KEY;
}

// ---------------------------------------------------------------------------
// Daily request counter
// ---------------------------------------------------------------------------

let dailyUsed = 0;
let dailyResetDate = new Date();

/** Reset the counter at midnight UTC if the day has rolled over. */
function maybeResetDaily(): void {
  const now = new Date();
  if (
    now.getUTCFullYear() !== dailyResetDate.getUTCFullYear() ||
    now.getUTCMonth() !== dailyResetDate.getUTCMonth() ||
    now.getUTCDate() !== dailyResetDate.getUTCDate()
  ) {
    dailyUsed = 0;
    dailyResetDate = now;
  }
}

// ---------------------------------------------------------------------------
// Rate-limit delay
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < INTER_REQUEST_DELAY_MS) {
    await sleep(INTER_REQUEST_DELAY_MS - elapsed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clear the entire OMDb in-memory cache. */
export function clearOmdbCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** "8.3" → 8.3 | "N/A" → null */
function parseImdbRating(raw: string): number | null {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

/** "1,234,567" → 1234567 | "N/A" → null */
function parseImdbVotes(raw: string): number | null {
  if (!raw || raw === "N/A") return null;
  const cleaned = raw.replace(/,/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

/** Extract value for a given Source from the Ratings array. */
function findRatingValue(
  ratings: OMDbRawRating[],
  source: string,
): string | undefined {
  return ratings.find((r) => r.Source === source)?.Value;
}

/** "91%" → 91 | "N/A" → null */
function parseRottenTomatoes(value: string | undefined): number | null {
  if (!value || value === "N/A") return null;
  const n = parseInt(value.replace("%", ""), 10);
  return Number.isNaN(n) ? null : n;
}

/** "82/100" → 82 | "N/A" → null (from Metacritic) */
function parseMetascore(value: string | undefined): number | null {
  if (!value || value === "N/A") return null;
  const n = parseInt(value.split("/")[0], 10);
  return Number.isNaN(n) ? null : n;
}

/** Coerce the `Type` field to the union or fall back to "movie". */
function parseType(raw: string): OMDbMovieData["type"] {
  const allowed = new Set(["movie", "series", "episode", "game"]);
  const lower = raw.toLowerCase();
  return (allowed.has(lower) ? lower : "movie") as OMDbMovieData["type"];
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function omdbFetch<T>(
  params: Record<string, string>,
  apiKey?: string,
): Promise<T | null> {
  const key = getApiKey(apiKey);
  if (!key) {
    console.error("[OMDb] No API key configured. Set OMDB_API_KEY env var.");
    return null;
  }

  maybeResetDaily();

  if (dailyUsed >= DAILY_LIMIT) {
    console.warn("[OMDb] Daily request limit reached (1 000). Skipping request.");
    return null;
  }

  await enforceRateLimit();

  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  const url = `${BASE_URL}/?${qs}`;

  try {
    lastRequestTime = Date.now();
    dailyUsed++;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[OMDb] HTTP ${res.status} for ${url}`);
      return null;
    }

    const json = (await res.json()) as Record<string, unknown>;

    // OMDb returns 200 even on "not found"; check the Response field.
    if (json.Response === "False") {
      const errMsg = (json.Error as string) ?? "Unknown error";
      if (errMsg === "Movie not found!") {
        console.info(`[OMDb] Movie not found: ${qs}`);
      } else {
        console.warn(`[OMDb] API error: ${errMsg}`);
      }
      return null;
    }

    return json as unknown as T;
  } catch (err) {
    console.error("[OMDb] Network / parse error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

function transformMovie(raw: OMDbRawMovie): OMDbMovieData {
  const rtValue = findRatingValue(raw.Ratings ?? [], "Rotten Tomatoes");
  const metaValue = findRatingValue(raw.Ratings ?? [], "Metacritic") ?? raw.Metascore;

  return {
    imdbId: raw.imdbID,
    title: raw.Title,
    year: raw.Year,
    rated: raw.Rated,
    released: raw.Released,
    runtime: raw.Runtime,
    genre: raw.Genre,
    director: raw.Director,
    writer: raw.Writer,
    actors: raw.Actors,
    plot: raw.Plot,
    language: raw.Language,
    country: raw.Country,
    awards: raw.Awards,
    poster: raw.Poster,
    imdbRating: parseImdbRating(raw.imdbRating),
    imdbVotes: parseImdbVotes(raw.imdbVotes),
    rottenTomatoesScore: parseRottenTomatoes(rtValue),
    rtConsensus: raw.tomatoConsensus && raw.tomatoConsensus !== "N/A"
      ? raw.tomatoConsensus
      : null,
    rtAudienceScore: parseRottenTomatoes(raw.tomatoUserMeter),
    metascore: parseMetascore(metaValue),
    boxOffice: raw.BoxOffice && raw.BoxOffice !== "N/A" ? raw.BoxOffice : null,
    production: raw.Production && raw.Production !== "N/A" ? raw.Production : null,
    type: parseType(raw.Type),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a movie by its IMDb ID (e.g. "tt0068646").
 *
 * GET `/?apikey={key}&i={imdbId}&plot=full&tomatoes=true`
 */
export async function getByImdbId(
  imdbId: string,
  apiKey?: string,
): Promise<OMDbMovieData | null> {
  const cacheKey = `imdb:${imdbId}`;
  const cached = getCached<OMDbMovieData>(cacheKey);
  if (cached) return cached;

  const raw = await omdbFetch<OMDbRawMovie>(
    { i: imdbId, plot: "full", tomatoes: "true" },
    apiKey,
  );
  if (!raw) return null;

  const movie = transformMovie(raw);
  setCache(cacheKey, movie);
  return movie;
}

/**
 * Fetch a movie by title, optionally narrowed by year.
 *
 * GET `/?apikey={key}&t={title}&y={year}&plot=full&tomatoes=true`
 */
export async function getByTitle(
  title: string,
  year?: number,
  apiKey?: string,
): Promise<OMDbMovieData | null> {
  const cacheKey = `title:${title}:${year ?? ""}`;
  const cached = getCached<OMDbMovieData>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string> = {
    t: title,
    plot: "full",
    tomatoes: "true",
  };
  if (year !== undefined) {
    params.y = String(year);
  }

  const raw = await omdbFetch<OMDbRawMovie>(params, apiKey);
  if (!raw) return null;

  const movie = transformMovie(raw);
  setCache(cacheKey, movie);
  return movie;
}

/**
 * Search OMDb for movies matching a query string.
 * Pages are 1-based; OMDb returns 10 results per page.
 *
 * GET `/?apikey={key}&s={query}&page={page}`
 */
export async function search(
  query: string,
  page: number = 1,
  apiKey?: string,
): Promise<OMDbSearchResponse | null> {
  const cacheKey = `search:${query}:${page}`;
  const cached = getCached<OMDbSearchResponse>(cacheKey);
  if (cached) return cached;

  const raw = await omdbFetch<OMDbRawSearchResponse>(
    { s: query, page: String(page) },
    apiKey,
  );
  if (!raw) return null;

  const result: OMDbSearchResponse = {
    results: (raw.Search ?? []).map((item) => ({
      title: item.Title,
      year: item.Year,
      imdbId: item.imdbID,
      type: item.Type,
      poster: item.Poster,
    })),
    totalResults: parseInt(raw.totalResults, 10) || 0,
  };

  setCache(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Daily stats export
// ---------------------------------------------------------------------------

/**
 * Return current daily quota usage for the OMDb free tier.
 */
export function getOmdbDailyStats(): OMDbDailyStats {
  maybeResetDaily();

  // Calculate the next midnight UTC for the reset timestamp.
  const now = new Date();
  const resetAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );

  return {
    used: dailyUsed,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - dailyUsed),
    resetAt: resetAt.toISOString(),
  };
}
