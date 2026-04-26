/**
 * MyDramaList Scraper (v2 — ScrapingBee Transport)
 *
 * Extracts K-drama data from MDL pages. Only used when K-drama niche is active.
 *
 * Changes from v1:
 *  - Replaced direct fetch() with scrapeAndParse() from ScrapingBee
 *  - Removed USER_AGENTS array and getNextUA() (ScrapingBee handles this)
 *  - Removed enforceDelay() and lastRequestAt (ScrapingBee handles rate limiting)
 *  - Added circuit breaker checks (canRequest, reportSuccess, reportFailure)
 *  - Added health monitor (recordScraperSuccess, recordScraperFailure)
 *  - Uses ScrapingBee options: { countryCode: 'kr' } for MDL pages
 */

import * as cheerio from 'cheerio';
import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MDLDramaData {
  slug: string;
  url: string;
  title: string;
  alternativeNames: string[];
  rating: number | null; // 0-10
  ratingCount: number | null;
  watchers: number | null;
  episodes: number | null;
  airDateStart: string | null;
  airDateEnd: string | null;
  dayAired: string | null;
  genres: string[];
  tags: string[];
  cast: Array<{ name: string; role: string; profileUrl: string }>;
  synopsis: string | null;
  relatedDramas: Array<{ title: string; slug: string; rating: number | null }>;
  country: string | null;
  scrapedAt: string;
}

export interface MDLSearchResult {
  slug: string;
  title: string;
  year: number | null;
  url: string;
  rating: number | null;
}

interface CacheEntry {
  data: MDLDramaData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'mydramalist';
const BASE_URL = 'https://mydramalist.com';
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/** ScrapingBee options for MDL pages — Korean proxy for K-drama content */
const SB_OPTIONS: ScrapingBeeOptions = { countryCode: 'kr' };

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): MDLDramaData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MDLDramaData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log('[MDL]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[MDL]', ...args);
}

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

function toInt(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Detail page scraper
// ---------------------------------------------------------------------------

/**
 * Extract the sidebar "details" list into key-value pairs.
 * MDL pages have a `<ul class="list m-b-0">` in the sidebar with
 * `<li>` items where the first child is a `<b>` label and the rest
 * is the value.
 */
function extractSidebarDetails(
  $: cheerio.CheerioAPI
): Map<string, cheerio.Cheerio<any>> {
  const map = new Map<string, cheerio.Cheerio<any>>();

  $('.block-aside ul.list li').each((_i, li) => {
    const $li = $(li);
    const labelEl = $li.find('b').first();
    const label = cleanText(labelEl.text()).replace(/:$/, '').toLowerCase();

    // The value is everything after the <b> tag
    // We clone the li, remove the <b>, and take remaining text/html
    const $value = $li.clone();
    $value.find('b').remove();
    // We store the cheerio object so callers can inspect links etc.
    map.set(label, $value.contents());
  });

  return map;
}

function extractDetailValue(
  details: Map<string, cheerio.Cheerio<any>>,
  key: string
): string | null {
  const els = details.get(key);
  if (!els) return null;
  const text = els.text();
  return text ? cleanText(text) : null;
}

/**
 * Extract genres / tags from the detail sidebar. These are presented as
 * comma-separated links.
 */
function extractListFromDetail(
  details: Map<string, cheerio.Cheerio<any>>,
  key: string
): string[] {
  const els = details.get(key);
  if (!els) return [];

  const fullText = els.text();
  if (fullText) {
    return fullText
      .split(',')
      .map((s) => cleanText(s))
      .filter(Boolean);
  }

  return [];
}

/**
 * Scrape a MyDramaList drama page given its slug (e.g. "6949-crash-landing-on-you").
 */
export async function getDramaDetails(
  dramaSlug: string
): Promise<MDLDramaData | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping details for "${dramaSlug}"`);
    return null;
  }

  const cacheKey = `drama:${dramaSlug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for ${dramaSlug}`);
    return cached;
  }

  const url = `${BASE_URL}/${dramaSlug}`;
  log(`Scraping ${url}`);

  const startTime = Date.now();
  const $ = await scrapeAndParse(url, SB_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Page scrape failed for ${dramaSlug} (${elapsed}ms)`);
    return null;
  }

  try {
    // ---- Title ----
    const title =
      cleanText($('h1.title-fw, h1.film-title, h1').first().text()) || dramaSlug;

    // ---- Alternative names ----
    const alternativeNames: string[] = [];
    $('.title-fw + .text-muted, .show-aliases, .alias').each((_i, el) => {
      const t = cleanText($(el).text());
      if (t) alternativeNames.push(t);
    });
    // Also try the sidebar "Also Known As"
    // (handled below via details map)

    // ---- Rating ----
    let rating: number | null = null;
    let ratingCount: number | null = null;

    const ratingEl = $(
      '.box-user-rating [data-title="score"], .score-card .score, .rating-box .score, [itemprop="ratingValue"]'
    ).first();
    if (ratingEl.length) {
      rating = toNumber(ratingEl.text());
    }

    const ratingCountEl = $(
      '.box-user-rating [data-title="users"], .score-card .rating-count, [itemprop="ratingCount"]'
    ).first();
    if (ratingCountEl.length) {
      ratingCount = toInt(ratingCountEl.text().replace(/\D/g, ''));
    }

    // ---- Sidebar details ----
    const details = extractSidebarDetails($);

    // Episodes
    const episodes = toInt(extractDetailValue(details, 'episodes'));

    // Air dates
    let airDateStart: string | null = null;
    let airDateEnd: string | null = null;
    const airDateRaw = extractDetailValue(details, 'aired') ??
      extractDetailValue(details, 'aired date') ??
      extractDetailValue(details, 'original run');
    if (airDateRaw) {
      // MDL format: "Dec 14, 2019 - Feb 16, 2020" or single date
      const parts = airDateRaw.split('-').map((s) => cleanText(s));
      airDateStart = parts[0] ?? null;
      airDateEnd = parts[1] ?? null;
    }

    // Day aired
    const dayAired =
      extractDetailValue(details, 'day aired') ??
      extractDetailValue(details, 'original network'); // sometimes day is embedded

    // Country
    const country = extractDetailValue(details, 'country') ??
      extractDetailValue(details, 'native country');

    // Genres
    const genres =
      extractDetailValue(details, 'genres')
        ?.split(',')
        .map((s) => cleanText(s))
        .filter(Boolean) ?? [];

    // Tags
    const tags =
      extractDetailValue(details, 'tags')
        ?.split(',')
        .map((s) => cleanText(s))
        .filter(Boolean) ?? [];

    // Also Known As
    const aka = extractDetailValue(details, 'also known as') ??
      extractDetailValue(details, 'alternative names');
    if (aka) {
      const akaList = aka.split(',').map((s) => cleanText(s)).filter(Boolean);
      for (const name of akaList) {
        if (!alternativeNames.includes(name)) {
          alternativeNames.push(name);
        }
      }
    }

    // Watchers
    const watchersRaw = extractDetailValue(details, 'watchers') ??
      extractDetailValue(details, 'total watchers') ??
      extractDetailValue(details, 'views');
    const watchers = watchersRaw ? toInt(watchersRaw.replace(/\D/g, '')) : null;

    // ---- Synopsis ----
    let synopsis: string | null = null;
    const synopsisEl = $('.show-synopsis, .film-synopsis, [itemprop=\'description\']').first();
    if (synopsisEl.length) {
      synopsis = cleanText(synopsisEl.text());
    }

    // ---- Cast ----
    const cast: Array<{ name: string; role: string; profileUrl: string }> = [];
    $('.box-cast .cast-item, .cast-list li, [itemprop=\'actor\']').each(
      (_i, el) => {
        const $el = $(el);
        const nameEl = $el.find('a').first();
        const name = cleanText(nameEl.text());
        const profileUrl = nameEl.attr('href')
          ? `${BASE_URL}${nameEl.attr('href')}`
          : '';

        // Role is usually in a secondary element
        const roleEl = $el.find('.cast-role, .role, .sub-text').first();
        const role = cleanText(roleEl.text()) || 'Unknown';

        if (name) {
          cast.push({ name, role, profileUrl });
        }
      }
    );

    // ---- Related dramas ----
    const relatedDramas: Array<{
      title: string;
      slug: string;
      rating: number | null;
    }> = [];

    $('.related-dramas .item, .box-recommendations .item').each((_i, el) => {
      const $el = $(el);
      const anchor = $el.find('a.title, a').first();
      const href = anchor.attr('href') ?? '';
      const slugMatch = href.match(/mydramalist\.com\/(\d+[^/?#]*)/);
      const slug = slugMatch ? slugMatch[1] : href.replace(/^\//, '');
      const relatedTitle = cleanText(anchor.text());
      const relatedRating = toNumber($el.find('.score, .rating').first().text());

      if (relatedTitle && slug) {
        relatedDramas.push({ title: relatedTitle, slug, rating: relatedRating });
      }
    });

    // ---- Build result ----
    const data: MDLDramaData = {
      slug: dramaSlug,
      url,
      title,
      alternativeNames,
      rating,
      ratingCount,
      watchers,
      episodes,
      airDateStart,
      airDateEnd,
      dayAired,
      genres,
      tags,
      cast,
      synopsis,
      relatedDramas,
      country,
      scrapedAt: new Date().toISOString(),
    };

    // Report success
    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    setCache(cacheKey, data);
    log(
      `Scraped ${dramaSlug} — rating:${rating ?? '?'} eps:${episodes ?? '?'} cast:${cast.length} related:${relatedDramas.length} (${elapsed}ms)`
    );

    return data;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(
      `Parse error for ${dramaSlug}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search MyDramaList for dramas matching a query.
 * Returns up to 20 results with slugs suitable for `getDramaDetails()`.
 */
export async function searchDrama(
  query: string
): Promise<MDLSearchResult[] | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping search for "${query}"`);
    return null;
  }

  const encoded = encodeURIComponent(query);
  const searchUrl = `${BASE_URL}/search?q=${encoded}`;

  log(`Searching "${query}" → ${searchUrl}`);

  const startTime = Date.now();
  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Search scrape failed for "${query}" (${elapsed}ms)`);
    return null;
  }

  try {
    const results: MDLSearchResult[] = [];

    // MDL search results are in `.search-result` rows
    $('.search-result, .content .row').each((_i, el) => {
      const $el = $(el);
      const anchor = $el.find('a.block, a.title, h2 a, h3 a').first();
      const href = anchor.attr('href') ?? '';
      const slugMatch = href.match(/mydramalist\.com\/(\d+[^/?#]*)/);
      const slug = slugMatch
        ? slugMatch[1]
        : href.replace(/^https?:\/\/mydramalist\.com\//, '').replace(/\/$/, '');

      if (!slug) return;

      const dramaTitle = cleanText(anchor.text());
      const yearText = $el.find('.text-muted, .year, .release-year').first().text();
      const year = toInt(yearText);
      const rating = toNumber($el.find('.score, .rating').first().text());

      if (dramaTitle) {
        results.push({
          slug,
          title: dramaTitle,
          year,
          url: `${BASE_URL}/${slug}`,
          rating,
        });
      }
    });

    // Report success
    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(`Search "${query}" → ${results.length} result(s) (${elapsed}ms)`);
    return results.length > 0 ? results : null;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Search parse error for "${query}":`, err instanceof Error ? err.message : err);
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
