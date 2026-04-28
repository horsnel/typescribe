/**
 * Box Office Mojo Scraper
 * Extracts box office performance data from IMDb-owned Box Office Mojo.
 * Tier C scraper — uses ScrapingBee with premium proxies due to IMDb anti-bot.
 */

import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoxOfficeData {
  domesticBoxOffice: number;
  internationalBoxOffice: number;
  worldwideBoxOffice: number;
  openingWeekendDomestic: number;
  domesticRank: number;
  year: number;
  url: string;
}

interface CacheEntry {
  data: BoxOfficeData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'boxofficemojo';
const BASE_URL = 'https://www.boxofficemojo.com';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  premiumProxy: true,
  renderJs: true,
  countryCode: 'us',
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): BoxOfficeData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: BoxOfficeData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parse a dollar string like "$1,234,567" or "$1.2M" into a number.
 * Removes $, commas, and handles abbreviations (M = million, K = thousand).
 */
function parseDollars(raw: string): number {
  let cleaned = raw.replace(/\$/g, '').replace(/,/g, '').trim();

  const millionMatch = cleaned.match(/^([\d.]+)M$/i);
  if (millionMatch) {
    return Math.round(parseFloat(millionMatch[1]) * 1_000_000);
  }

  const thousandMatch = cleaned.match(/^([\d.]+)K$/i);
  if (thousandMatch) {
    return Math.round(parseFloat(thousandMatch[1]) * 1_000);
  }

  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
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
// Search — find movie slug/ID from search results
// ---------------------------------------------------------------------------

interface SearchResult {
  slug: string;
  title: string;
  year: number | null;
  url: string;
}

async function searchMovie(
  title: string,
  year?: number,
): Promise<SearchResult[] | null> {
  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/search/?q=${query}`;

  log(`Searching "${title}" → ${searchUrl}`);

  const $ = await scrapeAndParse(searchUrl, SCRAPE_OPTIONS);
  if (!$) return null;

  try {
    const results: SearchResult[] = [];

    // BOM search results are in table rows or divs with links to /release/ or /title/
    $('table a[href*="/release/"], table a[href*="/title/"], .a-section a[href*="/release/"], .a-section a[href*="/title/"]').each((_i, el) => {
      const $el = $(el);
      const href = $el.attr('href') ?? '';
      const movieTitle = cleanText($el.text());

      // Extract slug from href
      const releaseMatch = href.match(/\/release\/([^/?#]+)/);
      const titleMatch = href.match(/\/title\/(tt\d+)/);

      const slug = releaseMatch ? releaseMatch[1] : titleMatch ? titleMatch[1] : null;
      if (!slug || !movieTitle) return;

      // Try to get year from nearby text
      const row = $el.closest('tr');
      const rowText = row.length ? row.text() : $el.parent().text();
      const yearMatch = rowText.match(/\b(19|20)\d{2}\b/);
      const resultYear = yearMatch ? parseInt(yearMatch[0], 10) : null;

      const movieUrl = releaseMatch
        ? `${BASE_URL}/release/${slug}/`
        : `${BASE_URL}/title/${slug}/`;

      results.push({
        slug,
        title: movieTitle,
        year: resultYear,
        url: movieUrl,
      });
    });

    // Fallback: parse search result items from div-based layout
    if (results.length === 0) {
      $('.a-fixed-left-grid-inner a[href*="/release/"], .a-fixed-left-grid-inner a[href*="/title/"]').each((_i, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';
        const movieTitle = cleanText($el.text());

        const releaseMatch = href.match(/\/release\/([^/?#]+)/);
        const titleMatch = href.match(/\/title\/(tt\d+)/);

        const slug = releaseMatch ? releaseMatch[1] : titleMatch ? titleMatch[1] : null;
        if (!slug || !movieTitle) return;

        const movieUrl = releaseMatch
          ? `${BASE_URL}/release/${slug}/`
          : `${BASE_URL}/title/${slug}/`;

        results.push({
          slug,
          title: movieTitle,
          year: null,
          url: movieUrl,
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

async function scrapeDetailPage(url: string): Promise<BoxOfficeData | null> {
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
    let domesticBoxOffice = 0;
    let internationalBoxOffice = 0;
    let worldwideBoxOffice = 0;
    let openingWeekendDomestic = 0;
    let domesticRank = 0;
    let movieYear = 0;

    // Strategy 1: Parse from .mojo-table sections
    // BOM uses spans with specific data attributes and class names
    // The performance summary table has rows for domestic, international, worldwide

    // Try parsing the performance sections
    // BOM typically has sections like "Domestic", "International", "Worldwide"
    // with money values in span elements

    const sections = $('.a-section, .mojo-performance-summary-table');
    sections.each((_i, section) => {
      const $section = $(section);
      const sectionText = cleanText($section.text());

      if (sectionText.includes('Domestic')) {
        const dollarMatch = sectionText.match(/Domestic[^$]*\$[\d,.]+/);
        if (dollarMatch) {
          const val = parseDollars(dollarMatch[0].replace(/^.*\$/, '$'));
          if (val > 0) domesticBoxOffice = val;
        }
      }

      if (sectionText.includes('International')) {
        const dollarMatch = sectionText.match(/International[^$]*\$[\d,.]+/);
        if (dollarMatch) {
          const val = parseDollars(dollarMatch[0].replace(/^.*\$/, '$'));
          if (val > 0) internationalBoxOffice = val;
        }
      }

      if (sectionText.includes('Worldwide')) {
        const dollarMatch = sectionText.match(/Worldwide[^$]*\$[\d,.]+/);
        if (dollarMatch) {
          const val = parseDollars(dollarMatch[0].replace(/^.*\$/, '$'));
          if (val > 0) worldwideBoxOffice = val;
        }
      }
    });

    // Strategy 2: Parse from span elements with money values
    // BOM puts values in spans like <span class="money">$123,456,789</span>
    $('span.money, .mojo-field-type-money').each((_i, el) => {
      const text = cleanText($(el).text());
      if (!text.includes('$')) return;
      const value = parseDollars(text);
      if (value === 0) return;

      // Look at nearby label text to categorize
      const parent = $(el).parent();
      const parentText = cleanText(parent.text());
      const row = $(el).closest('tr, div');
      const rowText = cleanText(row.text());

      if (rowText.includes('Domestic') && !rowText.includes('International') && !rowText.includes('Opening')) {
        if (domesticBoxOffice === 0) domesticBoxOffice = value;
      } else if (rowText.includes('International')) {
        if (internationalBoxOffice === 0) internationalBoxOffice = value;
      } else if (rowText.includes('Worldwide')) {
        if (worldwideBoxOffice === 0) worldwideBoxOffice = value;
      } else if (rowText.includes('Opening Weekend') || rowText.includes('Opening')) {
        if (openingWeekendDomestic === 0) openingWeekendDomestic = value;
      }
    });

    // Strategy 3: Parse the summary table rows
    $('.mojo-table tbody tr, table.a-bordered tbody tr').each((_i, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      const rowText = cleanText($row.text());

      if (rowText.includes('Domestic') && !rowText.includes('International')) {
        cells.each((_j, cell) => {
          const cellText = cleanText($(cell).text());
          if (cellText.includes('$')) {
            const val = parseDollars(cellText);
            if (val > 0 && domesticBoxOffice === 0) domesticBoxOffice = val;
          }
        });
      }

      if (rowText.includes('International')) {
        cells.each((_j, cell) => {
          const cellText = cleanText($(cell).text());
          if (cellText.includes('$')) {
            const val = parseDollars(cellText);
            if (val > 0 && internationalBoxOffice === 0) internationalBoxOffice = val;
          }
        });
      }

      if (rowText.includes('Worldwide')) {
        cells.each((_j, cell) => {
          const cellText = cleanText($(cell).text());
          if (cellText.includes('$')) {
            const val = parseDollars(cellText);
            if (val > 0 && worldwideBoxOffice === 0) worldwideBoxOffice = val;
          }
        });
      }
    });

    // Opening Weekend — look for specific patterns
    $('div:contains("Opening Weekend"), span:contains("Opening Weekend"), th:contains("Opening")').each((_i, el) => {
      const $el = $(el);
      const container = $el.closest('tr, div, section');
      const containerText = cleanText(container.text());
      const dollarMatch = containerText.match(/\$[\d,.]+/);
      if (dollarMatch && openingWeekendDomestic === 0) {
        openingWeekendDomestic = parseDollars(dollarMatch[0]);
      }
    });

    // Also check for "Opening" header in the summary table
    if (openingWeekendDomestic === 0) {
      $('td:contains("Opening")').each((_i, el) => {
        const row = $(el).closest('tr');
        const moneyCell = row.find('span.money, .mojo-field-type-money, td').last();
        const moneyText = cleanText(moneyCell.text());
        const dollarMatch = moneyText.match(/\$[\d,.]+/);
        if (dollarMatch && openingWeekendDomestic === 0) {
          openingWeekendDomestic = parseDollars(dollarMatch[0]);
        }
      });
    }

    // Domestic Rank
    const rankText = cleanText($('.a-section, .mojo-summary-values').text());
    const rankMatch = rankText.match(/Rank\s*#?(\d+)/i);
    if (rankMatch) {
      domesticRank = parseInt(rankMatch[1], 10);
    }
    // Also check for rank in specific elements
    $('span:contains("#"), .mojo-rank').each((_i, el) => {
      const text = cleanText($(el).text());
      const rMatch = text.match(/#?(\d+)/);
      if (rMatch && domesticRank === 0) {
        domesticRank = parseInt(rMatch[1], 10);
      }
    });

    // Year — try to extract from the page title or summary
    const titleText = cleanText($('h1').first().text());
    const yearMatch = titleText.match(/\((\d{4})\)/);
    if (yearMatch) {
      movieYear = parseInt(yearMatch[1], 10);
    }
    // Also try from the summary section
    if (movieYear === 0) {
      const pageYearMatch = cleanText($('.a-section, .mojo-summary-values').text()).match(/\b(19|20)\d{2}\b/);
      if (pageYearMatch) {
        movieYear = parseInt(pageYearMatch[0], 10);
      }
    }

    // Compute worldwide from domestic + international if missing
    if (worldwideBoxOffice === 0 && (domesticBoxOffice > 0 || internationalBoxOffice > 0)) {
      worldwideBoxOffice = domesticBoxOffice + internationalBoxOffice;
    }

    const data: BoxOfficeData = {
      domesticBoxOffice,
      internationalBoxOffice,
      worldwideBoxOffice,
      openingWeekendDomestic,
      domesticRank,
      year: movieYear,
      url,
    };

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(
      `Scraped ${url} — domestic:$${domesticBoxOffice.toLocaleString()} international:$${internationalBoxOffice.toLocaleString()} worldwide:$${worldwideBoxOffice.toLocaleString()} (${elapsed}ms)`,
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
 * Search Box Office Mojo for a movie by title and scrape its box office data.
 * Optionally filter by year for disambiguation.
 */
export async function searchAndScrape(
  title: string,
  year?: number,
): Promise<BoxOfficeData | null> {
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
    warn(`No BOM results for "${title}"`);
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

/**
 * Get box office data by IMDb ID (BOM URLs use IMDb IDs like "tt1234567").
 */
export async function getByImdbId(
  imdbId: string,
): Promise<BoxOfficeData | null> {
  // Normalize IMDb ID
  const normalizedId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;

  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping request for IMDb ${normalizedId}`);
    return null;
  }

  // 2. Check cache
  const cacheKey = `imdb:${normalizedId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for IMDb ${normalizedId}`);
    return cached;
  }

  // 3. Scrape the title page directly (BOM supports /title/ttXXXXXX/)
  const url = `${BASE_URL}/title/${normalizedId}/`;
  const data = await scrapeDetailPage(url);
  if (!data) return null;

  // 4. Cache and return
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
