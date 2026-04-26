/**
 * Filmweb Scraper
 * Extracts Polish ratings (out of 10), vote counts, and review snippets
 * from Filmweb.pl — the largest Polish movie database.
 *
 * Tier A: Zero protection. Uses ScrapingBee with countryCode 'pl'.
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilmwebData {
  rating: number | null;        // 0-10
  ratingCount: number | null;
  reviewExcerpts: string[];
  url: string;
}

interface CacheEntry {
  data: FilmwebData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.filmweb.pl';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  countryCode: 'pl',
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): FilmwebData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: FilmwebData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  console.log('[Filmweb]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Filmweb]', ...args);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

interface LDAggregateRating {
  ratingValue?: string | number;
  bestRating?: string | number;
  ratingCount?: string | number;
}

interface LDMovie {
  name?: string;
  aggregateRating?: LDAggregateRating;
  review?: Array<{ reviewBody?: string }> | { reviewBody?: string };
}

function parseJsonLdBlocks($: ReturnType<typeof import('cheerio').load>): LDMovie[] {
  const results: LDMovie[] = [];

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).text().trim();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (
          item &&
          typeof item === 'object' &&
          ('aggregateRating' in item || 'review' in item || 'name' in item)
        ) {
          results.push(item as LDMovie);
        }
      }
    } catch {
      // Silently ignore malformed JSON-LD blocks
    }
  });

  return results;
}

// ---------------------------------------------------------------------------
// Search — find movie page from title
// ---------------------------------------------------------------------------

async function searchForMovie(
  title: string,
  year?: number,
): Promise<{ slug: string; url: string } | null> {
  const query = year ? `${title} ${year}` : title;
  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;

  log(`Searching "${query}" → ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SCRAPE_OPTIONS);
  if (!$) return null;

  try {
    let bestSlug: string | null = null;
    let bestUrl: string | null = null;

    // Look for film links in search results
    $('a[href*="/film/"]').each((_i, el) => {
      const href = $(el).attr('href') ?? '';
      const match = href.match(/\/film\/([^/?#]+)/);
      if (match && !bestSlug) {
        bestSlug = match[1];
        bestUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      }
    });

    // Fallback: try result containers with hits class
    if (!bestSlug) {
      $('.hitDescWrapper a, .searchResult a, .resultsList a').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        const match = href.match(/\/film\/([^/?#]+)/);
        if (match && !bestSlug) {
          bestSlug = match[1];
          bestUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        }
      });
    }

    if (bestSlug && bestUrl) {
      log(`Search found slug: ${bestSlug}`);
      return { slug: bestSlug, url: bestUrl };
    }

    warn(`No film results found for "${query}"`);
    return null;
  } catch (err) {
    warn(`Search parse error for "${query}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

async function scrapeMoviePage(
  url: string,
): Promise<Omit<FilmwebData, 'url'> | null> {
  log(`Scraping movie page: ${url}`);

  const $ = await scrapeAndParse(url, SCRAPE_OPTIONS);
  if (!$) return null;

  try {
    let rating: number | null = null;
    let ratingCount: number | null = null;
    const reviewExcerpts: string[] = [];

    // --- Strategy 1: JSON-LD structured data ---
    const ldBlocks = parseJsonLdBlocks($);

    for (const block of ldBlocks) {
      if (block.aggregateRating) {
        const ar = block.aggregateRating;
        const bestRating = toNumber(ar.bestRating) ?? 10;
        const rawValue = toNumber(ar.ratingValue);

        if (rawValue !== null) {
          // Normalize to 0-10 scale
          rating = bestRating === 10 ? rawValue : Math.round((rawValue / bestRating) * 10 * 10) / 10;
        }

        ratingCount = toNumber(ar.ratingCount);
      }

      // Extract review bodies
      if (block.review) {
        const reviews = Array.isArray(block.review) ? block.review : [block.review];
        for (const rev of reviews) {
          if (rev.reviewBody && typeof rev.reviewBody === 'string') {
            const body = cleanText(rev.reviewBody);
            if (body && body.length > 20) {
              reviewExcerpts.push(body.slice(0, 300));
            }
          }
        }
      }
    }

    // --- Strategy 2: HTML element scraping ---

    // Filmweb rating from .filmRate__rateValue
    if (rating === null) {
      const ratingEl = $('.filmRate__rateValue, .filmRate__rate').first();
      if (ratingEl.length) {
        rating = toNumber(ratingEl.text());
      }
    }

    // Filmweb rating from data-rate attribute
    if (rating === null) {
      const rateAttr = $('[data-rate]').first().attr('data-rate');
      if (rateAttr) {
        rating = toNumber(rateAttr);
      }
    }

    // Filmweb rating from inline rating element
    if (rating === null) {
      const ratingEl = $(
        '.ratingRate .rateValue, .film-rating .value, .average-rating',
      ).first();
      if (ratingEl.length) {
        rating = toNumber(ratingEl.text());
      }
    }

    // Rating count
    if (ratingCount === null) {
      const countEl = $(
        '.filmRate__count, .filmRate__votesCount, .voteCount, [data-votes]',
      ).first();
      if (countEl.length) {
        const countAttr = countEl.attr('data-votes');
        if (countAttr) {
          ratingCount = toNumber(countAttr);
        } else {
          const countText = countEl.text().replace(/[^\d]/g, '');
          ratingCount = toNumber(countText);
        }
      }
    }

    // Review excerpts from HTML
    if (reviewExcerpts.length === 0) {
      $(
        '.reviewText, .reviewContent, .userReview p, [class*="Review"] p, .filmReview',
      ).each((_i, el) => {
        const text = cleanText($(el).text());
        if (text && text.length > 20 && reviewExcerpts.length < 5) {
          reviewExcerpts.push(text.slice(0, 300));
        }
      });
    }

    log(
      `Scraped page — rating:${rating ?? '?'} count:${ratingCount ?? '?'} reviews:${reviewExcerpts.length}`,
    );

    return { rating, ratingCount, reviewExcerpts };
  } catch (err) {
    warn(`Parse error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search Filmweb for a movie and scrape its rating data.
 *
 * 1. Check circuit breaker
 * 2. Check cache
 * 3. Search for movie page
 * 4. Scrape detail page
 * 5. Cache and return
 */
export async function searchAndScrape(
  title: string,
  year?: number,
): Promise<FilmwebData | null> {
  // Circuit breaker check
  if (!canRequest('filmweb')) {
    warn('Circuit breaker is OPEN — skipping request');
    return null;
  }

  // Cache check
  const cacheKey = `scrape:${title}:${year ?? 'any'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}"`);
    return cached;
  }

  const startTime = Date.now();
  log(`Searching and scraping "${title}"${year ? ` (${year})` : ''}`);

  try {
    // Step 1: Search for the movie page
    const searchResult = await searchForMovie(title, year);
    if (!searchResult) {
      reportFailure('filmweb');
      recordScraperFailure('filmweb');
      return null;
    }

    // Step 2: Scrape the detail page
    const pageData = await scrapeMoviePage(searchResult.url);
    if (!pageData) {
      reportFailure('filmweb');
      recordScraperFailure('filmweb');
      return null;
    }

    const responseTimeMs = Date.now() - startTime;

    const data: FilmwebData = {
      ...pageData,
      url: searchResult.url,
    };

    // Cache, report success
    setCache(cacheKey, data);
    reportSuccess('filmweb');
    recordScraperSuccess('filmweb', responseTimeMs);

    log(
      `Scraped "${title}" — rating:${data.rating ?? '?'} count:${data.ratingCount ?? '?'} reviews:${data.reviewExcerpts.length} (${responseTimeMs}ms)`,
    );

    return data;
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    warn(
      `Error scraping "${title}":`,
      err instanceof Error ? err.message : err,
    );
    reportFailure('filmweb');
    recordScraperFailure('filmweb');
    return null;
  }
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
