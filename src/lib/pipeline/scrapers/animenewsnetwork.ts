/**
 * AnimeNewsNetwork Scraper — Tier A
 *
 * Scrapes: ANN encyclopedia rating, review count
 * Method: Search + detail page via ScrapingBee (or direct if no key)
 * Rate: No special protection — lightweight scrape
 */

import * as cheerio from 'cheerio';
import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ANNAnimeData {
  annId: number;
  title: string;
  rating: number | null;         // 0-10 (Bayesian weighted)
  reviewCount: number | null;
  episodeCount: number | null;
  vintage: string | null;        // e.g. "2023-10-07"
  genres: string[];
  synopsis: string | null;
}

interface CacheEntry {
  data: ANNAnimeData;
  expiresAt: number;
}

export interface ANNSearchResult {
  title: string;
  url: string;
  annId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'animenewsnetwork';
const BASE_URL = 'https://www.animenewsnetwork.com';
const SEARCH_URL = 'https://www.animenewsnetwork.com/encyclopedia/search/search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ANN is a simple site — no JS rendering needed
const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  renderJs: false,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): ANNAnimeData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ANNAnimeData): void {
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

function toInt(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(String(val).replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function log(...args: unknown[]): void {
  console.log(`[${SCRAPER_NAME}]`, ...args);
}

function warn(...args: unknown[]): void {
  console.warn(`[${SCRAPER_NAME}]`, ...args);
}

// ---------------------------------------------------------------------------
// Search — find ANN anime ID from search results
// ---------------------------------------------------------------------------

/**
 * Search AnimeNewsNetwork encyclopedia for anime by title.
 * Returns an array of search results with title, URL, and ANN ID.
 */
export async function searchAnime(title: string): Promise<ANNSearchResult[]> {
  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping search for "${title}"`);
    return [];
  }

  const query = encodeURIComponent(title);
  const searchUrl = `${SEARCH_URL}?q=${query}&type=anime`;

  log(`Searching "${title}" → ${searchUrl}`);

  const html = await scrapeHtml(searchUrl, SCRAPE_OPTIONS);
  if (!html) {
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    return [];
  }

  try {
    const results: ANNSearchResult[] = [];
    const $ = cheerio.load(html);

    // ANN search results have links to encyclopedia pages
    // Look for links matching /encyclopedia/anime.php?id=XXXX
    $('a[href*="/encyclopedia/anime.php?id="]').each((_i, el) => {
      const $el = $(el);
      const href = $el.attr('href') ?? '';
      const idMatch = href.match(/id=(\d+)/);

      if (idMatch) {
        const annId = parseInt(idMatch[1], 10);
        const itemTitle = cleanText($el.text());

        if (annId && itemTitle) {
          // Avoid duplicates
          if (!results.some((r) => r.annId === annId)) {
            results.push({
              title: itemTitle,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              annId,
            });
          }
        }
      }
    });

    // Fallback: Regex-based extraction from raw HTML
    if (results.length === 0) {
      const idMatches = html.matchAll(/encyclopedia\/anime\.php\?id=(\d+)/g);
      const seen = new Set<number>();
      for (const match of idMatches) {
        const annId = parseInt(match[1], 10);
        if (seen.has(annId)) continue;
        seen.add(annId);
        results.push({
          title: '',
          url: `${BASE_URL}/encyclopedia/anime.php?id=${annId}`,
          annId,
        });
      }
    }

    log(`Search "${title}" → ${results.length} result(s)`);
    return results;
  } catch (err) {
    warn(`Search parse error for "${title}":`, err instanceof Error ? err.message : err);
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

/**
 * Scrape the ANN encyclopedia anime detail page for full data.
 */
export async function getAnimeDetails(annId: number): Promise<ANNAnimeData | null> {
  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping details for ANN ${annId}`);
    return null;
  }

  // 2. Check cache
  const cacheKey = `ann:${annId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for ANN ${annId}`);
    return cached;
  }

  const detailUrl = `${BASE_URL}/encyclopedia/anime.php?id=${annId}`;
  log(`Scraping ${detailUrl}`);

  const startTime = Date.now();
  const $ = await scrapeAndParse(detailUrl, SCRAPE_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Failed to scrape ${detailUrl}`);
    return null;
  }

  try {
    // ---- Title ----
    let title = '';
    const titleEl = $('#page_header, h1, .encyclopedia-title').first();
    if (titleEl.length) {
      title = cleanText(titleEl.text()).replace(/^Encyclopedia\s*-?\s*/i, '');
    }
    // Fallback to og:title
    if (!title) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) title = cleanText(ogTitle);
    }

    // ---- Rating (Bayesian weighted) ----
    let rating: number | null = null;

    // ANN uses a rating box with Bayesian estimate
    // Look for #ratingbox or rating section
    const ratingboxEl = $('#ratingbox, .rating');
    if (ratingboxEl.length) {
      const ratingText = ratingboxEl.text();
      const ratingMatch = ratingText.match(/(\d+\.?\d*)\s*(?:out of|\/)\s*10/i)
        || ratingText.match(/(\d+\.?\d*)/);
      if (ratingMatch) {
        rating = toNumber(ratingMatch[1]);
      }
    }

    // Alternative: look for "Bayesian estimate" text
    if (rating === null) {
      const bayesText = $(':contains("Bayesian")').text();
      const bayesMatch = bayesText.match(/(\d+\.?\d*)/);
      if (bayesMatch) {
        rating = toNumber(bayesMatch[1]);
      }
    }

    // Alternative: look for rating in meta tags
    if (rating === null) {
      const metaRating = $('meta[itemprop="ratingValue"]').attr('content');
      if (metaRating) rating = toNumber(metaRating);
    }

    // Alternative: ANN sometimes shows ratings in "Rating" row in the info table
    if (rating === null) {
      $('tr, .info-row').each((_i, el) => {
        const $row = $(el);
        const rowText = cleanText($row.text());
        if (rowText.includes('Rating') || rowText.includes('rating')) {
          const match = rowText.match(/(\d+\.?\d*)/);
          if (match) {
            rating = toNumber(match[1]);
            return false; // break
          }
        }
      });
    }

    // ---- Review Count ----
    let reviewCount: number | null = null;
    // Look for links to reviews page with count
    $('a[href*="/reviews.php"], a:contains("review")').each((_i, el) => {
      const text = cleanText($(el).text());
      const match = text.match(/(\d+)/);
      if (match) {
        reviewCount = toInt(match[1]);
        return false; // break
      }
    });
    // Alternative: count review links
    if (reviewCount === null) {
      const reviewLinks = $('a[href*="review"]').length;
      if (reviewLinks > 0) {
        reviewCount = reviewLinks;
      }
    }

    // ---- Episode Count ----
    let episodeCount: number | null = null;
    const epEl = $('span:contains("Episodes:"), td:contains("Episodes:")').next('td, span').first();
    if (epEl.length) {
      episodeCount = toInt(cleanText(epEl.text()));
    }
    // Alternative: look in info table
    if (episodeCount === null) {
      $('tr, .info-row').each((_i, el) => {
        const $row = $(el);
        const rowText = cleanText($row.text());
        if (rowText.match(/episodes?\s*:/i)) {
          const match = rowText.match(/(\d+)/);
          if (match) {
            episodeCount = toInt(match[1]);
            return false;
          }
        }
      });
    }

    // ---- Vintage (air date) ----
    let vintage: string | null = null;
    const vintageEl = $('span:contains("Vintage:"), td:contains("Vintage:")').next('td, span').first();
    if (vintageEl.length) {
      const vintageText = cleanText(vintageEl.text());
      // Try to parse date format
      const dateMatch = vintageText.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        vintage = dateMatch[1];
      } else {
        // Try other formats
        const yearMatch = vintageText.match(/(\d{4})/);
        if (yearMatch) {
          vintage = vintageText; // Store whatever format ANN provides
        }
      }
    }

    // ---- Genres ----
    const genres: string[] = [];
    // ANN lists genres as links in the info section
    $('a[href*="/encyclopedia/genre.php"], .genre a, a:contains("Themes")').each((_i, el) => {
      const genre = cleanText($(el).text());
      if (genre && !genres.includes(genre) && genre.length < 30) {
        genres.push(genre);
      }
    });
    // Alternative: look for genre/theme keywords in info rows
    if (genres.length === 0) {
      $('tr, .info-row').each((_i, el) => {
        const $row = $(el);
        const rowText = cleanText($row.text());
        if (rowText.match(/(?:genre|theme)s?:/i)) {
          $row.find('a').each((_j, ael) => {
            const genre = cleanText($(ael).text());
            if (genre && !genres.includes(genre) && genre.length < 30) {
              genres.push(genre);
            }
          });
        }
      });
    }

    // ---- Synopsis / Plot Summary ----
    let synopsis: string | null = null;
    // ANN has plot summary sections
    const synopsisEl = $('#infotype-2, .plot-summary, [itemprop="description"]').first();
    if (synopsisEl.length) {
      synopsis = cleanText(synopsisEl.text());
    }
    // Fallback to meta description
    if (!synopsis) {
      const metaDesc = $('meta[property="og:description"], meta[name="description"]').attr('content');
      if (metaDesc) synopsis = cleanText(metaDesc);
    }

    const data: ANNAnimeData = {
      annId,
      title,
      rating,
      reviewCount,
      episodeCount,
      vintage,
      genres,
      synopsis,
    };

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(
      `Scraped ANN ${annId} — rating:${rating} reviews:${reviewCount} episodes:${episodeCount} (${elapsed}ms)`,
    );

    // Cache and return
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Parse error for ANN ${annId}:`, err instanceof Error ? err.message : err);
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
