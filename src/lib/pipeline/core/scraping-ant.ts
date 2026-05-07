/**
 * ScrapingAnt Transport Client
 *
 * Replaces ScrapingBee with ScrapingAnt for web scraping.
 * Uses 5 API keys in round-robin to distribute load.
 * Falls back to direct fetch for sites that don't need scraping.
 *
 * Features:
 *  - Round-robin key rotation across 5 API keys
 *  - Auto proxy rotation via ScrapingAnt
 *  - Optional JS rendering for SPA sites
 *  - Direct fetch fallback for non-protected sites
 *  - Per-key usage tracking with quota guard
 *  - Configurable timeout and retry logic
 */

import * as cheerio from 'cheerio';

// ─── Configuration ───

const SCRAPINGANT_BASE = 'https://api.scrapingant.com/v2/general';
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const PER_KEY_MONTHLY_LIMIT = 10_000; // Typical ScrapingAnt plan limit

// ─── API Keys (round-robin) ───

const SCRAPINGANT_KEYS = [
  process.env.SCRAPINGANT_KEY_1,
  process.env.SCRAPINGANT_KEY_2,
  process.env.SCRAPINGANT_KEY_3,
  process.env.SCRAPINGANT_KEY_4,
  process.env.SCRAPINGANT_KEY_5,
].filter((k): k is string => typeof k === 'string' && k.length > 0);

let currentKeyIndex = 0;

// ─── Types ───

export interface ScrapingAntOptions {
  /** Enable JavaScript rendering (for SPA sites) */
  renderJs?: boolean;
  /** Use premium proxies */
  premiumProxy?: boolean;
  /** Country code for geo-specific proxies */
  countryCode?: string;
  /** Custom headers to send */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
  /** Wait for selector before returning */
  waitForSelector?: string;
  /** Block images/CSS for faster loads */
  blockResources?: boolean;
  /** Use direct fetch instead of ScrapingAnt (for non-protected sites) */
  directFetch?: boolean;
}

export interface ScrapingAntResponse {
  html: string;
  statusCode: number;
  cost: number;
  isFromCache: boolean;
  proxyUsed: boolean;
  keyUsed?: string;
}

export interface ScrapingAntKeyStats {
  keyIndex: number;
  keySuffix: string;
  used: number;
  remaining: number;
  limit: number;
}

export interface ScrapingAntDailyStats {
  totalUsed: number;
  totalRemaining: number;
  keyStats: ScrapingAntKeyStats[];
  activeKeys: number;
}

// ─── Internal State ───

const keyUsageCounts: number[] = new Array(SCRAPINGANT_KEYS.length).fill(0);
let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;

// ─── Key Rotation ───

function getNextKey(): { key: string; index: number } | null {
  if (SCRAPINGANT_KEYS.length === 0) return null;

  // Find the key with the lowest usage count
  let minUsage = Infinity;
  let minIndex = currentKeyIndex;

  for (let i = 0; i < SCRAPINGANT_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % SCRAPINGANT_KEYS.length;
    if (keyUsageCounts[idx] < minUsage) {
      minUsage = keyUsageCounts[idx];
      minIndex = idx;
    }
  }

  // Check if the least-used key has quota remaining
  if (keyUsageCounts[minIndex] >= PER_KEY_MONTHLY_LIMIT) {
    console.warn('[ScrapingAnt] All keys have reached their monthly limit.');
    return null;
  }

  currentKeyIndex = (minIndex + 1) % SCRAPINGANT_KEYS.length;
  return { key: SCRAPINGANT_KEYS[minIndex], index: minIndex };
}

/** Check if ScrapingAnt is configured */
export function isScrapingAntConfigured(): boolean {
  return SCRAPINGANT_KEYS.length > 0;
}

// ─── Stats ───

export function getScrapingAntStats() {
  const keyStats: ScrapingAntKeyStats[] = SCRAPINGANT_KEYS.map((key, i) => ({
    keyIndex: i,
    keySuffix: key.slice(-4),
    used: keyUsageCounts[i],
    remaining: Math.max(0, PER_KEY_MONTHLY_LIMIT - keyUsageCounts[i]),
    limit: PER_KEY_MONTHLY_LIMIT,
  }));

  const totalUsed = keyUsageCounts.reduce((a, b) => a + b, 0);

  return {
    totalRequests,
    successRequests,
    failedRequests,
    successRate: totalRequests > 0 ? successRequests / totalRequests : 0,
    keyStats,
    totalUsed,
    totalRemaining: SCRAPINGANT_KEYS.length * PER_KEY_MONTHLY_LIMIT - totalUsed,
    activeKeys: SCRAPINGANT_KEYS.length,
    configured: isScrapingAntConfigured(),
  };
}

export function getScrapingAntDailyStats(): ScrapingAntDailyStats {
  const stats = getScrapingAntStats();
  return {
    totalUsed: stats.totalUsed,
    totalRemaining: stats.totalRemaining,
    keyStats: stats.keyStats,
    activeKeys: stats.activeKeys,
  };
}

// ─── Direct Fetch Fallback ───

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

let uaIndex = 0;

async function directFetch(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<ScrapingAntResponse | null> {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex++;

  const headers: Record<string, string> = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': options.countryCode
      ? `${options.countryCode}-${options.countryCode.toUpperCase()},${options.countryCode};q=0.9,en;q=0.5`
      : 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeout || DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[ScrapingAnt-Direct] HTTP ${res.status} for ${url}`);
      failedRequests++;
      return null;
    }

    const html = await res.text();
    successRequests++;

    return {
      html,
      statusCode: res.status,
      cost: 0,
      isFromCache: false,
      proxyUsed: false,
    };
  } catch (err: any) {
    console.warn(`[ScrapingAnt-Direct] Fetch failed for ${url}:`, err.message);
    failedRequests++;
    return null;
  }
}

// ─── Core Fetch via ScrapingAnt ───

async function scrapingAntFetch(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<ScrapingAntResponse | null> {
  const keyInfo = getNextKey();
  if (!keyInfo) {
    console.warn('[ScrapingAnt] No available keys. Falling back to direct fetch.');
    return directFetch(url, options);
  }

  totalRequests++;
  const { key, index: keyIndex } = keyInfo;

  // Build request body for ScrapingAnt v2
  const body: Record<string, any> = {
    url,
    browser: options.renderJs ?? false,
    proxy_country: options.countryCode || '',
    return_text: true,
  };

  if (options.waitForSelector) {
    body.wait_for_selector = options.waitForSelector;
  }

  if (options.blockResources) {
    body.block_resources = ['image', 'stylesheet', 'font', 'media'];
  }

  if (options.headers) {
    body.headers = options.headers;
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT_MS;

  // ─── Retry loop ───
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[ScrapingAnt] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms for ${url}`);
        await new Promise(r => setTimeout(r, delay));
      }

      const res = await fetch(SCRAPINGANT_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });

      if (!res.ok) {
        const responseText = await res.text().catch(() => '');
        console.warn(`[ScrapingAnt] HTTP ${res.status} for ${url} — ${responseText.slice(0, 200)}`);

        // 429 = rate limited on this key, try next key
        if (res.status === 429) {
          keyUsageCounts[keyIndex] = PER_KEY_MONTHLY_LIMIT; // Mark as exhausted
          const nextKey = getNextKey();
          if (nextKey) {
            // Retry with next key
            continue;
          }
          return directFetch(url, options);
        }

        // Don't retry client errors (4xx)
        if (res.status >= 400 && res.status < 500) {
          failedRequests++;
          return null;
        }

        // Retry server errors (5xx)
        continue;
      }

      const data = await res.json();
      const html = data.content || data.text || data.html || '';
      const cost = 1; // Each request costs 1 credit typically

      keyUsageCounts[keyIndex] += cost;
      successRequests++;

      // CAPTCHA detection
      if (html.includes('Are you a human?') || html.includes('cf-challenge') || html.includes('captcha')) {
        console.warn(`[ScrapingAnt] CAPTCHA detected in response for ${url}`);
        continue; // Retry with different proxy
      }

      return {
        html,
        statusCode: res.status,
        cost,
        isFromCache: false,
        proxyUsed: true,
        keyUsed: `key_${keyIndex}`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        console.warn(`[ScrapingAnt] Timeout for ${url} (attempt ${attempt + 1})`);
      } else {
        console.warn(`[ScrapingAnt] Fetch error for ${url}:`, err.message);
      }
    }
  }

  failedRequests++;
  console.warn(`[ScrapingAnt] All retries exhausted for ${url}`);
  return null;
}

// ─── Public API ───

/**
 * Fetch a URL through ScrapingAnt with round-robin key rotation.
 * Falls back to direct fetch if:
 *   - options.directFetch is true
 *   - No keys are available
 *   - All keys are exhausted
 */
export async function scrapeUrl(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<ScrapingAntResponse | null> {
  // Direct fetch for non-protected sites (RT JSON-LD, MyDramaList, Dramabeans)
  if (options.directFetch) {
    return directFetch(url, options);
  }

  return scrapingAntFetch(url, options);
}

/**
 * Scrape a URL and return a parsed Cheerio instance.
 */
export async function scrapeAndParse(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<cheerio.CheerioAPI | null> {
  const response = await scrapeUrl(url, options);
  if (!response) return null;
  return cheerio.load(response.html);
}

/**
 * Scrape a URL and return raw HTML.
 */
export async function scrapeHtml(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<string | null> {
  const response = await scrapeUrl(url, options);
  return response?.html || null;
}

/**
 * Scrape a URL and parse its JSON-LD script blocks.
 * Uses direct fetch (no proxy needed for JSON-LD extraction).
 */
export async function scrapeJsonLd(
  url: string,
  options: ScrapingAntOptions = {},
): Promise<any[]> {
  // JSON-LD extraction doesn't need JS rendering or proxy - direct fetch
  const $ = await scrapeAndParse(url, { ...options, directFetch: true });
  if (!$) return [];

  const results: any[] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).text().trim();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      results.push(...items);
    } catch {
      // Ignore malformed JSON-LD
    }
  });

  return results;
}
