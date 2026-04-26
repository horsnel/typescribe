/**
 * Kinopoisk Scraper
 * Extracts Russian ratings, reviews, and metadata from Kinopoisk — Yandex-owned film database.
 * Tier C scraper — uses ScrapingBee with premium proxies due to Yandex's sophisticated bot detection.
 * Kinopoisk uses React rendering, so renderJs is essential.
 */

import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KinopoiskData {
  rating: number;             // 0-10
  ratingCount: number;        // Number of votes
  ratingAwait: number;        // Anticipated rating for unreleased films
  summary: string;            // Kinopoisk plot summary
  reviewExcerpts: string[];   // Array of review text excerpts
  russianTitle: string;       // Russian title
  url: string;
}

interface CacheEntry {
  data: KinopoiskData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'kinopoisk';
const BASE_URL = 'https://www.kinopoisk.ru';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  premiumProxy: true,
  countryCode: 'ru',
  renderJs: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): KinopoiskData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: KinopoiskData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log(`[${SCRAPER_NAME}]`, ...args);
}

function warn(...args: unknown[]): void {
  console.warn(`[${SCRAPER_NAME}]`, ...args);
}

// ---------------------------------------------------------------------------
// Search — find Kinopoisk film ID from search results
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  title: string;
  year: number | null;
  url: string;
}

async function searchMovie(
  title: string,
  year?: number,
): Promise<SearchResult[] | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/index.php?kp_query=${query}`;

  log(`Searching "${title}" → ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SCRAPE_OPTIONS);
  if (!$) return null;

  try {
    const results: SearchResult[] = [];

    // Kinopoisk search results are in .search_results .element cards
    $('.search_results .element, .search_results__item').each((_i, el) => {
      const $el = $(el);

      // Find the film link
      const anchor = $el.find('a[href*="/film/"]').first();
      const href = anchor.attr('href') ?? '';
      const idMatch = href.match(/\/film\/(\d+)/);
      if (!idMatch) return;

      const id = idMatch[1];

      // Title from the anchor or .name element
      const nameEl = $el.find('.name, .search_results__title, .title').first();
      const itemTitle = cleanText(nameEl.length ? nameEl.text() : anchor.text());

      // Year from .year or text content
      const yearEl = $el.find('.year, .search_results__year, .date').first();
      let itemYear: number | null = null;
      if (yearEl.length) {
        const yearMatch = cleanText(yearEl.text()).match(/\b(19|20)\d{2}\b/);
        itemYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
      }
      // Also try from the element text
      if (itemYear === null) {
        const elText = cleanText($el.text());
        const yearMatch = elText.match(/\b(19|20)\d{2}\b/);
        itemYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
      }

      if (id && itemTitle) {
        results.push({
          id,
          title: itemTitle,
          year: itemYear,
          url: `${BASE_URL}/film/${id}/`,
        });
      }
    });

    // Fallback: broader search for any film links
    if (results.length === 0) {
      $('a[href*="/film/"]').each((_i, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';
        const idMatch = href.match(/\/film\/(\d+)/);
        if (!idMatch) return;

        const id = idMatch[1];
        const itemTitle = cleanText($el.text());
        if (!itemTitle) return;

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return;

        results.push({
          id,
          title: itemTitle,
          year: null,
          url: `${BASE_URL}/film/${id}/`,
        });
      });
    }

    // Filter by year if provided
    let filtered = results;
    if (year && results.length > 0) {
      const yearFiltered = results.filter((r) => r.year === year);
      if (yearFiltered.length > 0) {
        filtered = yearFiltered;
      }
    }

    log(`Search "${title}" → ${filtered.length} result(s)`);
    return filtered.length > 0 ? filtered : null;
  } catch (err) {
    warn(`Search parse error for "${title}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

async function scrapeDetailPage(url: string): Promise<KinopoiskData | null> {
  log(`Scraping ${url}`);

  const startTime = Date.now();
  const $ = await scrapeAndParse(url, SCRAPE_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Failed to scrape ${url}`);
    return null;
  }

  try {
    // ---- Rating ----
    let rating = 0;
    let ratingCount = 0;
    let ratingAwait = 0;

    // Strategy 1: Kinopoisk React-rendered rating elements
    // .film-rating-value or span.rating_ball for the main rating
    const ratingEl = $(
      '.film-rating-value, span.rating_ball, .rating__value, .film-header-rating__rating-value, [class*="rating-value"]',
    ).first();
    if (ratingEl.length) {
      const parsed = toNumber(cleanText(ratingEl.text()));
      if (parsed !== null) rating = parsed;
    }

    // Rating count from .rating__count or .film-rating-count
    const ratingCountEl = $(
      '.rating__count, .film-rating-count, .film-header-rating__rating-count, [class*="rating-count"], .count',
    ).first();
    if (ratingCountEl.length) {
      const text = cleanText(ratingCountEl.text()).replace(/[^\d]/g, '');
      const parsed = toNumber(text);
      if (parsed !== null) ratingCount = parsed;
    }

    // Await/anticipated rating for unreleased films
    const awaitEl = $(
      '.rating__await, .await-rating, [class*="await-rating"], .film-rating-await',
    ).first();
    if (awaitEl.length) {
      const parsed = toNumber(cleanText(awaitEl.text()));
      if (parsed !== null) ratingAwait = parsed;
    }

    // Strategy 2: JSON-LD structured data
    if (rating === 0) {
      $('script[type="application/ld+json"]').each((_i, el) => {
        try {
          const raw = $(el).text().trim();
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of items) {
            if (item && typeof item === 'object') {
              const obj = item as Record<string, unknown>;
              if (obj.aggregateRating && typeof obj.aggregateRating === 'object') {
                const ar = obj.aggregateRating as Record<string, unknown>;
                if (rating === 0 && ar.ratingValue !== undefined) {
                  const parsed = toNumber(ar.ratingValue as string | number);
                  if (parsed !== null) rating = parsed;
                }
                if (ratingCount === 0 && ar.ratingCount !== undefined) {
                  const parsed = toNumber(ar.ratingCount as string | number);
                  if (parsed !== null) ratingCount = Math.round(parsed);
                }
              }
            }
          }
        } catch {
          // Ignore malformed JSON-LD
        }
      });
    }

    // Strategy 3: Meta tag fallback
    if (rating === 0) {
      const metaRating = $('meta[property="og:rating"], meta[name="rating"]').attr('content');
      if (metaRating) {
        const parsed = toNumber(metaRating);
        if (parsed !== null) rating = parsed;
      }
    }

    // ---- Russian Title ----
    let russianTitle = '';
    const titleEl = $(
      'h1 [class*="title"], .film-header__title, .moviename-full, h1, [class*="film-name"]',
    ).first();
    if (titleEl.length) {
      russianTitle = cleanText(titleEl.text());
    }
    // Fallback to og:title
    if (!russianTitle) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) russianTitle = cleanText(ogTitle);
    }
    // Clean up common Kinopoisk title suffixes (year, type)
    russianTitle = russianTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

    // ---- Summary ----
    let summary = '';
    const summaryEl = $(
      '.film-description, [class*="film-description"], .story, [class*="synopsis"], [itemprop="description"], [property="og:description"]',
    ).first();
    if (summaryEl.length) {
      summary = cleanText(summaryEl.text());
    }
    // Fallback to meta description
    if (!summary) {
      const metaDesc = $('meta[property="og:description"], meta[name="description"]').attr('content');
      if (metaDesc) summary = cleanText(metaDesc);
    }

    // ---- Review Excerpts ----
    const reviewExcerpts: string[] = [];

    // Kinopoisk shows review snippets on the film page
    $(
      '.review-item .review-text, .response .response__text, [class*="review-content"], [class*="review-text"], .review__body',
    ).each((_i, el) => {
      const text = cleanText($(el).text());
      if (text && text.length > 10) {
        reviewExcerpts.push(text.slice(0, 500)); // Cap excerpt length
      }
    });

    // Also try broader selectors for review-like content
    if (reviewExcerpts.length === 0) {
      $(
        '.reviews .item, .film-reviews .review, [class*="response-item"]',
      ).each((_i, el) => {
        const text = cleanText($(el).text());
        // Filter out very short or empty text
        if (text && text.length > 20) {
          reviewExcerpts.push(text.slice(0, 500));
        }
      });
    }

    // Limit to 10 reviews max
    const limitedReviews = reviewExcerpts.slice(0, 10);

    const data: KinopoiskData = {
      rating,
      ratingCount,
      ratingAwait,
      summary,
      reviewExcerpts: limitedReviews,
      russianTitle,
      url,
    };

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(
      `Scraped ${url} — rating:${rating} votes:${ratingCount} await:${ratingAwait} reviews:${limitedReviews.length} (${elapsed}ms)`,
    );

    return data;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Parse error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main exported functions
// ---------------------------------------------------------------------------

/**
 * Search Kinopoisk for a movie by title and scrape its data.
 * Optionally filter by year for disambiguation.
 */
export async function searchAndScrape(
  title: string,
  year?: number,
): Promise<KinopoiskData | null> {
  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping request for "${title}"`);
    return null;
  }

  // 2. Check cache
  const cacheKey = `search:${title}:${year ?? 'any'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}" (${year ?? 'any year'})`);
    return cached;
  }

  // 3. Search for the movie
  const results = await searchMovie(title, year);
  if (!results || results.length === 0) {
    warn(`No Kinopoisk results for "${title}"`);
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    return null;
  }

  // Use the first (best) result
  const best = results[0];

  // 4. Scrape the detail page
  const data = await scrapeDetailPage(best.url);
  if (!data) return null;

  // 5. Cache and return
  setCache(cacheKey, data);
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

/** Return current cache size (useful for diagnostics). */
export function cacheSize(): number {
  return cache.size;
}
