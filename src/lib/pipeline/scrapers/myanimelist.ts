/**
 * MyAnimeList Scraper — Tier B
 *
 * Scrapes: MAL score, rank, popularity, members, studios, source, episodes, season
 * Method: Search + detail page scrape via ScrapingBee
 * Rate: Moderate protection (Cloudflare), uses premiumProxy
 */

import * as cheerio from 'cheerio';
import { scrapeAndParse, scrapeHtml, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MALAnimeData {
  malId: number;
  title: string;
  score: number | null;          // 0-10 weighted
  ranked: number | null;
  popularity: number | null;
  members: number | null;
  episodes: number | null;
  status: string | null;
  studios: string[];
  source: string | null;
  season: string | null;         // e.g. "Fall 2023"
  genres: string[];
  rating: string | null;         // e.g. "PG-13"
  synopsis: string | null;
}

interface CacheEntry {
  data: MALAnimeData;
  expiresAt: number;
}

export interface MALSearchResult {
  title: string;
  url: string;
  malId: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'myanimelist';
const BASE_URL = 'https://myanimelist.net';
const SEARCH_URL = 'https://myanimelist.net/anime.php';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const SCRAPE_OPTIONS: ScrapingBeeOptions = {
  premiumProxy: true,
  renderJs: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): MALAnimeData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MALAnimeData): void {
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
// Search — find MAL anime ID from search results
// ---------------------------------------------------------------------------

/**
 * Search MyAnimeList for anime by title.
 * Returns an array of search results with title, URL, and MAL ID.
 */
export async function searchAnime(title: string): Promise<MALSearchResult[]> {
  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping search for "${title}"`);
    return [];
  }

  const query = encodeURIComponent(title);
  const searchUrl = `${SEARCH_URL}?q=${query}`;

  log(`Searching "${title}" → ${searchUrl}`);

  const html = await scrapeHtml(searchUrl, SCRAPE_OPTIONS);
  if (!html) {
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    return [];
  }

  try {
    const results: MALSearchResult[] = [];

    // Parse the search results page with cheerio
    const $ = cheerio.load(html);

    // MAL search results are in table rows with class listing or .js-anime-category-table
    // Try multiple selectors for robustness
    const selectors = [
      '.js-anime-category-table tr',
      '#content table tr',
      '.anime-list tr',
      '.listing tr',
    ];

    for (const selector of selectors) {
      $(selector).each((_i, el) => {
        const $row = $(el);
        const anchor = $row.find('a[href*="/anime/"]').first();
        const href = anchor.attr('href') ?? '';
        const idMatch = href.match(/\/anime\/(\d+)/);

        if (idMatch) {
          const malId = parseInt(idMatch[1], 10);
          const itemTitle = cleanText(anchor.text());

          if (malId && itemTitle) {
            results.push({
              title: itemTitle,
              url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
              malId,
            });
          }
        }
      });

      if (results.length > 0) break;
    }

    // Fallback: Regex-based extraction from raw HTML
    if (results.length === 0) {
      const animeMatches = html.matchAll(/\/anime\/(\d+)\/[^"'\s]*/g);
      const seen = new Set<number>();
      for (const match of animeMatches) {
        const malId = parseInt(match[1], 10);
        if (seen.has(malId)) continue;
        seen.add(malId);

        // Try to extract the title from the surrounding context
        const url = match[0];
        const titleFromUrl = url
          .split('/')
          .pop()
          ?.replace(/_/g, ' ')
          .replace(/-/g, ' ') ?? '';

        results.push({
          title: titleFromUrl,
          url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
          malId,
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
 * Scrape the MAL anime detail page for full data.
 */
export async function getAnimeDetails(malId: number): Promise<MALAnimeData | null> {
  // 1. Check circuit breaker
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker open — skipping details for MAL ${malId}`);
    return null;
  }

  // 2. Check cache
  const cacheKey = `mal:${malId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for MAL ${malId}`);
    return cached;
  }

  const detailUrl = `${BASE_URL}/anime/${malId}`;
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
    const titleEl = $('h1.title-name, h1.h1, .h1 span, [itemprop="name"]').first();
    if (titleEl.length) {
      title = cleanText(titleEl.text());
    }
    // Fallback to og:title
    if (!title) {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) title = cleanText(ogTitle);
    }

    // ---- Score ----
    let score: number | null = null;
    const scoreEl = $('.score-label, span[itemprop="ratingValue"], .fl-r.score').first();
    if (scoreEl.length) {
      score = toNumber(cleanText(scoreEl.text()));
    }
    // Fallback: look in the sidebar
    if (score === null) {
      const scoreText = $('span:contains("Score")').next('.score-label, span').first().text();
      if (scoreText) score = toNumber(cleanText(scoreText));
    }

    // ---- Ranked ----
    let ranked: number | null = null;
    const rankText = $('span:contains("Ranked")').parent().text();
    const rankMatch = rankText.match(/Ranked\s*#\s*(\d+)/);
    if (rankMatch) {
      ranked = toInt(rankMatch[1]);
    }
    // Alternative selector
    if (ranked === null) {
      const rankedEl = $('strong:contains("Ranked")').parent().text();
      const altMatch = rankedEl.match(/#\s*(\d+)/);
      if (altMatch) ranked = toInt(altMatch[1]);
    }

    // ---- Popularity ----
    let popularity: number | null = null;
    const popText = $('span:contains("Popularity")').parent().text();
    const popMatch = popText.match(/Popularity\s*#\s*(\d+)/);
    if (popMatch) {
      popularity = toInt(popMatch[1]);
    }

    // ---- Members ----
    let members: number | null = null;
    const memberText = $('span:contains("Members")').parent().text();
    const memberMatch = memberText.match(/Members\s*([\d,]+)/);
    if (memberMatch) {
      members = toInt(memberMatch[1].replace(/,/g, ''));
    }

    // ---- Episodes ----
    let episodes: number | null = null;
    const epEl = $('span:contains("Episodes:")').next('span, a').first();
    if (epEl.length) {
      episodes = toInt(cleanText(epEl.text()));
    }
    // Alternative: look in the info section
    if (episodes === null) {
      const infoText = $('#content .spaceit_pad, .js-statistics-info').text();
      const epMatch = infoText.match(/Episodes:\s*(\d+)/);
      if (epMatch) episodes = toInt(epMatch[1]);
    }

    // ---- Status ----
    let status: string | null = null;
    const statusEl = $('span:contains("Status:")').next('span').first();
    if (statusEl.length) {
      status = cleanText(statusEl.text());
    }

    // ---- Studios ----
    const studios: string[] = [];
    $('span:contains("Studios:")').next('a').each((_i, el) => {
      const studio = cleanText($(el).text());
      if (studio) studios.push(studio);
    });
    // Also try producer links
    if (studios.length === 0) {
      $('span:contains("Producers:")').next('a').each((_i, el) => {
        const studio = cleanText($(el).text());
        if (studio) studios.push(studio);
      });
    }

    // ---- Source ----
    let source: string | null = null;
    const sourceEl = $('span:contains("Source:")').next('span').first();
    if (sourceEl.length) {
      source = cleanText(sourceEl.text());
    }

    // ---- Season ----
    let season: string | null = null;
    const seasonEl = $('span:contains("Premiered:")').next('a').first();
    if (seasonEl.length) {
      season = cleanText(seasonEl.text()); // e.g. "Fall 2023"
    }

    // ---- Genres ----
    const genres: string[] = [];
    $('span:contains("Genres:")').nextAll('a, span a').each((_i, el) => {
      const genre = cleanText($(el).text());
      if (genre && !genres.includes(genre)) genres.push(genre);
    });
    // Also try [itemprop="genre"]
    if (genres.length === 0) {
      $('[itemprop="genre"] a, .genre a').each((_i, el) => {
        const genre = cleanText($(el).text());
        if (genre && !genres.includes(genre)) genres.push(genre);
      });
    }

    // ---- Rating ----
    let rating: string | null = null;
    const ratingEl = $('span:contains("Rating:")').next('span').first();
    if (ratingEl.length) {
      rating = cleanText(ratingEl.text());
    }

    // ---- Synopsis ----
    let synopsis: string | null = null;
    const synopsisEl = $('[itemprop="description"], .js synopsis, #content .spaceit_p').first();
    if (synopsisEl.length) {
      synopsis = cleanText(synopsisEl.text());
    }
    // Fallback to meta description
    if (!synopsis) {
      const metaDesc = $('meta[property="og:description"], meta[name="description"]').attr('content');
      if (metaDesc) synopsis = cleanText(metaDesc);
    }

    const data: MALAnimeData = {
      malId,
      title,
      score,
      ranked,
      popularity,
      members,
      episodes,
      status,
      studios,
      source,
      season,
      genres,
      rating,
      synopsis,
    };

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(
      `Scraped MAL ${malId} — score:${score} ranked:#${ranked} members:${members} (${elapsed}ms)`,
    );

    // Cache and return
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Parse error for MAL ${malId}:`, err instanceof Error ? err.message : err);
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
