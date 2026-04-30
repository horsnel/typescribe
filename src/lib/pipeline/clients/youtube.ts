/**
 * YouTube Data API v3 Client for the Typescribe movie site.
 *
 * Docs:  https://developers.google.com/youtube/v3/docs
 * Base:  https://www.googleapis.com/youtube/v3/
 * Auth:  ?key=YOUTUBE_API_KEY
 *
 * Features:
 *  - Search for movie trailers (picks first result that looks like an official trailer)
 *  - Get video details by ID (title, description, stats)
 *  - In-memory Map cache (7 days for video details, 1 day for search results)
 *  - Rate-limit guard (200 ms minimum between requests)
 *  - Daily quota tracking (YouTube Data API has daily quota limits)
 *  - Graceful error handling (returns null, logs with `[YouTube]` prefix)
 *  - `getYoutubeDailyStats()` export for quota introspection
 *  - `clearYoutubeCache()` export for cache invalidation
 */

import { fetchWithTimeout, safeJsonParse, enforceCacheLimit } from '@/lib/pipeline/core/resilience';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YouTubeTrailerResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeVideoDetails {
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
}

export interface YouTubeDailyStats {
  used: number;
  limit: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Internal helpers – raw YouTube API JSON shapes
// ---------------------------------------------------------------------------

interface YouTubeRawSearchResult {
  id: {
    kind: string;
    videoId?: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
  };
}

interface YouTubeRawSearchResponse {
  kind: string;
  items: YouTubeRawSearchResult[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  error?: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

interface YouTubeRawVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount?: string;
    commentCount?: string;
  };
}

interface YouTubeRawVideoResponse {
  kind: string;
  items: YouTubeRawVideoItem[];
  error?: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube Data API v3 daily quota units.
 *
 * A search operation costs ~100 units; a video list costs ~1 unit.
 * The default free-tier daily allocation is 10 000 units.
 * We conservatively track request count rather than quota units;
 * at ~100 units/search and ~1 unit/details we can safely treat
 * each request as 1 "slot" and set a generous daily limit.
 */
const DAILY_REQUEST_LIMIT = 200;

const CACHE_TTL_VIDEO_DETAILS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_TTL_SEARCH = 1 * 24 * 60 * 60 * 1000;        // 1 day
const INTER_REQUEST_DELAY_MS = 200;

/**
 * Resolve the YouTube API key. Accepts an explicit override; otherwise reads
 * `YOUTUBE_API_KEY` from `process.env`.
 */
function getApiKey(override?: string): string | undefined {
  if (override) return override;
  return process.env.YOUTUBE_API_KEY;
}

// ---------------------------------------------------------------------------
// Daily request counter
// ---------------------------------------------------------------------------

let dailyUsed = 0;
let dailyResetDate = new Date();

/** Reset the counter at midnight UTC if the day has rolled over. */
function maybeResetDaily(): void {
  const now = new Date();
  if (
    now.getUTCFullYear() !== dailyResetDate.getUTCFullYear() ||
    now.getUTCMonth() !== dailyResetDate.getUTCMonth() ||
    now.getUTCDate() !== dailyResetDate.getUTCDate()
  ) {
    dailyUsed = 0;
    dailyResetDate = now;
  }
}

// ---------------------------------------------------------------------------
// Rate-limit delay
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < INTER_REQUEST_DELAY_MS) {
    await sleep(INTER_REQUEST_DELAY_MS - elapsed);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttl: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  enforceCacheLimit(cache);
}

/** Clear the entire YouTube in-memory cache. */
export function clearYoutubeCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function youtubeFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey?: string,
): Promise<T | null> {
  const key = getApiKey(apiKey);
  if (!key) {
    console.error("[YouTube] No API key configured. Set YOUTUBE_API_KEY env var.");
    return null;
  }

  maybeResetDaily();

  if (dailyUsed >= DAILY_REQUEST_LIMIT) {
    console.warn(
      `[YouTube] Daily request limit reached (${DAILY_REQUEST_LIMIT}). Skipping request.`
    );
    return null;
  }

  await enforceRateLimit();

  const qs = new URLSearchParams({ ...params, key }).toString();
  const url = `${BASE_URL}${endpoint}?${qs}`;

  try {
    lastRequestTime = Date.now();
    dailyUsed++;

    const res = await fetchWithTimeout(url, undefined, 10_000);
    if (!res) {
      console.error('[YouTube] Request failed (timeout/network)');
      return null;
    }
    if (!res.ok) {
      console.error(`[YouTube] HTTP ${res.status} for ${endpoint}`);
      return null;
    }

    const json = await safeJsonParse<Record<string, unknown>>(res);
    if (!json) {
      console.error('[YouTube] Failed to parse JSON response');
      return null;
    }

    // YouTube API returns error objects inside the JSON body even on 200
    if (json.error) {
      const errMsg =
        (json.error as { message?: string }).message ?? "Unknown YouTube API error";
      console.warn(`[YouTube] API error: ${errMsg}`);
      return null;
    }

    return json as unknown as T;
  } catch (err) {
    console.error("[YouTube] Network / parse error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trailer detection heuristic
// ---------------------------------------------------------------------------

/**
 * Determine whether a search result looks like an official movie trailer.
 *
 * Checks for "trailer" keyword in the title and prefers channels whose
 * names suggest an official source (studio, movie, or major distributor).
 */
function looksLikeOfficialTrailer(result: YouTubeRawSearchResult): boolean {
  const title = result.snippet.title.toLowerCase();
  const channel = result.snippet.channelTitle.toLowerCase();

  // Must contain "trailer" in the title
  if (!title.includes("trailer")) return false;

  // Heuristic: official channels often include these keywords
  const officialChannelHints = [
    "official",
    "pictures",
    "studios",
    "studio",
    "films",
    "entertainment",
    "warner bros",
    "universal",
    "paramount",
    "sony",
    "disney",
    "fox",
    "lionsgate",
    "a24",
    "netflix",
    "amazon",
    "apple tv",
    "mgm",
    "searchlight",
    "focus features",
    "roadside",
  ];

  const hasOfficialChannel = officialChannelHints.some((hint) =>
    channel.includes(hint)
  );

  // Also accept "official trailer" in the title regardless of channel
  const hasOfficialTitle = title.includes("official");

  return hasOfficialChannel || hasOfficialTitle;
}

// ---------------------------------------------------------------------------
// Public API – searchTrailer
// ---------------------------------------------------------------------------

/**
 * Search YouTube for a movie trailer.
 *
 * Queries for `"{movieTitle} {year} official trailer"` and returns the
 * first result that looks like an official trailer. Falls back to the
 * first result if no official-looking match is found.
 *
 * @param movieTitle  The movie title to search for.
 * @param year        Optional release year to narrow results.
 * @returns A `YouTubeTrailerResult` or `null` on error / not found.
 */
export async function searchTrailer(
  movieTitle: string,
  year?: number,
  apiKey?: string,
): Promise<YouTubeTrailerResult | null> {
  const query = year
    ? `${movieTitle} ${year} official trailer`
    : `${movieTitle} official trailer`;

  const cacheKey = `search:${query}`;
  const cached = getCached<YouTubeTrailerResult>(cacheKey);
  if (cached) return cached;

  const raw = await youtubeFetch<YouTubeRawSearchResponse>(
    "/search",
    {
      part: "snippet",
      q: query,
      type: "video",
      videoCategoryId: "1", // Film & Animation
      maxResults: "5",
    },
    apiKey,
  );

  if (!raw) return null;

  const items = raw.items ?? [];
  if (items.length === 0) {
    console.info(`[YouTube] No search results for "${query}"`);
    return null;
  }

  // Try to find an official trailer first
  let best = items.find(
    (item) =>
      item.id.kind === "youtube#video" &&
      item.id.videoId &&
      looksLikeOfficialTrailer(item)
  );

  // Fallback: first video result
  if (!best) {
    best = items.find(
      (item) => item.id.kind === "youtube#video" && item.id.videoId
    );
  }

  if (!best || !best.id.videoId) {
    console.info(`[YouTube] No video results for "${query}"`);
    return null;
  }

  // Pick the best-quality thumbnail available
  const thumbs = best.snippet.thumbnails;
  const thumbnailUrl =
    thumbs.maxres?.url ??
    thumbs.standard?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    "";

  const result: YouTubeTrailerResult = {
    videoId: best.id.videoId,
    title: best.snippet.title,
    channelTitle: best.snippet.channelTitle,
    publishedAt: best.snippet.publishedAt,
    thumbnailUrl,
  };

  setCache(cacheKey, result, CACHE_TTL_SEARCH);
  return result;
}

// ---------------------------------------------------------------------------
// Public API – getVideoDetails
// ---------------------------------------------------------------------------

/**
 * Fetch detailed information for a YouTube video by its ID.
 *
 * @param videoId  The YouTube video ID (e.g. "dQw4w9WgXcQ").
 * @returns A `YouTubeVideoDetails` object or `null` on error / not found.
 */
export async function getVideoDetails(
  videoId: string,
  apiKey?: string,
): Promise<YouTubeVideoDetails | null> {
  const cacheKey = `video:${videoId}`;
  const cached = getCached<YouTubeVideoDetails>(cacheKey);
  if (cached) return cached;

  const raw = await youtubeFetch<YouTubeRawVideoResponse>(
    "/videos",
    {
      part: "snippet,statistics",
      id: videoId,
    },
    apiKey,
  );

  if (!raw) return null;

  const item = raw.items?.[0];
  if (!item) {
    console.info(`[YouTube] No video found for ID "${videoId}"`);
    return null;
  }

  const result: YouTubeVideoDetails = {
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics.viewCount, 10) || 0,
    likeCount: parseInt(item.statistics.likeCount, 10) || 0,
  };

  setCache(cacheKey, result, CACHE_TTL_VIDEO_DETAILS);
  return result;
}

// ---------------------------------------------------------------------------
// Daily stats export
// ---------------------------------------------------------------------------

/**
 * Return current daily quota usage for the YouTube Data API.
 */
export function getYoutubeDailyStats(): YouTubeDailyStats {
  maybeResetDaily();

  return {
    used: dailyUsed,
    limit: DAILY_REQUEST_LIMIT,
    remaining: Math.max(0, DAILY_REQUEST_LIMIT - dailyUsed),
  };
}
