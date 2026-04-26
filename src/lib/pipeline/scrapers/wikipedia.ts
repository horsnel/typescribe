/**
 * Wikipedia Scraper
 * Extracts plot summaries and page info from Wikipedia using the MediaWiki API.
 * No ScrapingBee needed — Wikipedia has a proper public API with no bot protection.
 */

import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WikiExtractData {
  extract: string;
  url: string;
  pageId: number;
}

interface CacheEntry {
  data: WikiExtractData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'https://en.wikipedia.org/w/api.php';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — plot rarely changes

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): WikiExtractData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: WikiExtractData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  console.log('[Wikipedia]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Wikipedia]', ...args);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// MediaWiki API helpers
// ---------------------------------------------------------------------------

interface MediaWikiSearchResult {
  ns: number;
  title: string;
  pageid: number;
  snippet: string;
}

interface MediaWikiSearchResponse {
  query?: {
    search?: MediaWikiSearchResult[];
  };
  error?: {
    code: string;
    info: string;
  };
}

interface MediaWikiExtractPage {
  pageid: number;
  ns: number;
  title: string;
  extract?: string;
  fullurl?: string;
}

interface MediaWikiExtractResponse {
  query?: {
    pages?: Record<string, MediaWikiExtractPage>;
  };
  error?: {
    code: string;
    info: string;
  };
}

/**
 * Search Wikipedia for the best matching article for a film title.
 * Appends "(film)" disambiguator for better results.
 */
async function searchForFilmPage(
  title: string,
  year?: number,
): Promise<{ title: string; pageId: number } | null> {
  const query = year ? `${title} (${year} film)` : `${title} (film)`;
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
    srlimit: '5',
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TypeScribeBot/1.0 (typescribe-movie-aggregator)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      warn(`Search API HTTP ${res.status} for "${query}"`);
      return null;
    }

    const data: MediaWikiSearchResponse = await res.json();

    if (data.error) {
      warn(`Search API error: ${data.error.code} — ${data.error.info}`);
      return null;
    }

    const results = data.query?.search ?? [];
    if (results.length === 0) {
      // Try without "(film)" qualifier
      if (year) {
        return searchForFilmPage(title);
      }
      warn(`No search results for "${query}"`);
      return null;
    }

    // Prefer results that have "film" in the title
    const filmResult = results.find(
      (r) => r.title.toLowerCase().includes('film') || r.title.toLowerCase().includes(title.toLowerCase()),
    );

    const best = filmResult ?? results[0];
    log(`Search "${query}" → found "${best.title}" (pageId: ${best.pageid})`);
    return { title: best.title, pageId: best.pageid };
  } catch (err) {
    warn(`Search fetch error for "${query}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fetch the full extract and URL for a Wikipedia page by its exact title.
 */
async function fetchExtract(
  pageTitle: string,
): Promise<{ extract: string; url: string; pageId: number } | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    inprop: 'url',
    titles: pageTitle,
    format: 'json',
    exintro: '0',
    explaintext: '1',
  });

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TypeScribeBot/1.0 (typescribe-movie-aggregator)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      warn(`Extract API HTTP ${res.status} for "${pageTitle}"`);
      return null;
    }

    const data: MediaWikiExtractResponse = await res.json();

    if (data.error) {
      warn(`Extract API error: ${data.error.code} — ${data.error.info}`);
      return null;
    }

    const pages = data.query?.pages ?? {};
    const pageIds = Object.keys(pages);

    if (pageIds.length === 0 || pageIds[0] === '-1') {
      warn(`No page found for "${pageTitle}"`);
      return null;
    }

    const page = pages[pageIds[0]];
    const extract = page.extract?.trim() ?? '';
    const url = page.fullurl ?? '';
    const pageId = page.pageid;

    if (!extract) {
      warn(`Empty extract for "${pageTitle}"`);
      return null;
    }

    return { extract, url, pageId };
  } catch (err) {
    warn(`Extract fetch error for "${pageTitle}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Get the Wikipedia extract (plot summary) for a movie title.
 *
 * 1. Check circuit breaker
 * 2. Check cache
 * 3. Search for the right Wikipedia page
 * 4. Fetch the extract
 * 5. Cache and return
 */
export async function getWikiExtract(
  title: string,
  year?: number,
): Promise<WikiExtractData | null> {
  // Circuit breaker check
  if (!canRequest('wikipedia')) {
    warn('Circuit breaker is OPEN — skipping request');
    return null;
  }

  // Cache check
  const cacheKey = `extract:${title}:${year ?? 'any'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for "${title}"`);
    return cached;
  }

  const startTime = Date.now();
  log(`Fetching extract for "${title}"${year ? ` (${year})` : ''}`);

  try {
    // Step 1: Search for the right page
    const searchResult = await searchForFilmPage(title, year);
    if (!searchResult) {
      reportFailure('wikipedia');
      recordScraperFailure('wikipedia');
      return null;
    }

    // Step 2: Fetch the extract
    const extractData = await fetchExtract(searchResult.title);
    if (!extractData) {
      reportFailure('wikipedia');
      recordScraperFailure('wikipedia');
      return null;
    }

    const responseTimeMs = Date.now() - startTime;

    const data: WikiExtractData = {
      extract: cleanText(extractData.extract),
      url: extractData.url,
      pageId: extractData.pageId,
    };

    // Cache, report success
    setCache(cacheKey, data);
    reportSuccess('wikipedia');
    recordScraperSuccess('wikipedia', responseTimeMs);

    log(
      `Extracted "${title}" — ${data.extract.length} chars, pageId:${data.pageId} (${responseTimeMs}ms)`,
    );

    return data;
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    warn(
      `Error fetching extract for "${title}":`,
      err instanceof Error ? err.message : err,
    );
    reportFailure('wikipedia');
    recordScraperFailure('wikipedia');
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
