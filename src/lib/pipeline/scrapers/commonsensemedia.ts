/**
 * Common Sense Media Scraper
 * Extracts age ratings, parent reviews, content advisories, and kid/parent ratings.
 * Age ratings are stable data — cached for 90 days.
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommonSenseMediaData {
  ageRating: string | null;                   // e.g. "13+", "8+", "16+"
  contentAdvisories: string[];                // e.g. ["Violence", "Language", "Consumerism"]
  parentalReview: string | null;              // Summary paragraph
  parentRating: number | null;                // 0-5
  kidRating: number | null;                   // 0-5
  url: string;
  scrapedAt: string;
}

interface CacheEntry {
  data: CommonSenseMediaData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'commonsensemedia';
const BASE_URL = 'https://www.commonsensemedia.org';
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (age ratings don't change)

const SB_OPTIONS: ScrapingBeeOptions = {}; // No special options needed

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): CommonSenseMediaData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: CommonSenseMediaData, ttlMs?: number): void {
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
  console.log('[CommonSenseMedia]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[CommonSenseMedia]', ...args);
}

/**
 * Convert a movie title to a CSM-style slug.
 * CSM URLs use lowercase with hyphens, e.g. "the-dark-knight".
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

async function scrapeDetailPage(
  slug: string
): Promise<CommonSenseMediaData | null> {
  const url = `${BASE_URL}/movie-reviews/${slug}`;
  log(`Scraping detail page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return null;

  // ---- Age Rating ----
  let ageRating: string | null = null;

  // Try .age-rating class
  const ageRatingEl = $('.age-rating, .csm-age-rating, .product-rating').first();
  if (ageRatingEl.length) {
    ageRating = cleanText(ageRatingEl.text());
  }

  // Try data-age attribute
  if (!ageRating) {
    const dataAgeEl = $('[data-age]').first();
    if (dataAgeEl.length) {
      ageRating = dataAgeEl.attr('data-age') ?? null;
    }
  }

  // Try "Age X+" pattern in text
  if (!ageRating) {
    const bodyText = $('body').text();
    const ageMatch = bodyText.match(/Age\s*(\d+)\+/i);
    if (ageMatch) {
      ageRating = `${ageMatch[1]}+`;
    }
  }

  // Try the rating badge
  if (!ageRating) {
    const badgeEl = $('.rating-badge, .age-badge, .csm-green-check').first();
    if (badgeEl.length) {
      const badgeText = cleanText(badgeEl.text());
      const badgeMatch = badgeText.match(/(\d+)\+/);
      if (badgeMatch) {
        ageRating = `${badgeMatch[1]}+`;
      }
    }
  }

  // ---- Content Advisories ----
  const contentAdvisories: string[] = [];

  // Try .content-grid .advisory elements
  $('.content-grid .advisory, .content-advisory .advisory, .csm-advisory').each((_i, el) => {
    const text = cleanText($(el).text());
    if (text) contentAdvisories.push(text);
  });

  // Try category-based advisory sections
  if (contentAdvisories.length === 0) {
    $('.advisory-category, .content-category, .category-item').each((_i, el) => {
      const text = cleanText($(el).text());
      if (text) contentAdvisories.push(text);
    });
  }

  // Try the "What Parents Need to Know" section
  if (contentAdvisories.length === 0) {
    const needsSection = $('.what-parents-need-to-know, .parents-need-to-know');
    if (needsSection.length) {
      needsSection.find('li, .advisory-item').each((_i, el) => {
        const text = cleanText($(el).text());
        if (text) contentAdvisories.push(text);
      });
    }
  }

  // ---- Parental Review ----
  let parentalReview: string | null = null;

  // Try the review body / summary paragraph
  const reviewEl = $(
    '.review-body, .parent-review, .csm-review, .product-review-summary, [itemprop="description"]'
  ).first();
  if (reviewEl.length) {
    parentalReview = cleanText(reviewEl.text());
  }

  // Try "Parents say" section
  if (!parentalReview) {
    const parentsSayEl = $('.parents-say, .parent-summary, .review-summary').first();
    if (parentsSayEl.length) {
      parentalReview = cleanText(parentsSayEl.text());
    }
  }

  // ---- Parent Rating (0-5) ----
  let parentRating: number | null = null;

  const parentRatingEl = $(
    '.parent-rating .stars, .parent-rating .star-rating, .parents-rating, [data-parent-rating]'
  ).first();
  if (parentRatingEl.length) {
    const dataRating = parentRatingEl.attr('data-parent-rating');
    if (dataRating) {
      parentRating = toNumber(dataRating);
    } else {
      parentRating = toNumber(parentRatingEl.text());
    }
  }

  // Try star count from filled stars
  if (parentRating === null) {
    const filledStars = $('.parent-rating .star.filled, .parent-rating .star--filled').length;
    if (filledStars > 0) {
      parentRating = filledStars;
    }
  }

  // ---- Kid Rating (0-5) ----
  let kidRating: number | null = null;

  const kidRatingEl = $(
    '.kid-rating .stars, .kid-rating .star-rating, .kids-rating, [data-kid-rating]'
  ).first();
  if (kidRatingEl.length) {
    const dataRating = kidRatingEl.attr('data-kid-rating');
    if (dataRating) {
      kidRating = toNumber(dataRating);
    } else {
      kidRating = toNumber(kidRatingEl.text());
    }
  }

  // Try star count from filled stars
  if (kidRating === null) {
    const filledStars = $('.kid-rating .star.filled, .kid-rating .star--filled').length;
    if (filledStars > 0) {
      kidRating = filledStars;
    }
  }

  // Try rating from overall rating sections
  if (parentRating === null || kidRating === null) {
    $('.rating-row, .review-rating').each((_i, el) => {
      const $el = $(el);
      const label = $el.find('.label, .rating-label').text().toLowerCase();
      const value = toNumber($el.find('.value, .rating-value, .stars').text());
      if (value === null) return;

      if (label.includes('parent') && parentRating === null) {
        parentRating = value;
      }
      if (label.includes('kid') && kidRating === null) {
        kidRating = value;
      }
    });
  }

  return {
    ageRating,
    contentAdvisories,
    parentalReview,
    parentRating,
    kidRating,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchCommonSenseMedia(
  title: string
): Promise<string | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/search?q=${query}`;
  log(`Searching: ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS);
  if (!$) return null;

  // Try to find the first movie review link
  const firstResult = $('a[href*="/movie-reviews/"]').first();
  if (firstResult.length) {
    const href = firstResult.attr('href') ?? '';
    const slugMatch = href.match(/\/movie-reviews\/([^/?#]+)/);
    if (slugMatch) {
      return slugMatch[1];
    }
  }

  // Try search result items
  const resultItem = $('.search-result a, .search-item a, .csm-search-result a').first();
  if (resultItem.length) {
    const href = resultItem.attr('href') ?? '';
    const slugMatch = href.match(/\/movie-reviews\/([^/?#]+)/);
    if (slugMatch) {
      return slugMatch[1];
    }
  }

  // Try any link containing movie-reviews
  const anyLink = $('a[href*="movie-reviews"]').first();
  if (anyLink.length) {
    const href = anyLink.attr('href') ?? '';
    const slugMatch = href.match(/\/movie-reviews\/([^/?#]+)/);
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
 * Search and scrape Common Sense Media data for a movie.
 *
 * Strategy:
 *  1. Check circuit breaker
 *  2. Check cache (90-day TTL since age ratings are stable)
 *  3. Try slug-based URL first
 *  4. Fall back to search if slug doesn't resolve
 *  5. Cache and return
 */
export async function searchAndScrape(
  title: string
): Promise<CommonSenseMediaData | null> {
  // 1. Circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping "${title}"`);
    return null;
  }

  // 2. Cache
  const cacheKey = `search:${title.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}"`);
    return cached;
  }

  const startTime = Date.now();

  // 3. Derive slug and try direct URL
  let slug = titleToSlug(title);
  let data = await scrapeDetailPage(slug);

  // 4. If slug-based approach fails, try searching
  if (!data || (!data.ageRating && data.contentAdvisories.length === 0 && !data.parentalReview)) {
    log(`Slug "${slug}" not found, searching for "${title}"`);
    const foundSlug = await searchCommonSenseMedia(title);
    if (foundSlug && foundSlug !== slug) {
      slug = foundSlug;
      data = await scrapeDetailPage(slug);
    }
  }

  // 5. Validate we got something meaningful
  if (!data || (!data.ageRating && data.contentAdvisories.length === 0 && !data.parentalReview && data.parentRating === null && data.kidRating === null)) {
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
    `Scraped "${title}" — age:${data.ageRating ?? '?'} advisories:${data.contentAdvisories.length} parent:${data.parentRating ?? '?'} kid:${data.kidRating ?? '?'} (${elapsed}ms)`
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
