/**
 * Rotten Tomatoes Scraper (v2 — ScrapingBee Transport)
 *
 * Extracts critic consensus, Tomatometer, and audience scores from RT pages.
 * Uses JSON-LD structured data with meta-tag fallback.
 *
 * Changes from v1:
 *  - Replaced direct fetch() with scrapeAndParse() from ScrapingBee
 *  - Removed USER_AGENTS array and getNextUA() (ScrapingBee handles this)
 *  - Removed enforceDelay() and lastRequestAt (ScrapingBee handles rate limiting)
 *  - Added circuit breaker checks (canRequest, reportSuccess, reportFailure)
 *  - Added health monitor (recordScraperSuccess, recordScraperFailure)
 *  - Uses ScrapingBee options: { renderJs: true, premiumProxy: true } for RT pages
 */

import * as cheerio from 'cheerio';
import { scrapeAndParse, type ScrapingBeeOptions } from '@/lib/pipeline/core/scrapingbee';
import { canRequest, reportSuccess, reportFailure } from '@/lib/pipeline/core/circuit-breaker';
import { recordScraperSuccess, recordScraperFailure } from '@/lib/pipeline/core/health-monitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RTConsensusData {
  slug: string;
  url: string;
  tomatometer: number | null; // 0-100
  audienceScore: number | null; // 0-100
  consensus: string | null; // The critic consensus paragraph
  criticReviewCount: number | null;
  audienceReviewCount: number | null;
  scrapedAt: string;
}

interface CacheEntry {
  data: RTConsensusData;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAPER_NAME = 'rottentomatoes';
const BASE_URL = 'https://www.rottentomatoes.com';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** ScrapingBee options for RT pages — JS rendering + premium proxy for anti-bot bypass */
const SB_OPTIONS: ScrapingBeeOptions = {
  renderJs: true,
  premiumProxy: true,
};

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function getCached(key: string): RTConsensusData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: RTConsensusData): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  console.log('[RT]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[RT]', ...args);
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

interface LDReview {
  reviewBody?: string;
  author?: unknown;
  reviewRating?: {
    ratingValue?: string | number;
    bestRating?: string | number;
  };
}

interface LDAggregateRating {
  ratingValue?: string | number;
  bestRating?: string | number;
  ratingCount?: string | number;
}

interface LDMovie {
  name?: string;
  description?: string;
  aggregateRating?: LDAggregateRating;
  review?: LDReview | LDReview[];
}

function parseJsonLdBlocks($: cheerio.CheerioAPI): LDMovie[] {
  const results: LDMovie[] = [];

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).text().trim();
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Can be a single object or an array of objects
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (
          item &&
          typeof item === "object" &&
          ("review" in item || "aggregateRating" in item || "name" in item)
        ) {
          results.push(item as LDMovie);
        }
      }
    } catch {
      // Silently ignore malformed JSON-LD blocks
    }
  });

  return results;
}

function toNumber(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === "number" ? val : parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Meta-tag fallback extraction
// ---------------------------------------------------------------------------

function extractFromMeta($: cheerio.CheerioAPI): {
  tomatometer: number | null;
  audienceScore: number | null;
  consensus: string | null;
  criticReviewCount: number | null;
  audienceReviewCount: number | null;
} {
  let tomatometer: number | null = null;
  let audienceScore: number | null = null;
  let consensus: string | null = null;
  let criticReviewCount: number | null = null;
  let audienceReviewCount: number | null = null;

  // Try meta tags
  const metaTomatometer = $('meta[name="tomatometer"]').attr("content");
  const metaAudience = $('meta[name="audiencescore"]').attr("content");
  const metaConsensus = $('meta[name="description"]').attr("content");

  if (metaTomatometer) tomatometer = toNumber(metaTomatometer);
  if (metaAudience) audienceScore = toNumber(metaAudience);
  if (metaConsensus) consensus = metaConsensus;

  // Try score-specific JSON embedded in the page (RT's React hydration data)
  const scoreScript = $('script#score-default').html();
  if (scoreScript) {
    try {
      const scoreData = JSON.parse(scoreScript);
      if (scoreData?.tomatometer?.value !== undefined)
        tomatometer = toNumber(scoreData.tomatometer.value);
      if (scoreData?.audienceScore?.value !== undefined)
        audienceScore = toNumber(scoreData.audienceScore.value);
      if (scoreData?.tomatometer?.reviewCount !== undefined)
        criticReviewCount = toNumber(scoreData.tomatometer.reviewCount);
      if (scoreData?.audienceScore?.reviewCount !== undefined)
        audienceReviewCount = toNumber(scoreData.audienceScore.reviewCount);
      if (scoreData?.criticsConsensus)
        consensus = scoreData.criticsConsensus as string;
    } catch {
      // Ignore parse errors
    }
  }

  // Try scraping the visible consensus section
  if (!consensus) {
    const consensusEl = $(
      'p.critics-consensus, [data-qa="critics-consensus"], .consensus__text'
    );
    if (consensusEl.length) {
      consensus = consensusEl.first().text().trim() || null;
    }
  }

  // Try extracting scores from visible scoreboard elements
  if (tomatometer === null) {
    const tmEl = $(
      'score-board [tomatometerscore], [data-qa="tomatometer-score"], .tomatometer .percentage'
    );
    if (tmEl.length) {
      const raw = tmEl.first().attr("tomatometerscore") ?? tmEl.text().trim();
      tomatometer = toNumber(raw);
    }
  }

  if (audienceScore === null) {
    const auEl = $(
      'score-board [audiencescore], [data-qa="audience-score"], .audience-score .percentage'
    );
    if (auEl.length) {
      const raw = auEl.first().attr("audiencescore") ?? auEl.text().trim();
      audienceScore = toNumber(raw);
    }
  }

  // Review counts from visible elements
  if (criticReviewCount === null) {
    const rcEl = $(
      '.tomatometer .score-info__reviews, [data-qa="critic-count"]'
    );
    if (rcEl.length) {
      criticReviewCount = toNumber(rcEl.first().text().replace(/\D/g, ""));
    }
  }

  if (audienceReviewCount === null) {
    const arEl = $(
      '.audience-score .score-info__reviews, [data-qa="audience-count"]'
    );
    if (arEl.length) {
      audienceReviewCount = toNumber(arEl.first().text().replace(/\D/g, ""));
    }
  }

  return { tomatometer, audienceScore, consensus, criticReviewCount, audienceReviewCount };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface RTSearchResult {
  slug: string;
  title: string;
  year: number | null;
  url: string;
}

/**
 * Search Rotten Tomatoes for a movie title and return matching slugs.
 */
export async function searchMovie(
  title: string
): Promise<RTSearchResult[] | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping search for "${title}"`);
    return null;
  }

  const query = encodeURIComponent(title);
  const searchUrl = `${BASE_URL}/search?search=${query}`;

  const startTime = Date.now();
  const $ = await scrapeAndParse(searchUrl, SB_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Search scrape failed for "${title}" (${elapsed}ms)`);
    return null;
  }

  try {
    const results: RTSearchResult[] = [];

    // RT search results are rendered as JSON in a script tag for hydration
    const searchScript = $('script#search-result').html();
    if (searchScript) {
      try {
        const searchData = JSON.parse(searchScript);
        const movies: unknown[] = searchData?.movies ?? searchData?.items ?? [];
        for (const m of movies) {
          if (m && typeof m === "object") {
            const obj = m as Record<string, unknown>;
            const slug = String(obj.url ?? obj.slug ?? "")
              .replace(/^\/m\//, "")
              .replace(/\/$/, "");
            if (slug) {
              results.push({
                slug,
                title: String(obj.name ?? obj.title ?? ""),
                year: toNumber(obj.year as string | number),
                url: `${BASE_URL}/m/${slug}`,
              });
            }
          }
        }
      } catch {
        // Fall through to HTML scraping
      }
    }

    // Fallback: scrape search-result rows from HTML
    if (results.length === 0) {
      $("search-page-result-row, .search-page-result-row").each(
        (_i, el) => {
          const anchor = $(el).find("a").first();
          const href = anchor.attr("href") ?? "";
          const slugMatch = href.match(/\/m\/([^/?#]+)/);
          if (slugMatch) {
            const slug = slugMatch[1];
            const name = anchor.text().trim();
            const yearEl = $(el).find(".release-year, .year").first();
            const year = toNumber(yearEl.text().trim());
            results.push({
              slug,
              title: name,
              year,
              url: `${BASE_URL}/m/${slug}`,
            });
          }
        }
      );
    }

    // Another fallback: JSON-LD on the search page
    if (results.length === 0) {
      const ldBlocks = parseJsonLdBlocks($);
      for (const block of ldBlocks) {
        if (block.name) {
          const desc = block.description ?? "";
          // Try to infer slug from any URL in the block
          const urlMatch = desc.match(/rottentomatoes\.com\/m\/([^/?#\s"]+)/);
          const slug = urlMatch ? urlMatch[1] : block.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          results.push({
            slug,
            title: block.name,
            year: null,
            url: `${BASE_URL}/m/${slug}`,
          });
        }
      }
    }

    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    log(`Search "${title}" → ${results.length} result(s) (${elapsed}ms)`);
    return results.length > 0 ? results : null;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Search parse error for "${title}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core consensus scraper
// ---------------------------------------------------------------------------

/**
 * Scrape consensus data for a movie given its RT slug (e.g. "inception").
 */
export async function getConsensus(
  movieSlug: string
): Promise<RTConsensusData | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping consensus for "${movieSlug}"`);
    return null;
  }

  const cacheKey = `consensus:${movieSlug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for ${movieSlug}`);
    return cached;
  }

  const url = `${BASE_URL}/m/${movieSlug}`;
  log(`Scraping ${url}`);

  const startTime = Date.now();
  const $ = await scrapeAndParse(url, SB_OPTIONS);

  if (!$) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(`Page scrape failed for ${movieSlug} (${elapsed}ms)`);
    return null;
  }

  try {
    let tomatometer: number | null = null;
    let audienceScore: number | null = null;
    let consensus: string | null = null;
    let criticReviewCount: number | null = null;
    let audienceReviewCount: number | null = null;

    // --- Strategy 1: JSON-LD structured data ---
    const ldBlocks = parseJsonLdBlocks($);

    for (const block of ldBlocks) {
      // Aggregate ratings
      if (block.aggregateRating) {
        const ar = block.aggregateRating;
        const bestRating = toNumber(ar.bestRating) ?? 100;
        const rawValue = toNumber(ar.ratingValue);

        if (rawValue !== null) {
          // If bestRating is 100 the value is already a percentage;
          // otherwise normalise.
          const pct = bestRating === 100 ? rawValue : Math.round((rawValue / bestRating) * 100);

          // Heuristic: if the block already has a tomatometer, this aggregate
          // is probably the audience score, and vice-versa. We use ordering
          // and naming to disambiguate.
          if (tomatometer === null) {
            tomatometer = pct;
            criticReviewCount = toNumber(ar.ratingCount);
          } else {
            audienceScore = pct;
            audienceReviewCount = toNumber(ar.ratingCount);
          }
        }
      }

      // Consensus from review bodies
      if (block.review) {
        const reviews: LDReview[] = Array.isArray(block.review)
          ? block.review
          : [block.review];

        // The consensus text is sometimes a synthetic review attached to the
        // movie itself rather than an individual critic.
        for (const rev of reviews) {
          if (rev.reviewBody && typeof rev.reviewBody === "string") {
            const body = rev.reviewBody.trim();
            // Consensus reviews tend to be longer / paragraph-level
            if (!consensus || body.length > (consensus.length ?? 0)) {
              consensus = body;
            }
          }
        }
      }

      // Description often contains the consensus on RT
      if (!consensus && block.description && typeof block.description === "string") {
        consensus = block.description.trim();
      }
    }

    // --- Strategy 2: Meta-tag / scoreboard fallback ---
    if (tomatometer === null || audienceScore === null || !consensus) {
      const meta = extractFromMeta($);
      if (tomatometer === null) tomatometer = meta.tomatometer;
      if (audienceScore === null) audienceScore = meta.audienceScore;
      if (!consensus) consensus = meta.consensus;
      if (criticReviewCount === null) criticReviewCount = meta.criticReviewCount;
      if (audienceReviewCount === null) audienceReviewCount = meta.audienceReviewCount;
    }

    const data: RTConsensusData = {
      slug: movieSlug,
      url,
      tomatometer,
      audienceScore,
      consensus,
      criticReviewCount,
      audienceReviewCount,
      scrapedAt: new Date().toISOString(),
    };

    // Report success
    const elapsed = Date.now() - startTime;
    reportSuccess(SCRAPER_NAME);
    recordScraperSuccess(SCRAPER_NAME, elapsed);

    setCache(cacheKey, data);
    log(
      `Scraped ${movieSlug} — tomato:${tomatometer ?? "?"} audience:${audienceScore ?? "?"} consensus:${consensus ? consensus.slice(0, 60) + "…" : "none"} (${elapsed}ms)`
    );

    return data;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    reportFailure(SCRAPER_NAME);
    recordScraperFailure(SCRAPER_NAME);
    warn(
      `Parse error for ${movieSlug}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// IMDb → RT bridge
// ---------------------------------------------------------------------------

/**
 * Look up RT consensus data by IMDb ID (e.g. "tt1375666").
 *
 * Strategy: search RT using the IMDb ID as a query term, then pick the best
 * result and call `getConsensus`.
 */
export async function getConsensusByImdbId(
  imdbId: string
): Promise<RTConsensusData | null> {
  // Circuit breaker check
  if (!canRequest(SCRAPER_NAME)) {
    warn(`Circuit breaker OPEN — skipping IMDb lookup for ${imdbId}`);
    return null;
  }

  const cacheKey = `imdb:${imdbId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    log(`Cache hit for IMDb ${imdbId}`);
    return cached;
  }

  log(`Looking up IMDb ID ${imdbId} on RT`);

  // Search by IMDb ID — RT search sometimes returns the direct movie page
  const results = await searchMovie(imdbId);
  if (!results || results.length === 0) {
    warn(`No RT results for IMDb ID ${imdbId}`);
    return null;
  }

  // Use the first result (most relevant)
  const best = results[0];
  const data = await getConsensus(best.slug);

  if (data) {
    // Also cache under the IMDb key
    setCache(cacheKey, data);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/** Clear all cached entries. */
export function clearCache(): void {
  cache.clear();
  log("Cache cleared");
}

/** Return current cache size (useful for diagnostics). */
export function cacheSize(): number {
  return cache.size;
}
