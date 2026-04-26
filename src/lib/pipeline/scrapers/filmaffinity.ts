/**
 * FilmAffinity Scraper
 * Extracts ratings, vote counts, country info, and review excerpts
 * from FilmAffinity (Spanish market). Uses Spanish proxy via ScrapingBee.
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilmAffinityData {
  rating: number | null;             // 0-10
  ratingCount: number | null;        // Number of votes
  country: string | null;            // Country of origin from FA
  reviewExcerpts: string[];          // Review text snippets
  url: string;
  scrapedAt: string;
}

interface CacheEntry {
  data: FilmAffinityData;
  expiresAt: number;
}

interface SearchResult {
  id: string;      // FA numeric ID, e.g. "883967"
  slug: string;    // Combined slug, e.g. "883967-inception"
  title: string;
  year: number | null;
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'filmaffinity';
const BASE_URL = 'https://www.filmaffinity.com';
const SEARCH_URL = `${BASE_URL}/en/search.php`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SB_OPTIONS: ScrapingBeeOptions = { countryCode: 'es' };

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): FilmAffinityData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: FilmAffinityData, ttlMs?: number): void {
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

function toInt(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log('[FilmAffinity]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[FilmAffinity]', ...args);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchFilmAffinity(
  title: string,
  year?: number
): Promise<SearchResult | null> {
  const query = encodeURIComponent(title);
  const url = `${SEARCH_URL}?stext=${query}&stype=title`;
  log(`Searching: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return null;

  let bestResult: SearchResult | null = null;
  let bestScore = -1;

  // FA search results are in .search-results or table rows
  $('.search-results .item, .se-it, .result-row, table tr').each((_i, el) => {
    const $el = $(el);

    // Find the movie link
    const anchor = $el.find('a[href*="/en/film"], a[href*="/es/film"]').first();
    if (!anchor.length) return;

    const href = anchor.attr('href') ?? '';
    // FA URLs: /en/film{year}-{id}.html or /en/film{id}.html
    const idMatch = href.match(/film(\d+)\.html/);
    if (!idMatch) return;

    const faId = idMatch[1];
    const resultTitle = cleanText(anchor.text()).toLowerCase();
    const titleLower = title.toLowerCase();

    // Score the match
    let score = 0;
    if (resultTitle === titleLower) {
      score = 100;
    } else if (resultTitle.startsWith(titleLower)) {
      score = 80;
    } else if (resultTitle.includes(titleLower) || titleLower.includes(resultTitle)) {
      score = 60;
    } else {
      const titleWords = titleLower.split(/\s+/);
      const matchedWords = titleWords.filter((w) => resultTitle.includes(w));
      score = (matchedWords.length / titleWords.length) * 40;
    }

    // Year matching bonus
    const yearText = $el.find('.year, .d-flex, .text-muted').first().text();
    const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
    const resultYear = yearMatch ? toInt(yearMatch[0]) : null;
    if (year && resultYear === year) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        id: faId,
        slug: faId,
        title: cleanText(anchor.text()),
        year: resultYear,
        url: `${BASE_URL}/en/film${faId}.html`,
      };
    }
  });

  return bestResult;
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

async function scrapeDetailPage(
  faId: string
): Promise<FilmAffinityData | null> {
  const url = `${BASE_URL}/en/film${faId}.html`;
  log(`Scraping detail page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return null;

  // ---- Rating ----
  let rating: number | null = null;

  // Try .rate-big
  const rateBigEl = $('.rate-big, .avg-rating, #rat-avg-value').first();
  if (rateBigEl.length) {
    rating = toNumber(rateBigEl.text());
  }

  // Try itemprop ratingValue
  if (rating === null) {
    const itemPropEl = $('[itemprop="ratingValue"]').first();
    if (itemPropEl.length) {
      rating = toNumber(itemPropEl.text());
    }
  }

  // Try the rating container
  if (rating === null) {
    const ratingContainerEl = $('.rating-box .rate, .movie-rating, .c-rating').first();
    if (ratingContainerEl.length) {
      const text = ratingContainerEl.text();
      const match = text.match(/([\d.]+)\s*\/\s*10/);
      if (match) {
        rating = toNumber(match[1]);
      } else {
        rating = toNumber(text);
      }
    }
  }

  // ---- Rating Count ----
  let ratingCount: number | null = null;

  const ratingCountEl = $('[itemprop="ratingCount"], .rating-count, #rat-count-value, .count').first();
  if (ratingCountEl.length) {
    ratingCount = toInt(ratingCountEl.text().replace(/\D/g, ''));
  }

  // ---- Country ----
  let country: string | null = null;

  // FA shows country as a flag + text in the details section
  const countryEl = $('dt:contains("Country") + dd, dt:contains("País") + dd, .country, .nation').first();
  if (countryEl.length) {
    country = cleanText(countryEl.text());
  }

  // Try the details list
  if (!country) {
    $('.details dt, .movie-info dt').each((_i, el) => {
      if (country) return;
      const label = cleanText($(el).text()).toLowerCase();
      if (label.includes('country') || label.includes('país') || label.includes('nation')) {
        const dd = $(el).next('dd');
        if (dd.length) {
          country = cleanText(dd.text());
        }
      }
    });
  }

  // ---- Review Excerpts ----
  const reviewExcerpts: string[] = [];

  // FA shows user reviews in .review-text or .critic-review elements
  $('.review-text, .critic-review, .review-body, [itemprop="reviewBody"]').each((_i, el) => {
    const text = cleanText($(el).text());
    if (text && text.length > 20) {
      reviewExcerpts.push(text.slice(0, 500)); // Cap excerpt length
    }
  });

  // Also try the "Reviews" section links
  if (reviewExcerpts.length === 0) {
    $('.review-container .text, .pro-review, .user-review-text').each((_i, el) => {
      const text = cleanText($(el).text());
      if (text && text.length > 20) {
        reviewExcerpts.push(text.slice(0, 500));
      }
    });
  }

  return {
    rating,
    ratingCount,
    country,
    reviewExcerpts,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search and scrape FilmAffinity data for a movie.
 *
 * Strategy:
 *  1. Check circuit breaker
 *  2. Check cache
 *  3. Search for the movie on FA
 *  4. Scrape the detail page using the found ID
 *  5. Cache and return
 */
export async function searchAndScrape(
  title: string,
  year?: number
): Promise<FilmAffinityData | null> {
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

  // 3. Search for the movie
  const searchResult = await searchFilmAffinity(title, year);
  if (!searchResult) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`No search results for "${title}" (${elapsed}ms)`);
    return null;
  }

  log(`Found "${searchResult.title}" (ID: ${searchResult.id})`);

  // 4. Scrape detail page
  const data = await scrapeDetailPage(searchResult.id);

  // 5. Validate we got something meaningful
  if (!data || (data.rating === null && data.ratingCount === null)) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`No data found for "${title}" (${elapsed}ms)`);
    return null;
  }

  // 6. Success
  const elapsed = Date.now() - startTime;
  reportSuccess(SCRAPER_NAME);
  recordScraperSuccess(SCRAPER_NAME, elapsed);

  setCache(cacheKey, data);
  log(
    `Scraped "${title}" — rating:${data.rating ?? '?'} votes:${data.ratingCount ?? '?'} country:${data.country ?? '?'} reviews:${data.reviewExcerpts.length} (${elapsed}ms)`
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
