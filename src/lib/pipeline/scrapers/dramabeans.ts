/**
 * Dramabeans Scraper
 * Extracts K-drama episode recaps and drama reviews from Dramabeans.com —
 * the premier English-language K-drama recap and review site.
 *
 * Tier A: Zero protection. Uses ScrapingBee with no country code (English site).
 * Cache TTL: 6 hours (new episodes air regularly).
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DramabeansRecap {
  title: string;
  url: string;
  date: string | null;
}

export interface DramabeansReview {
  title: string;
  url: string;
  excerpt: string;
}

export interface DramabeansData {
  recaps: DramabeansRecap[];
  reviews: DramabeansReview[];
}

interface CacheEntry {
  data: DramabeansData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.dramabeans.com';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — new episodes air regularly

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  // No country code needed — English site
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): DramabeansData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: DramabeansData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  console.log('[Dramabeans]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Dramabeans]', ...args);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Search and scrape
// ---------------------------------------------------------------------------

/**
 * Search Dramabeans for a K-drama and extract recaps and reviews.
 *
 * 1. Check circuit breaker
 * 2. Check cache
 * 3. Scrape search results page
 * 4. Parse recaps (links containing "recap" in URL/text) and reviews
 * 5. Cache and return
 */
export async function searchDrama(
  title: string,
): Promise<DramabeansData | null> {
  // Circuit breaker check
  if (!canRequest('dramabeans')) {
    warn('Circuit breaker is OPEN — skipping request');
    return null;
  }

  // Cache check
  const cacheKey = `search:${title}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}"`);
    return cached;
  }

  const startTime = Date.now();
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
  log(`Searching "${title}" → ${searchUrl}`);

  try {
    const $ = await scrapeAndParse(searchUrl, SCRAPE_OPTIONS);
    if (!$) {
      reportFailure('dramabeans');
      recordScraperFailure('dramabeans');
      return null;
    }

    const recaps: DramabeansRecap[] = [];
    const reviews: DramabeansReview[] = [];

    // Parse article entries from search results
    // Dramabeans uses standard WordPress entry structure
    const articles = $('article, .post, .entry');

    if (articles.length === 0) {
      // Fallback: try generic entry-title links
      parseFromEntryLinks($, recaps, reviews);
    } else {
      articles.each((_i, article) => {
        const $article = $(article);

        // Get the title and link from .entry-title a
        const titleLink = $article.find('.entry-title a, h2 a, h3 a').first();
        const articleTitle = cleanText(titleLink.text());
        const articleUrl = titleLink.attr('href') ?? '';

        if (!articleTitle || !articleUrl) return;

        // Get date
        const dateEl = $article.find('.entry-date, time, .post-date, .date').first();
        const date = dateEl.attr('datetime') ?? dateEl.text().trim() ?? null;
        const cleanDate = date ? cleanText(date) : null;

        // Determine if this is a recap or a review
        const titleLower = articleTitle.toLowerCase();
        const urlLower = articleUrl.toLowerCase();

        if (
          titleLower.includes('recap') ||
          urlLower.includes('recap') ||
          titleLower.includes('ep.') ||
          titleLower.match(/episodes?\s+\d/i)
        ) {
          // This is a recap
          recaps.push({
            title: articleTitle,
            url: articleUrl,
            date: cleanDate,
          });
        } else {
          // This is a review or other article
          // Try to get excerpt
          const excerptEl = $article.find(
            '.entry-content, .entry-summary, .excerpt, .post-excerpt',
          ).first();
          let excerpt = '';

          if (excerptEl.length) {
            // Get text from paragraphs only, not the full content
            const pText = excerptEl.find('p').first().text();
            excerpt = cleanText(pText || excerptEl.text()).slice(0, 400);
          }

          if (excerpt || articleTitle) {
            reviews.push({
              title: articleTitle,
              url: articleUrl,
              excerpt: excerpt || '',
            });
          }
        }
      });
    }

    const responseTimeMs = Date.now() - startTime;

    const data: DramabeansData = {
      recaps,
      reviews,
    };

    // Cache, report success
    setCache(cacheKey, data);
    reportSuccess('dramabeans');
    recordScraperSuccess('dramabeans', responseTimeMs);

    log(
      `Scraped "${title}" — recaps:${recaps.length} reviews:${reviews.length} (${responseTimeMs}ms)`,
    );

    return data;
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    warn(
      `Error searching "${title}":`,
      err instanceof Error ? err.message : err,
    );
    reportFailure('dramabeans');
    recordScraperFailure('dramabeans');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fallback parser for non-article structured pages
// ---------------------------------------------------------------------------

function parseFromEntryLinks(
  $: ReturnType<typeof import('cheerio').load>,
  recaps: DramabeansRecap[],
  reviews: DramabeansReview[],
): void {
  // Try .entry-title a links directly
  $('.entry-title a, h2.entry-title a').each((_i, el) => {
    const $el = $(el);
    const articleTitle = cleanText($el.text());
    const articleUrl = $el.attr('href') ?? '';

    if (!articleTitle || !articleUrl) return;

    const titleLower = articleTitle.toLowerCase();
    const urlLower = articleUrl.toLowerCase();

    if (
      titleLower.includes('recap') ||
      urlLower.includes('recap') ||
      titleLower.includes('ep.') ||
      titleLower.match(/episodes?\s+\d/i)
    ) {
      // Try to find date from nearby element
      const parentLi = $el.closest('li, .post');
      const dateEl = parentLi.find('.entry-date, time, .date').first();
      const date = dateEl.attr('datetime') ?? dateEl.text().trim() ?? null;

      recaps.push({
        title: articleTitle,
        url: articleUrl,
        date: date ? cleanText(date) : null,
      });
    } else {
      // Try to get excerpt from nearby content
      const parentLi = $el.closest('li, .post');
      const excerptEl = parentLi.find('.entry-content, .entry-summary, .excerpt').first();
      let excerpt = '';
      if (excerptEl.length) {
        excerpt = cleanText(excerptEl.text()).slice(0, 400);
      }

      reviews.push({
        title: articleTitle,
        url: articleUrl,
        excerpt,
      });
    }
  });
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
