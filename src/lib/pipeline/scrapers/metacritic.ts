/**
 * Metacritic Scraper
 * Extracts metascores, user scores, and review counts from Metacritic.
 * Uses internal JSON API to bypass front-end anti-bot when possible,
 * falls back to ScrapingBee JS rendering.
 */

import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetacriticData {
  metascore: number | null;       // 0-100
  userScore: number | null;       // 0-10
  criticReviewCount: number | null;
  userReviewCount: number | null;
  summary: string | null;
  url: string;
  scrapedAt: string;
}

interface CacheEntry {
  data: MetacriticData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'metacritic';
const BASE_URL = 'https://www.metacritic.com';
const FANDOM_API_BASE = 'https://fandom-prod.apigee.net/v1/xapi/composer/metacritic/pages/movies';
const FANDOM_API_KEY = '2ZY9g7u9TLCYn6mS2Wv643MdB5m6GgX7';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SB_OPTIONS_RENDER: ScrapingBeeOptions = { renderJs: true };
const SB_OPTIONS_JSON: ScrapingBeeOptions = {
  headers: { Accept: 'application/json' },
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): MetacriticData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MetacriticData, ttlMs?: number): void {
  cache.set(key, { data, expiresAt: Date.now() + (ttlMs ?? CACHE_TTL_MS) });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log('[Metacritic]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Metacritic]', ...args);
}

/**
 * Convert a movie title to a Metacritic-style slug.
 * Metacritic URLs use lowercase with hyphens, e.g. "the-dark-knight".
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Strategy 1: Fandom internal API
// ---------------------------------------------------------------------------

async function fetchFromFandomApi(
  slug: string
): Promise<MetacriticData | null> {
  const url = `${FANDOM_API_BASE}/${slug}?apiKey=${FANDOM_API_KEY}`;
  log(`Trying Fandom API: ${url}`);

  try {
    const html = await scrapeHtml(url, SB_OPTIONS_JSON);
    if (!html) return null;

    const json = JSON.parse(html);
    const modules = json?.data?.modules ?? [];

    let metascore: number | null = null;
    let userScore: number | null = null;
    let criticReviewCount: number | null = null;
    let userReviewCount: number | null = null;
    let summary: string | null = null;

    for (const mod of modules) {
      // Metascore module
      if (mod?.metaScore?.value !== undefined) {
        metascore = toNumber(mod.metaScore.value);
        criticReviewCount = toNumber(mod.metaScore.reviewCount);
      }
      // User score module
      if (mod?.userScore?.value !== undefined) {
        userScore = toNumber(mod.userScore.value);
        userReviewCount = toNumber(mod.userScore.reviewCount);
      }
      // Summary / description
      if (mod?.summary) {
        summary = typeof mod.summary === 'string' ? mod.summary : mod.summary.text ?? null;
      }
      if (mod?.description && !summary) {
        summary = typeof mod.description === 'string' ? mod.description : null;
      }
    }

    // If we got at least a metascore or user score, it's a valid result
    if (metascore !== null || userScore !== null) {
      return {
        metascore,
        userScore,
        criticReviewCount,
        userReviewCount,
        summary,
        url: `${BASE_URL}/movie/${slug}`,
        scrapedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    warn('Fandom API parse error:', err instanceof Error ? err.message : err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: Scrape Metacritic page with JS rendering
// ---------------------------------------------------------------------------

async function fetchFromPage(
  slug: string
): Promise<MetacriticData | null> {
  const url = `${BASE_URL}/movie/${slug}`;
  log(`Scraping page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS_RENDER);
  if (!$) return null;

  let metascore: number | null = null;
  let userScore: number | null = null;
  let criticReviewCount: number | null = null;
  let userReviewCount: number | null = null;
  let summary: string | null = null;

  // Metascore
  const metascoreEl = $('.metascore_w.movie, .metascore_w.large.movie, [itemprop="ratingValue"]').first();
  if (metascoreEl.length) {
    metascore = toNumber(metascoreEl.text());
  }

  // User score
  const userScoreEl = $('.userscore_w.movie, .metascore_w.user.movie, .user-score .metascore_w').first();
  if (userScoreEl.length) {
    userScore = toNumber(userScoreEl.text());
  }

  // Review counts
  const criticCountEl = $('.score_details .count a, .critic-count, .based_on').first();
  if (criticCountEl.length) {
    criticReviewCount = toNumber(criticCountEl.text().replace(/\D/g, ''));
  }

  const userCountEl = $('.user-score .count a, .user-count').first();
  if (userCountEl.length) {
    userReviewCount = toNumber(userCountEl.text().replace(/\D/g, ''));
  }

  // Summary / description
  const summaryEl = $('.summary_details .summary, [itemprop="description"], .deck, .review_body').first();
  if (summaryEl.length) {
    summary = cleanText(summaryEl.text());
  }

  // Try JSON-LD fallback for summary
  if (!summary) {
    $('script[type="application/ld+json"]').each((_i, el) => {
      if (summary) return;
      try {
        const raw = $(el).text().trim();
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item?.description && typeof item.description === 'string') {
            summary = item.description;
            break;
          }
        }
      } catch {
        // Ignore
      }
    });
  }

  return {
    metascore,
    userScore,
    criticReviewCount,
    userReviewCount,
    summary,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchMetacritic(
  title: string
): Promise<string | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/search/${query}`;
  log(`Searching: ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS_RENDER);
  if (!$) return null;

  // Try to find the first movie result link
  const firstResult = $('a[href*="/movie/"]').first();
  if (firstResult.length) {
    const href = firstResult.attr('href') ?? '';
    const slugMatch = href.match(/\/movie\/([^/?#]+)/);
    if (slugMatch) {
      return slugMatch[1];
    }
  }

  // Try search results list items
  const resultItem = $('.search-result a, .c-searchResult a, .g-search-result a').first();
  if (resultItem.length) {
    const href = resultItem.attr('href') ?? '';
    const slugMatch = href.match(/\/movie\/([^/?#]+)/);
    if (slugMatch) {
      return slugMatch[1];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search and scrape Metacritic data for a movie.
 *
 * Strategy:
 *  1. Check circuit breaker
 *  2. Check cache
 *  3. Try Fandom internal JSON API (cheap, fast)
 *  4. Fall back to full page scrape with JS rendering
 *  5. Cache and return
 */
export async function searchAndScrape(
  title: string,
  year?: number
): Promise<MetacriticData | null> {
  // 1. Circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping "${title}"`);
    return null;
  }

  // 2. Cache
  const cacheKey = `search:${title.toLowerCase()}:${year ?? 'any'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}"`);
    return cached;
  }

  const startTime = Date.now();

  // 3. Derive slug
  let slug = titleToSlug(title);

  // 4. Try Fandom API first
  let data = await fetchFromFandomApi(slug);

  // 5. If Fandom API fails, try full page scrape
  if (!data || (data.metascore === null && data.userScore === null)) {
    log(`Fandom API miss for slug "${slug}", trying page scrape`);
    data = await fetchFromPage(slug);
  }

  // 6. If slug-based approach fails, try searching
  if (!data || (data.metascore === null && data.userScore === null)) {
    log(`Slug "${slug}" not found, searching for "${title}"`);
    const foundSlug = await searchMetacritic(title);
    if (foundSlug && foundSlug !== slug) {
      slug = foundSlug;
      data = await fetchFromFandomApi(slug);
      if (!data || (data.metascore === null && data.userScore === null)) {
        data = await fetchFromPage(slug);
      }
    }
  }

  // 7. Validate we got something meaningful
  if (!data || (data.metascore === null && data.userScore === null && !data.summary)) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`No data found for "${title}" (${elapsed}ms)`);
    return null;
  }

  // 8. Filter by year if provided
  if (year && data.url) {
    // Metacritic may return a different year's movie — we log a note
    // but don't filter aggressively since slug may differ
    log(`Result for "${title}" — year filter ${year} applied but not enforced`);
  }

  // 9. Success
  const elapsed = Date.now() - startTime;
  reportSuccess(SCRAPER_NAME);
  recordScraperSuccess(SCRAPER_NAME, elapsed);

  setCache(cacheKey, data);
  log(
    `Scraped "${title}" — metascore:${data.metascore ?? '?'} user:${data.userScore ?? '?'} (${elapsed}ms)`
  );

  return data;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/** Clear all cached entries. */
export function clearCache(): void {
  cache.clear();
  log('Cache cleared');
}

/** Return current cache size. */
export function cacheSize(): number {
  return cache.size;
}
