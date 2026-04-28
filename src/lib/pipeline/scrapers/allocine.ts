/**
 * AlloCiné Scraper
 * Extracts press ratings, user ratings, and press review excerpts
 * from AlloCiné (French market). Uses French proxy and JS rendering
 * since AlloCiné uses React for rendering.
 */

import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlloCineData {
  pressRating: number | null;            // 0-5 (critic rating from press)
  userRating: number | null;             // 0-5
  ratingCount: number | null;            // Number of user ratings
  pressReviewExcerpts: string[];         // Press review snippets
  url: string;
  scrapedAt: string;
}

interface CacheEntry {
  data: AlloCineData;
  expiresAt: number;
}

interface SearchResult {
  id: string;        // AlloCiné numeric ID (cfilm)
  title: string;
  year: number | null;
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'allocine';
const BASE_URL = 'https://www.allocine.fr';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SB_OPTIONS: ScrapingBeeOptions = {
  countryCode: 'fr',
  renderJs: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): AlloCineData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: AlloCineData, ttlMs?: number): void {
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
  console.log('[AlloCiné]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[AlloCiné]', ...args);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchAlloCine(
  title: string,
  year?: number
): Promise<SearchResult | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/rechercher/?q=${query}`;
  log(`Searching: ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS);
  if (!$) return null;

  let bestResult: SearchResult | null = null;
  let bestScore = -1;

  // AlloCiné search results contain links to movie pages
  // URLs: /film/fichefilm_gen_cfilm=XXXX.html
  $('.search-results .entity, .search-list .mdl, .results-list a, a[href*="fichefilm_gen_cfilm"]').each(
    (_i, el) => {
      const $el = $(el);
      const anchor = $el.is('a') ? $el : $el.find('a[href*="fichefilm"]').first();
      if (!anchor.length) return;

      const href = anchor.attr('href') ?? '';
      const idMatch = href.match(/cfilm=(\d+)/);
      if (!idMatch) return;

      const filmId = idMatch[1];
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
      const parentText = $el.closest('div, li, article').text();
      const yearMatch = parentText.match(/\b(19|20)\d{2}\b/);
      const resultYear = yearMatch ? toInt(yearMatch[0]) : null;
      if (year && resultYear === year) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestResult = {
          id: filmId,
          title: cleanText(anchor.text()),
          year: resultYear,
          url: `${BASE_URL}/film/fichefilm_gen_cfilm=${filmId}.html`,
        };
      }
    }
  );

  return bestResult;
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

async function scrapeDetailPage(
  filmId: string
): Promise<AlloCineData | null> {
  const url = `${BASE_URL}/film/fichefilm_gen_cfilm=${filmId}.html`;
  log(`Scraping detail page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return null;

  let pressRating: number | null = null;
  let userRating: number | null = null;
  let ratingCount: number | null = null;
  const pressReviewExcerpts: string[] = [];

  // ---- Press Rating (out of 5, from critics) ----
  // AlloCiné shows press rating as .stareval-note with class .press-rating
  const pressRatingEl = $(
    '.stareval-note.press-rating, .rating-item .stareval-note, ' +
    '.review-brief .stareval-note, .rating-mdl .stareval-note'
  ).first();
  if (pressRatingEl.length) {
    pressRating = toNumber(pressRatingEl.text());
  }

  // Try data attributes
  if (pressRating === null) {
    const pressDataEl = $('[data-rating-type="press"] .stareval-note, .rating-pres .stareval-note').first();
    if (pressDataEl.length) {
      pressRating = toNumber(pressDataEl.text());
    }
  }

  // Fallback: look for "Presse" label near a rating
  if (pressRating === null) {
    $(':contains("Presse")').each((_i, el) => {
      if (pressRating !== null) return;
      const $el = $(el);
      if ($el.find('.stareval-note').length) {
        pressRating = toNumber($el.find('.stareval-note').first().text());
      } else {
        // Check nearby siblings
        const nextEl = $el.next('.stareval-note, .rating-value');
        if (nextEl.length) {
          pressRating = toNumber(nextEl.text());
        }
      }
    });
  }

  // ---- User Rating (out of 5) ----
  const userRatingEl = $(
    '.stareval-note.user-rating, .rating-users .stareval-note, ' +
    '.review-brief-user .stareval-note, [data-rating-type="users"] .stareval-note'
  ).first();
  if (userRatingEl.length) {
    userRating = toNumber(userRatingEl.text());
  }

  // Fallback: look for "Spectateurs" label near a rating
  if (userRating === null) {
    $(':contains("Spectateurs")').each((_i, el) => {
      if (userRating !== null) return;
      const $el = $(el);
      if ($el.find('.stareval-note').length) {
        userRating = toNumber($el.find('.stareval-note').first().text());
      } else {
        const nextEl = $el.next('.stareval-note, .rating-value');
        if (nextEl.length) {
          userRating = toNumber(nextEl.text());
        }
      }
    });
  }

  // General fallback: grab all stareval-note elements and assign first two
  if (pressRating === null || userRating === null) {
    const allRatings: number[] = [];
    $('.stareval-note, .rating-item .value').each((_i, el) => {
      const val = toNumber($(el).text());
      if (val !== null) allRatings.push(val);
    });
    if (allRatings.length >= 2) {
      if (pressRating === null) pressRating = allRatings[0];
      if (userRating === null) userRating = allRatings[1];
    } else if (allRatings.length === 1) {
      // Single rating is usually user rating
      if (userRating === null) userRating = allRatings[0];
    }
  }

  // ---- Rating Count ----
  const ratingCountEl = $(
    '.rating-count, .review-count, [itemprop="ratingCount"], .stareval-review-count'
  ).first();
  if (ratingCountEl.length) {
    ratingCount = toInt(ratingCountEl.text().replace(/\D/g, ''));
  }

  // ---- Press Review Excerpts ----
  // AlloCiné shows press reviews in .review-card or .review-brief
  $(
    '.review-card .review-content, .review-brief .content-txt, ' +
    '.press-review .review-body, .review-text, [itemprop="reviewBody"]'
  ).each((_i, el) => {
    const text = cleanText($(el).text());
    if (text && text.length > 15) {
      pressReviewExcerpts.push(text.slice(0, 500)); // Cap excerpt length
    }
  });

  // Also try JSON-LD for review data
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).text().trim();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        // Extract aggregate rating
        if (item?.aggregateRating) {
          const ar = item.aggregateRating;
          if (userRating === null && ar.ratingValue !== undefined) {
            const val = toNumber(ar.ratingValue);
            const best = toNumber(ar.bestRating) ?? 5;
            if (val !== null) {
              userRating = best === 5 ? val : Math.round((val / best) * 5 * 10) / 10;
            }
          }
          if (ratingCount === null && ar.ratingCount !== undefined) {
            ratingCount = toInt(ar.ratingCount);
          }
        }

        // Extract review bodies
        if (item?.review) {
          const reviews = Array.isArray(item.review) ? item.review : [item.review];
          for (const rev of reviews) {
            if (rev?.reviewBody && typeof rev.reviewBody === 'string') {
              const body = rev.reviewBody.trim();
              if (body.length > 15 && !pressReviewExcerpts.includes(body.slice(0, 500))) {
                pressReviewExcerpts.push(body.slice(0, 500));
              }
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  });

  return {
    pressRating,
    userRating,
    ratingCount,
    pressReviewExcerpts,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search and scrape AlloCiné data for a movie.
 *
 * Strategy:
 *  1. Check circuit breaker
 *  2. Check cache
 *  3. Search for the movie on AlloCiné
 *  4. Scrape the detail page (with JS rendering and French proxy)
 *  5. Cache and return
 */
export async function searchAndScrape(
  title: string,
  year?: number
): Promise<AlloCineData | null> {
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
  const searchResult = await searchAlloCine(title, year);
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
  if (!data || (data.pressRating === null && data.userRating === null && data.pressReviewExcerpts.length === 0)) {
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
    `Scraped "${title}" — press:${data.pressRating ?? '?'} user:${data.userRating ?? '?'} reviews:${data.pressReviewExcerpts.length} (${elapsed}ms)`
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
