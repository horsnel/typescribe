/**
 * NewsAPI Client for the Typescribe movie site.
 *
 * Docs:  https://newsapi.org/docs
 * Base:  https://newsapi.org/v2/
 * Auth:  ?apiKey=NEWS_API_KEY
 *
 * Features:
 *  - Search for movie-related news articles ("everything" endpoint)
 *  - Get top entertainment headlines ("top-headlines" endpoint)
 *  - In-memory Map cache (1 hour for headlines)
 *  - Rate-limit guard (200 ms minimum between requests)
 *  - Daily quota tracking (NewsAPI free tier: 100 requests/day)
 *  - Graceful error handling (returns empty array, logs with `[NewsAPI]` prefix)
 *  - `getNewsApiDailyStats()` export for quota introspection
 *  - `clearNewsApiCache()` export for cache invalidation
 */

import { fetchWithTimeout, safeJsonParse, enforceCacheLimit } from '@/lib/pipeline/core/resilience';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  description: string;
  publishedAt: string;
  imageUrl: string;
}

export interface NewsApiDailyStats {
  used: number;
  limit: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Internal helpers – raw NewsAPI JSON shapes
// ---------------------------------------------------------------------------

interface NewsApiRawArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiRawResponse {
  status: string;
  totalResults: number;
  articles: NewsApiRawArticle[];
  code?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://newsapi.org/v2";

/** NewsAPI free tier allows 100 requests per day. */
const DAILY_REQUEST_LIMIT = 100;

const CACHE_TTL_HEADLINES = 60 * 60 * 1000;          // 1 hour
const CACHE_TTL_EVERYTHING = 60 * 60 * 1000;         // 1 hour
const INTER_REQUEST_DELAY_MS = 200;

/**
 * Resolve the NewsAPI key. Accepts an explicit override; otherwise reads
 * `NEWS_API_KEY` from `process.env`.
 */
function getApiKey(override?: string): string | undefined {
  if (override) return override;
  return process.env.NEWS_API_KEY;
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

function setCache<T>(key: string, value: T, ttl: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  enforceCacheLimit(cache);
}

/** Clear the entire NewsAPI in-memory cache. */
export function clearNewsApiCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function newsApiFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey?: string,
): Promise<T | null> {
  const key = getApiKey(apiKey);
  if (!key) {
    console.error("[NewsAPI] No API key configured. Set NEWS_API_KEY env var.");
    return null;
  }

  maybeResetDaily();

  if (dailyUsed >= DAILY_REQUEST_LIMIT) {
    console.warn(
      `[NewsAPI] Daily request limit reached (${DAILY_REQUEST_LIMIT}). Skipping request.`
    );
    return null;
  }

  await enforceRateLimit();

  const qs = new URLSearchParams({ ...params, apiKey: key }).toString();
  const url = `${BASE_URL}${endpoint}?${qs}`;

  try {
    lastRequestTime = Date.now();
    dailyUsed++;

    const res = await fetchWithTimeout(url, undefined, 10_000);
    if (!res) {
      console.error('[NewsAPI] Request failed (timeout/network)');
      return null;
    }
    if (!res.ok) {
      console.error(`[NewsAPI] HTTP ${res.status} for ${endpoint}`);
      return null;
    }

    const json = await safeJsonParse<Record<string, unknown>>(res);
    if (!json) {
      console.error('[NewsAPI] Failed to parse JSON response');
      return null;
    }

    // NewsAPI returns errors in the body with a status field
    if (json.status === "error") {
      const errMsg = (json.message as string) ?? "Unknown NewsAPI error";
      console.warn(`[NewsAPI] API error: ${errMsg}`);
      return null;
    }

    return json as unknown as T;
  } catch (err) {
    console.error("[NewsAPI] Network / parse error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

function transformArticle(raw: NewsApiRawArticle): NewsArticle {
  return {
    title: raw.title ?? "",
    url: raw.url ?? "",
    source: raw.source?.name ?? "",
    description: raw.description ?? "",
    publishedAt: raw.publishedAt ?? "",
    imageUrl: raw.urlToImage ?? "",
  };
}

// ---------------------------------------------------------------------------
// Public API – getMovieNews
// ---------------------------------------------------------------------------

/**
 * Search for movie-related news articles using the NewsAPI "everything" endpoint.
 *
 * Queries with the movie title as the search term, sorted by newest first.
 * Returns up to 5 articles.
 *
 * @param movieTitle  The movie title to search for.
 * @returns An array of `NewsArticle` objects (max 5), empty on error.
 */
export async function getMovieNews(
  movieTitle: string,
  apiKey?: string,
): Promise<NewsArticle[]> {
  const cacheKey = `everything:${movieTitle}`;
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const raw = await newsApiFetch<NewsApiRawResponse>(
    "/everything",
    {
      q: movieTitle,
      sortBy: "publishedAt",
      pageSize: "5",
      language: "en",
    },
    apiKey,
  );

  if (!raw) return [];

  const articles = (raw.articles ?? [])
    .filter((a) => a.title && a.url) // only articles with title & URL
    .slice(0, 5)
    .map(transformArticle);

  setCache(cacheKey, articles, CACHE_TTL_EVERYTHING);
  return articles;
}

// ---------------------------------------------------------------------------
// Public API – getEntertainmentHeadlines
// ---------------------------------------------------------------------------

/**
 * Fetch top entertainment headlines using the NewsAPI "top-headlines" endpoint.
 *
 * Returns up to 10 articles from US entertainment sources.
 *
 * @returns An array of `NewsArticle` objects (max 10), empty on error.
 */
export async function getEntertainmentHeadlines(
  apiKey?: string,
): Promise<NewsArticle[]> {
  const cacheKey = "top-headlines:entertainment:us";
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  const raw = await newsApiFetch<NewsApiRawResponse>(
    "/top-headlines",
    {
      category: "entertainment",
      country: "us",
      pageSize: "10",
    },
    apiKey,
  );

  if (!raw) return [];

  const articles = (raw.articles ?? [])
    .filter((a) => a.title && a.url)
    .slice(0, 10)
    .map(transformArticle);

  setCache(cacheKey, articles, CACHE_TTL_HEADLINES);
  return articles;
}

// ---------------------------------------------------------------------------
// Daily stats export
// ---------------------------------------------------------------------------

/**
 * Return current daily quota usage for the NewsAPI free tier.
 */
export function getNewsApiDailyStats(): NewsApiDailyStats {
  maybeResetDaily();

  return {
    used: dailyUsed,
    limit: DAILY_REQUEST_LIMIT,
    remaining: Math.max(0, DAILY_REQUEST_LIMIT - dailyUsed),
  };
}
