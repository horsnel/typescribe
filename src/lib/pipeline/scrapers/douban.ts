/**
 * Douban Scraper
 * Extracts Chinese ratings, reviews, and metadata from Douban — China's biggest film database.
 * Tier C scraper — uses ScrapingBee with premium proxies due to fingerprinting protection.
 */

import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DoubanData {
  rating: number;             // 0-10
  ratingCount: number;        // Number of votes
  summary: string;            // Douban plot summary
  reviewExcerpts: string[];   // Array of review text excerpts
  chineseTitle: string;       // Chinese title
  alternativeNames: string[]; // Alternative / original titles
  url: string;
}

interface CacheEntry {
  data: DoubanData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'douban';
const BASE_URL = 'https://movie.douban.com';
const SEARCH_URL = 'https://search.douban.com/movie/subject_search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  premiumProxy: true,
  countryCode: 'cn',
  renderJs: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): DoubanData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: DoubanData): void {
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
// Search — find Douban subject ID from search results
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
  const searchUrl = `${SEARCH_URL}?search_text=${query}&cat=1002`;

  log(`Searching "${title}" → ${searchUrl}`);

  const html = await scrapeHtml(searchUrl, SCRAPE_OPTIONS);
  if (!html) return null;

  try {
    const results: SearchResult[] = [];

    // Strategy 1: Douban search embeds JSON data in a script tag for React hydration
    // Look for __NUXT__ or window.__DATA__ or similar embedded JSON
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (jsonMatch) {
      try {
        const initData = JSON.parse(jsonMatch[1]);
        const subjects = initData?.payload?.items ?? initData?.result?.items ?? [];
        for (const item of subjects) {
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            const id = String(obj.id ?? '');
            const itemTitle = String(obj.title ?? obj.name ?? '');
            const itemYear = toNumber(obj.year as string | number);
            if (id && itemTitle) {
              results.push({
                id,
                title: itemTitle,
                year: itemYear,
                url: `${BASE_URL}/subject/${id}/`,
              });
            }
          }
        }
      } catch {
        // Fall through to HTML parsing
      }
    }

    // Strategy 2: Parse HTML search result cards
    if (results.length === 0) {
      const $ = await scrapeAndParse(searchUrl, SCRAPE_OPTIONS);
      if (!$) return null;

      // Douban search results are in .item-root or .detail elements
      $('.item-root, .detail, .item').each((_i, el) => {
        const $el = $(el);
        const anchor = $el.find('a[href*="/subject/"]').first();
        const href = anchor.attr('href') ?? '';
        const idMatch = href.match(/\/subject\/(\d+)/);
        if (!idMatch) return;

        const id = idMatch[1];
        const itemTitle = cleanText(anchor.text()) || cleanText($el.find('.title, .title-text').first().text());
        const yearText = cleanText($el.find('.meta, .year, .pl').first().text());
        const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
        const itemYear = yearMatch ? parseInt(yearMatch[0], 10) : null;

        if (id && itemTitle) {
          results.push({
            id,
            title: itemTitle,
            year: itemYear,
            url: `${BASE_URL}/subject/${id}/`,
          });
        }
      });
    }

    // Strategy 3: Regex-based extraction from raw HTML
    if (results.length === 0) {
      const subjectMatches = html.matchAll(/\/subject\/(\d+)/g);
      const seen = new Set<string>();
      for (const match of subjectMatches) {
        const id = match[1];
        if (seen.has(id)) continue;
        seen.add(id);
        results.push({
          id,
          title: '', // Will be filled when scraping detail
          year: null,
          url: `${BASE_URL}/subject/${id}/`,
        });
      }
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

async function scrapeDetailPage(url: string): Promise<DoubanData | null> {
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

    // Douban uses .rating_num or ll.rating_num for the rating value
    const ratingEl = $('.rating_num, ll.rating_num, [property="v:average"]').first();
    if (ratingEl.length) {
      const parsed = toNumber(cleanText(ratingEl.text()));
      if (parsed !== null) rating = parsed;
    }

    // Rating count from [property="v:votes"] or .rating_people span
    const ratingCountEl = $('[property="v:votes"], .rating_people span, .rating_people a').first();
    if (ratingCountEl.length) {
      const parsed = toNumber(cleanText(ratingCountEl.text()).replace(/[^\d]/g, ''));
      if (parsed !== null) ratingCount = parsed;
    }

    // ---- Chinese Title ----
    let chineseTitle = '';
    const titleEl = $('span[property="v:itemreviewed"], h1 span').first();
    if (titleEl.length) {
      chineseTitle = cleanText(titleEl.text());
    }
    // Fallback to og:title
    if (!chineseTitle) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) chineseTitle = cleanText(ogTitle);
    }

    // ---- Alternative Names ----
    const alternativeNames: string[] = [];

    // Douban lists alternative names in the #info section
    const infoSection = $('#info, .subject .info');
    if (infoSection.length) {
      const infoText = cleanText(infoSection.text());

      // Look for "又名" (aka) line
      const akaMatch = infoText.match(/又名[：:]\s*([^/\n]+)/);
      if (akaMatch) {
        const names = akaMatch[1]
          .split(/[/、,，]/)
          .map((s) => cleanText(s))
          .filter(Boolean);
        alternativeNames.push(...names);
      }

      // Look for "原名" (original name) line
      const origMatch = infoText.match(/原名[：:]\s*([^\n/]+)/);
      if (origMatch) {
        const name = cleanText(origMatch[1]);
        if (name && !alternativeNames.includes(name)) {
          alternativeNames.unshift(name);
        }
      }
    }

    // Also check for alternative names in meta tags
    const ogAltName = $('meta[property="og:video:alternative_name"]').attr('content');
    if (ogAltName) {
      const names = ogAltName
        .split(/[/、,，]/)
        .map((s) => cleanText(s))
        .filter((s) => s && !alternativeNames.includes(s));
      alternativeNames.push(...names);
    }

    // ---- Summary ----
    let summary = '';
    const summaryEl = $('[property="v:summary"], .related-info .indent, #link-report .indent').first();
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

    // Douban shows short reviews on the movie page in .comment-item or .review-item
    $('.comment-item .comment-content p, .comment-item .short, .review-item .review-content, .review-short .review-content').each((_i, el) => {
      const text = cleanText($(el).text());
      if (text && text.length > 10) {
        reviewExcerpts.push(text.slice(0, 500)); // Cap excerpt length
      }
    });

    // Also try the comments section
    if (reviewExcerpts.length === 0) {
      $('#hot-comments .comment-item, .comments .comment-item').each((_i, el) => {
        const $el = $(el);
        const contentEl = $el.find('p, .short, span.short').first();
        const text = cleanText(contentEl.text());
        if (text && text.length > 10) {
          reviewExcerpts.push(text.slice(0, 500));
        }
      });
    }

    // Limit to 10 reviews max
    const limitedReviews = reviewExcerpts.slice(0, 10);

    const data: DoubanData = {
      rating,
      ratingCount,
      summary,
      reviewExcerpts: limitedReviews,
      chineseTitle,
      alternativeNames,
      url,
    };

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(
      `Scraped ${url} — rating:${rating} votes:${ratingCount} reviews:${limitedReviews.length} (${elapsed}ms)`,
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
 * Search Douban for a movie by title and scrape its data.
 * Optionally filter by year for disambiguation.
 */
export async function searchAndScrape(
  title: string,
  year?: number,
): Promise<DoubanData | null> {
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
    warn(`No Douban results for "${title}"`);
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
