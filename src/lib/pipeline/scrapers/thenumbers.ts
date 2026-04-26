/**
 * The Numbers Scraper
 * Extracts box office data, budgets, and financials from The-Numbers.com.
 * Uses variable cache TTL: 24h for active releases, 30 days for catalog.
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TheNumbersData {
  budget: number | null;                    // Production budget in USD
  domesticBoxOffice: number | null;         // Domestic gross
  internationalBoxOffice: number | null;    // International gross
  worldwideBoxOffice: number | null;        // Worldwide gross
  openingWeekend: number | null;            // Opening weekend domestic
  url: string;
  scrapedAt: string;
}

interface CacheEntry {
  data: TheNumbersData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'thenumbers';
const BASE_URL = 'https://www.the-numbers.com';
const CACHE_TTL_ACTIVE_MS = 24 * 60 * 60 * 1000;    // 24 hours
const CACHE_TTL_CATALOG_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const SB_OPTIONS: ScrapingBeeOptions = {}; // No special options needed

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): TheNumbersData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: TheNumbersData, ttlMs?: number): void {
  cache.set(key, { data, expiresAt: Date.now() + (ttlMs ?? CACHE_TTL_CATALOG_MS) });
}

/**
 * Determine if a movie is an "active release" (currently in theaters)
 * based on the scraped data. Active releases get shorter cache TTL.
 */
function isActiveRelease(data: TheNumbersData): boolean {
  // If domestic box office is very recent / still growing, it's likely active
  // We use a simple heuristic: if worldwide is under a threshold relative to
  // budget or if budget is recent. For simplicity, we check if opening weekend
  // data suggests the movie is still in its initial run.
  if (data.domesticBoxOffice !== null && data.openingWeekend !== null) {
    // If domestic is less than 3x opening weekend, movie may still be in theaters
    if (data.domesticBoxOffice < data.openingWeekend * 4) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isNaN(n) ? null : n;
}

/**
 * Parse a dollar value string like "$123,456,789" into a number.
 */
function parseDollarValue(text: string): number | null {
  const cleaned = text.replace(/[$,]/g, '').trim();
  return toNumber(cleaned);
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log('[TheNumbers]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[TheNumbers]', ...args);
}

/**
 * Convert a movie title to a The Numbers style slug.
 * The Numbers URLs use title case with hyphens, e.g. "The-Dark-Knight".
 * However, their actual slug format varies; search is more reliable.
 */
function titleToSlug(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Budget page scraper
// ---------------------------------------------------------------------------

async function scrapeBudgetPage(
  slug: string
): Promise<Pick<TheNumbersData, 'budget'>> {
  const url = `${BASE_URL}/movie/budget/${slug}`;
  log(`Scraping budget page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return { budget: null };

  let budget: number | null = null;

  // Budget is usually in the main summary table
  $('#movie_finances .table, .summary_table').each((_i, table) => {
    if (budget !== null) return;
    $(table).find('tr').each((_j, row) => {
      if (budget !== null) return;
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const label = cleanText($(cells[0]).text()).toLowerCase();
        if (label.includes('production budget') || label.includes('budget')) {
          const value = cleanText($(cells[1]).text());
          budget = parseDollarValue(value);
        }
      }
    });
  });

  // Fallback: look for budget in any table row
  if (budget === null) {
    $('table tr').each((_i, row) => {
      if (budget !== null) return;
      const text = cleanText($(row).text()).toLowerCase();
      if (text.includes('production budget')) {
        const valueText = $(row).find('td').last().text();
        budget = parseDollarValue(valueText);
      }
    });
  }

  return { budget };
}

// ---------------------------------------------------------------------------
// Movie detail page scraper
// ---------------------------------------------------------------------------

async function scrapeMoviePage(
  slug: string
): Promise<TheNumbersData | null> {
  const url = `${BASE_URL}/movie/${slug}`;
  log(`Scraping movie page: ${url}`);

  const $ = await scrapeAndParse(url, SB_OPTIONS);
  if (!$) return null;

  let domesticBoxOffice: number | null = null;
  let internationalBoxOffice: number | null = null;
  let worldwideBoxOffice: number | null = null;
  let openingWeekend: number | null = null;

  // Parse from summary tables
  $('#movie_finances .table, .summary_table, table').each((_i, table) => {
    $(table).find('tr').each((_j, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const label = cleanText($(cells[0]).text()).toLowerCase();
      const valueText = cleanText($(cells[1]).text());

      if (label.includes('domestic') && label.includes('box office') && domesticBoxOffice === null) {
        domesticBoxOffice = parseDollarValue(valueText);
      } else if (label.includes('international') && internationalBoxOffice === null) {
        internationalBoxOffice = parseDollarValue(valueText);
      } else if (label.includes('worldwide') && worldwideBoxOffice === null) {
        worldwideBoxOffice = parseDollarValue(valueText);
      } else if (label.includes('opening weekend') && openingWeekend === null) {
        openingWeekend = parseDollarValue(valueText);
      }
    });
  });

  // Fallback: try row-by-row scanning for common labels
  if (domesticBoxOffice === null || worldwideBoxOffice === null) {
    $('table tr').each((_i, row) => {
      const text = cleanText($(row).text()).toLowerCase();
      const cells = $(row).find('td');

      if (cells.length >= 2) {
        const label = cleanText($(cells[0]).text()).toLowerCase();
        const valueText = cleanText($(cells[1]).text());

        if ((label.includes('domestic') || text.includes('domestic')) && domesticBoxOffice === null) {
          domesticBoxOffice = parseDollarValue(valueText);
        }
        if ((label.includes('international') || text.includes('international')) && internationalBoxOffice === null) {
          internationalBoxOffice = parseDollarValue(valueText);
        }
        if ((label.includes('worldwide') || text.includes('worldwide')) && worldwideBoxOffice === null) {
          worldwideBoxOffice = parseDollarValue(valueText);
        }
        if ((label.includes('opening') && label.includes('weekend')) && openingWeekend === null) {
          openingWeekend = parseDollarValue(valueText);
        }
      }
    });
  }

  // Also try the movie's main summary section
  if (worldwideBoxOffice === null) {
    const summaryEl = $('.summary, .movie-summary');
    if (summaryEl.length) {
      const summaryText = summaryEl.text();
      const wwMatch = summaryText.match(/Worldwide.*?\$([0-9,]+)/i);
      if (wwMatch) {
        worldwideBoxOffice = parseDollarValue(wwMatch[1]);
      }
    }
  }

  // Try to get budget from the same page
  let budget: number | null = null;
  $('table tr').each((_i, row) => {
    if (budget !== null) return;
    const text = cleanText($(row).text()).toLowerCase();
    if (text.includes('production budget') || text.includes('budget')) {
      const valueText = $(row).find('td').last().text();
      budget = parseDollarValue(valueText);
    }
  });

  // If budget not found on movie page, try budget page
  if (budget === null) {
    const budgetData = await scrapeBudgetPage(slug);
    budget = budgetData.budget;
  }

  return {
    budget,
    domesticBoxOffice,
    internationalBoxOffice,
    worldwideBoxOffice,
    openingWeekend,
    url,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

async function searchTheNumbers(
  title: string,
  year?: number
): Promise<string | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/search?searchterm=${query}`;
  log(`Searching: ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS);
  if (!$) return null;

  // The Numbers search results are in a table
  let bestSlug: string | null = null;
  let bestScore = -1;

  $('table tr, #search_result, .search-result').each((_i, row) => {
    const $row = $(row);
    const anchor = $row.find('a[href*="/movie/"]').first();
    if (!anchor.length) return;

    const href = anchor.attr('href') ?? '';
    const slugMatch = href.match(/\/movie\/([^/?#]+)/);
    if (!slugMatch) return;

    const slug = slugMatch[1];
    const resultTitle = cleanText(anchor.text()).toLowerCase();
    const titleLower = title.toLowerCase();

    // Simple scoring: exact match = 100, starts with = 80, contains = 60
    let score = 0;
    if (resultTitle === titleLower) {
      score = 100;
    } else if (resultTitle.startsWith(titleLower)) {
      score = 80;
    } else if (resultTitle.includes(titleLower) || titleLower.includes(resultTitle)) {
      score = 60;
    } else {
      // Partial word match
      const titleWords = titleLower.split(/\s+/);
      const matchedWords = titleWords.filter((w) => resultTitle.includes(w));
      score = matchedWords.length / titleWords.length * 40;
    }

    // Year matching bonus
    if (year) {
      const yearText = $row.text();
      const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch && parseInt(yearMatch[0]) === year) {
        score += 20;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  });

  return bestSlug;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search and scrape The Numbers data for a movie.
 *
 * Strategy:
 *  1. Check circuit breaker
 *  2. Check cache
 *  3. Try slug-based URL first
 *  4. Fall back to search if slug doesn't resolve
 *  5. Cache with variable TTL (24h for active, 30d for catalog)
 *  6. Return
 */
export async function searchAndScrape(
  title: string,
  year?: number
): Promise<TheNumbersData | null> {
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

  // 3. Derive slug and try direct URL
  let slug = titleToSlug(title);
  let data = await scrapeMoviePage(slug);

  // 4. If slug-based approach fails, try searching
  if (!data || (data.domesticBoxOffice === null && data.worldwideBoxOffice === null && data.budget === null)) {
    log(`Slug "${slug}" not found, searching for "${title}"`);
    const foundSlug = await searchTheNumbers(title, year);
    if (foundSlug && foundSlug !== slug) {
      slug = foundSlug;
      data = await scrapeMoviePage(slug);
    }
  }

  // 5. Validate we got something meaningful
  if (!data || (data.budget === null && data.domesticBoxOffice === null && data.worldwideBoxOffice === null)) {
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

  // Variable cache TTL
  const ttl = isActiveRelease(data) ? CACHE_TTL_ACTIVE_MS : CACHE_TTL_CATALOG_MS;
  setCache(cacheKey, data, ttl);

  log(
    `Scraped "${title}" — budget:$${data.budget ?? '?'} domestic:$${data.domesticBoxOffice ?? '?'} worldwide:$${data.worldwideBoxOffice ?? '?'} (${elapsed}ms, TTL:${ttl === CACHE_TTL_ACTIVE_MS ? '24h' : '30d'})`
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
