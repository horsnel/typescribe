/**
 * Newsdata.io Client
 *
 * Alternative news source to NewsAPI. Provides broader coverage
 * and different rate limits. Used as a supplementary source
 * when NewsAPI quota is exhausted or for additional results.
 *
 * API docs: https://newsdata.io/documentation
 * Free tier: 200 credits/day
 */

// ─── Types ───

export interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  image_url?: string;
  source_id?: string;
  category?: string[];
  country?: string[];
  language?: string;
}

export interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

export interface NewsDataDailyStats {
  used: number;
  limit: number;
  remaining: number;
}

// ─── Config ───

const API_BASE = 'https://newsdata.io/api/1/news';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DAILY_LIMIT = 200;
const RATE_LIMIT_MS = 300;

// ─── Internal State ───

let dailyUsed = 0;
let dailyResetDate = new Date();
const cache = new Map<string, { data: NewsDataArticle[]; expiresAt: number }>();
let lastRequestAt = 0;

// ─── Helpers ───

function getApiKey(): string {
  return process.env.NEWSDATA_IO_API_KEY || '';
}

export function isNewsDataConfigured(): boolean {
  return !!getApiKey();
}

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

export function getNewsDataDailyStats(): NewsDataDailyStats {
  maybeResetDaily();
  return {
    used: dailyUsed,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - dailyUsed),
  };
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

function log(...args: unknown[]): void {
  console.log('[NewsDataIO]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[NewsDataIO]', ...args);
}

// ─── Core Fetch ───

/**
 * Search for movie news articles.
 */
export async function getMovieNews(
  query: string,
  maxResults: number = 5,
): Promise<NewsDataArticle[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  maybeResetDaily();

  if (dailyUsed >= DAILY_LIMIT) {
    warn('Daily limit reached');
    return [];
  }

  const cacheKey = `news:${query}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    log(`Cache hit for "${query}"`);
    return cached.data.slice(0, maxResults);
  }

  await enforceRateLimit();

  const params = new URLSearchParams({
    apikey: apiKey,
    q: `${query} movie OR film OR cinema`,
    language: 'en',
    category: 'entertainment',
    size: String(Math.min(maxResults, 10)),
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      warn(`HTTP ${res.status} for "${query}"`);
      return [];
    }

    const data: NewsDataResponse = await res.json();

    if (data.status !== 'success' || !data.results) {
      warn(`API error for "${query}"`);
      return [];
    }

    dailyUsed++;

    const articles = data.results.filter(
      (a) => a.title && a.link,
    );

    cache.set(cacheKey, { data: articles, expiresAt: Date.now() + CACHE_TTL_MS });

    log(`Fetched ${articles.length} articles for "${query}"`);

    return articles.slice(0, maxResults);
  } catch (err) {
    warn(`Fetch error for "${query}":`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Get entertainment headlines.
 */
export async function getEntertainmentHeadlines(
  maxResults: number = 10,
): Promise<NewsDataArticle[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  maybeResetDaily();

  if (dailyUsed >= DAILY_LIMIT) return [];

  const cacheKey = 'headlines:entertainment';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data.slice(0, maxResults);
  }

  await enforceRateLimit();

  const params = new URLSearchParams({
    apikey: apiKey,
    category: 'entertainment',
    language: 'en',
    size: String(Math.min(maxResults, 10)),
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];

    const data: NewsDataResponse = await res.json();
    dailyUsed++;

    const articles = (data.results || []).filter((a) => a.title && a.link);

    cache.set(cacheKey, { data: articles, expiresAt: Date.now() + CACHE_TTL_MS });

    return articles.slice(0, maxResults);
  } catch (err) {
    warn('Headlines fetch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Clear all cached news data */
export function clearNewsDataCache(): void {
  cache.clear();
  log('Cache cleared');
}

/** Get cache size */
export function newsDataCacheSize(): number {
  return cache.size;
}
