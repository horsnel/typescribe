/**
 * Letterboxd Scraper — Tier A (Direct Fetch, Free)
 *
 * Extracts "Related Films" from Letterboxd movie pages.
 * Letterboxd's algorithm is cinephile taste-based — it surfaces
 * films that passionate film lovers also watched and rated highly.
 *
 * No API key or ScrapingAnt credits required. Direct HTTP fetch with
 * user-agent rotation. Rate-limited to ~1 req/2s to be respectful.
 *
 * Provides: Related film titles (resolved to TMDb IDs via search)
 */

import { scrapeAndParse, type ScrapingAntOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LetterboxdRelatedFilm {
  title: string;
  year: number | null;
  slug: string;
  url: string;
  letterboxdRating: number | null; // 0-5 scale (averaged)
}

export interface LetterboxdRelatedResult {
  movieSlug: string;
  url: string;
  relatedFilms: LetterboxdRelatedFilm[];
  scrapedAt: string;
}

interface CacheEntry {
  data: LetterboxdRelatedResult;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'letterboxd';
const BASE_URL = 'https://letterboxd.com';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Direct fetch — Letterboxd doesn't need ScrapingAnt for film pages
const SB_OPTIONS: ScrapingAntOptions = {
  directFetch: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): LetterboxdRelatedResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: LetterboxdRelatedResult): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  console.log('[Letterboxd]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Letterboxd]', ...args);
}

/**
 * Convert a movie title to a Letterboxd-style slug.
 * Letterboxd URLs use lowercase with hyphens, e.g. "the-dark-knight".
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Related Films Scraper
// ---------------------------------------------------------------------------

/**
 * Scrape "Related Films" from a Letterboxd movie page.
 *
 * Letterboxd shows related films in a <section class="related-films"> block.
 * Each film is an <li> with a poster link containing the film slug and title.
 */
export async function getRelatedFilms(
  movieTitle: string,
  year?: number,
): Promise<LetterboxdRelatedResult | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping "${movieTitle}"`);
    return null;
  }

  const slug = titleToSlug(movieTitle);
  const cacheKey = `related:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${movieTitle}"`);
    return cached;
  }

  // Try year-specific URL first, then fallback to generic
  const urls = year
    ? [`${BASE_URL}/film/${slug}/year/${year}/`, `${BASE_URL}/film/${slug}/`]
    : [`${BASE_URL}/film/${slug}/`];

  for (const url of urls) {
    const startTime = Date.now();

    const $ = await scrapeAndParse(url, SB_OPTIONS);
    if (!$) {
      warn(`Page scrape failed for ${url}`);
      continue;
    }

    try {
      const relatedFilms: LetterboxdRelatedFilm[] = [];

      // Strategy 1: Related films section
      $('section.related-films li, .really-lazy-load[data-film-slug]').each((_i, el) => {
        const filmSlug = $(el).attr('data-film-slug') ||
          $(el).find('a').attr('href')?.replace(/^\/film\//, '').replace(/\/$/, '') || '';
        const filmTitle = $(el).find('img').attr('alt') ||
          $(el).find('a').attr('title') || '';
        const filmUrl = filmSlug ? `${BASE_URL}/film/${filmSlug}/` : '';

        if (filmTitle && filmSlug) {
          // Try to extract year from the film page link or data attributes
          const yearText = $(el).find('.metadata .release-year, .year').text().trim();
          const yearNum = yearText ? parseInt(yearText, 10) : null;

          // Try to extract rating
          const ratingText = $(el).find('.rating, [data-rating]').attr('data-rating') ||
            $(el).find('.rating').text().trim();
          let rating: number | null = null;
          if (ratingText) {
            const parsed = parseFloat(ratingText);
            if (!isNaN(parsed)) rating = parsed;
          }

          relatedFilms.push({
            title: filmTitle,
            year: yearNum,
            slug: filmSlug,
            url: filmUrl,
            letterboxdRating: rating,
          });
        }
      });

      // Strategy 2: "Fans also like" section
      if (relatedFilms.length === 0) {
        $('section.fans-also-like li, .poster-list li, [data-component="film-poster"]').each((_i, el) => {
          const link = $(el).find('a[href*="/film/"]').first();
          const href = link.attr('href') || '';
          const filmSlug = href.replace(/^\/film\//, '').replace(/\/$/, '');
          const filmTitle = link.attr('title') || link.find('img').attr('alt') || '';
          const filmUrl = filmSlug ? `${BASE_URL}/film/${filmSlug}/` : '';

          if (filmTitle && filmSlug && !relatedFilms.some(f => f.slug === filmSlug)) {
            relatedFilms.push({
              title: filmTitle,
              year: null,
              slug: filmSlug,
              url: filmUrl,
              letterboxdRating: null,
            });
          }
        });
      }

      // Strategy 3: "Popular reviews" / "Similar films" panel
      if (relatedFilms.length === 0) {
        $('a[href*="/film/"]').each((_i, el) => {
          if (relatedFilms.length >= 10) return false; // Cap at 10

          const href = $(el).attr('href') || '';
          const filmSlug = href.replace(/^\/film\//, '').replace(/\/$/, '');
          const filmTitle = $(el).attr('title') || $(el).find('img').attr('alt') || '';

          // Skip non-movie links (lists, reviews, etc.)
          if (!filmSlug || !filmTitle) return;
          if (filmSlug.includes('/') || relatedFilms.some(f => f.slug === filmSlug)) return;
          if (filmSlug === slug) return; // Skip self

          relatedFilms.push({
            title: filmTitle,
            year: null,
            slug: filmSlug,
            url: `${BASE_URL}/film/${filmSlug}/`,
            letterboxdRating: null,
          });
        });
      }

      if (relatedFilms.length > 0) {
        const elapsed = Date.now() - startTime;
        reportSuccess(SCRAPER_NAME);
        recordScraperSuccess(SCRAPER_NAME, elapsed);

        const result: LetterboxdRelatedResult = {
          movieSlug: slug,
          url,
          relatedFilms,
          scrapedAt: new Date().toISOString(),
        };

        setCache(cacheKey, result);
        log(`Related films for "${movieTitle}" → ${relatedFilms.length} films (${elapsed}ms)`);
        return result;
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      reportFailure(SCRAPER_NAME);
      recordScraperFailure(SCRAPER_NAME, elapsed);
      warn(`Parse error for ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
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
