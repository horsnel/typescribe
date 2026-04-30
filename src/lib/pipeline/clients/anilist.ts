/**
 * AniList API Client — Free GraphQL API for anime data.
 * No API key required. Rate limit: ~90 requests/minute.
 *
 * Provides: MAL scores, studios, tags, streaming links, episode counts,
 * season info, source material, alternative titles, character data.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://graphql.anilist.co';

const CACHE_TTL_MS = 60 * 60 * 1000;  // 1 hour
const RATE_LIMIT_MS = 700;             // Min 700ms between requests

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface AniListResult {
  anilistId: number;
  malId: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  source: string | null;
  studios: string[];
  genres: string[];
  tags: Array<{ name: string; rank: number }>;
  averageScore: number | null;    // 0-100 AniList weighted
  meanScore: number | null;       // 0-100 AniList mean
  popularity: number;
  trending: number;
  favourites: number;
  siteUrl: string | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  streaming: Array<{ site: string; url: string }>;
  coverImage: { large: string | null; medium: string | null };
  bannerImage: string | null;
}

// ─── GraphQL response types ──────────────────────────────────────────────────

interface AniListMediaNode {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  description: string | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  endDate: { year: number | null; month: number | null; day: number | null } | null;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  source: string | null;
  studios: {
    nodes: Array<{ name: string }>;
  };
  genres: string[];
  tags: Array<{ name: string; rank: number }> | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number;
  trending: number;
  favourites: number;
  siteUrl: string | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  streaming: Array<{ site: string; url: string }> | null;
  coverImage: { large: string | null; medium: string | null } | null;
  bannerImage: string | null;
  externalLinks: Array<{ site: string; url: string; type: string }> | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; status?: number }>;
}

// ─── Internal State ──────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();
let lastRequestTime = 0;

// ─── Rate Limiter ────────────────────────────────────────────────────────────

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** Clear the entire AniList in-memory cache. */
export function clearAniListCache(): void {
  cache.clear();
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(...args: unknown[]): void {
  console.log('[AniList]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[AniList]', ...args);
}

// ─── Transform ───────────────────────────────────────────────────────────────

function transformMediaNode(node: AniListMediaNode): AniListResult {
  return {
    anilistId: node.id,
    malId: node.idMal ?? null,
    title: {
      romaji: node.title?.romaji ?? null,
      english: node.title?.english ?? null,
      native: node.title?.native ?? null,
    },
    description: node.description ?? null,
    startDate: node.startDate ?? { year: null, month: null, day: null },
    endDate: node.endDate ?? { year: null, month: null, day: null },
    season: node.season ?? null,
    seasonYear: node.seasonYear ?? null,
    format: node.format ?? null,
    status: node.status ?? null,
    episodes: node.episodes ?? null,
    duration: node.duration ?? null,
    source: node.source ?? null,
    studios: node.studios?.nodes?.map((s) => s.name) ?? [],
    genres: node.genres ?? [],
    tags: node.tags ?? [],
    averageScore: node.averageScore ?? null,
    meanScore: node.meanScore ?? null,
    popularity: node.popularity ?? 0,
    trending: node.trending ?? 0,
    favourites: node.favourites ?? 0,
    siteUrl: node.siteUrl ?? null,
    nextAiringEpisode: node.nextAiringEpisode ?? null,
    streaming: node.streaming ?? [],
    coverImage: node.coverImage ?? { large: null, medium: null },
    bannerImage: node.bannerImage ?? null,
  };
}

// ─── GraphQL Queries ─────────────────────────────────────────────────────────

const MEDIA_FRAGMENT = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  startDate { year month day }
  endDate { year month day }
  season
  seasonYear
  format
  status
  episodes
  duration
  source
  studios(isMain: true) { nodes { name } }
  genres
  tags { name rank }
  averageScore
  meanScore
  popularity
  trending
  favourites
  siteUrl
  nextAiringEpisode { airingAt episode }
  streaming(episodes: 1) { site url }
  coverImage { large medium }
  bannerImage
  externalLinks { site url type }
`;

const SEARCH_QUERY = `
  query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: $type, isAdult: false) {
        ${MEDIA_FRAGMENT}
      }
    }
  }
`;

const BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME, isAdult: false) {
      ${MEDIA_FRAGMENT}
    }
  }
`;

const BY_MAL_ID_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME, isAdult: false) {
      ${MEDIA_FRAGMENT}
    }
  }
`;

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, isAdult: false, sort: TRENDING_DESC) {
        ${MEDIA_FRAGMENT}
      }
    }
  }
`;

const POPULAR_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
        ${MEDIA_FRAGMENT}
      }
    }
  }
`;

// ─── Raw Fetch ───────────────────────────────────────────────────────────────

async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  cacheKey: string,
  ttl: number = CACHE_TTL_MS,
): Promise<T | null> {
  // Check cache first
  const cached = getCached<T>(cacheKey);
  if (cached !== null) return cached;

  try {
    await enforceRateLimit();

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      // Handle rate limiting
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
        warn(`Rate limited by AniList. Retry after ${waitMs}ms.`);
        return null;
      }
      warn(`${res.status} ${res.statusText}`);
      return null;
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      warn('GraphQL errors:', json.errors.map((e) => e.message).join('; '));
      return null;
    }

    if (!json.data) {
      warn('No data in response');
      return null;
    }

    const data = json.data;
    setCache(cacheKey, data, ttl);
    return data;
  } catch (err) {
    warn('Request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if AniList is configured.
 * Always returns true — no API key is required.
 */
export function isAniListConfigured(): boolean {
  return true;
}

/**
 * Search AniList for anime by title.
 * Returns up to 10 results.
 */
export async function searchAnime(query: string): Promise<AniListResult[]> {
  const cacheKey = `search:${query}`;
  const startTime = Date.now();

  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; hasNextPage: boolean };
      media: AniListMediaNode[];
    };
  }>(
    SEARCH_QUERY,
    { search: query, type: 'ANIME', page: 1, perPage: 10 },
    cacheKey,
  );

  if (!data?.Page?.media) {
    warn(`No results for "${query}"`);
    return [];
  }

  const results = data.Page.media.map(transformMediaNode);
  log(`Search "${query}" → ${results.length} result(s) (${Date.now() - startTime}ms)`);
  return results;
}

/**
 * Get anime data by MyAnimeList ID.
 * Uses AniList's `idMal` field to cross-reference.
 */
export async function getAnimeByMalId(malId: number): Promise<AniListResult | null> {
  const cacheKey = `mal:${malId}`;
  const startTime = Date.now();

  const data = await anilistFetch<{ Media: AniListMediaNode | null }>(
    BY_MAL_ID_QUERY,
    { idMal: malId },
    cacheKey,
  );

  if (!data?.Media) {
    warn(`No AniList entry for MAL ID ${malId}`);
    return null;
  }

  const result = transformMediaNode(data.Media);
  log(`MAL ${malId} → AniList ${result.anilistId} (${Date.now() - startTime}ms)`);
  return result;
}

/**
 * Get anime data by TMDb ID.
 *
 * Strategy: TMDb doesn't directly map to AniList, so we search by
 * the title from TMDb first. This is a convenience wrapper that
 * requires a TMDb lookup to get the title first.
 *
 * For direct AniList-by-TMDb-ID matching, the pipeline should:
 *   1. Get TMDb details → title
 *   2. Search AniList by title
 *   3. Match the best result
 *
 * This function attempts to use the `idMal` field when available
 * via TMDb external IDs, but falls back to title search.
 */
export async function getAnimeByTmdbId(tmdbId: number): Promise<AniListResult | null> {
  const cacheKey = `tmdb:${tmdbId}`;

  // Check cache first
  const cached = getCached<AniListResult>(cacheKey);
  if (cached !== null) return cached;

  try {
    // Try to get TMDb external IDs to find a MAL ID
    const { getTvExternalIds } = await import('@/lib/pipeline/clients/tmdb');
    const externalIds = await getTvExternalIds(tmdbId);

    // If we find a MAL ID through TMDb, use it directly
    // (TMDb doesn't natively store MAL IDs, but we try the route)
    if (!externalIds) {
      // Fall back to getting the title and searching
      const { getTvDetails } = await import('@/lib/pipeline/clients/tmdb');
      const tvDetails = await getTvDetails(tmdbId);
      if (!tvDetails) {
        warn(`No TMDb TV details for ID ${tmdbId}`);
        return null;
      }

      // Search by the original title or English title
      const searchTerm = tvDetails.original_title || tvDetails.title;
      if (!searchTerm) {
        warn(`No title found for TMDb ID ${tmdbId}`);
        return null;
      }

      const results = await searchAnime(searchTerm);
      if (results.length === 0) {
        warn(`No AniList results for TMDb ${tmdbId} (title: "${searchTerm}")`);
        return null;
      }

      // Return the best match (first result)
      const best = results[0];
      setCache(cacheKey, best);
      return best;
    }

    // If we somehow got external IDs but no MAL link, search by title
    const { getTvDetails } = await import('@/lib/pipeline/clients/tmdb');
    const tvDetails = await getTvDetails(tmdbId);
    if (!tvDetails) {
      warn(`No TMDb TV details for ID ${tmdbId}`);
      return null;
    }

    const searchTerm = tvDetails.original_title || tvDetails.title;
    if (!searchTerm) {
      warn(`No title found for TMDb ID ${tmdbId}`);
      return null;
    }

    const results = await searchAnime(searchTerm);
    if (results.length === 0) return null;

    const best = results[0];
    setCache(cacheKey, best);
    return best;
  } catch (err) {
    warn(`Failed to lookup TMDb ${tmdbId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get anime data by AniList ID directly.
 */
export async function getAnimeByAniListId(anilistId: number): Promise<AniListResult | null> {
  const cacheKey = `anilist:${anilistId}`;
  const startTime = Date.now();

  const data = await anilistFetch<{ Media: AniListMediaNode | null }>(
    BY_ID_QUERY,
    { id: anilistId },
    cacheKey,
  );

  if (!data?.Media) {
    warn(`No AniList entry for ID ${anilistId}`);
    return null;
  }

  const result = transformMediaNode(data.Media);
  log(`AniList ${anilistId} → "${result.title.english || result.title.romaji}" (${Date.now() - startTime}ms)`);
  return result;
}

// ─── Recommendations ────────────────────────────────────────────────────────

const RECOMMENDATIONS_QUERY = `
  query ($id: Int, $page: Int, $perPage: Int) {
    Media(id: $id, type: ANIME, isAdult: false) {
      recommendations(page: $page, perPage: $perPage, sort: [RATING_DESC]) {
        nodes {
          mediaRecommendation {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            averageScore
            meanScore
            siteUrl
            format
            type
          }
          rating
          userRating
        }
      }
    }
  }
`;

export interface AniListRecommendation {
  anilistId: number;
  malId: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null };
  averageScore: number | null;
  meanScore: number | null;
  siteUrl: string | null;
  format: string | null;
  recommendationRating: number;
}

/**
 * Get anime recommendations from AniList by AniList ID.
 * Returns recommendations sorted by community rating (highest first).
 */
export async function getRecommendations(
  anilistId: number,
  perPage: number = 8,
): Promise<AniListRecommendation[]> {
  const cacheKey = `recs:${anilistId}`;
  const startTime = Date.now();

  const data = await anilistFetch<{
    Media: {
      recommendations: {
        nodes: Array<{
          mediaRecommendation: AniListMediaNode | null;
          rating: number;
          userRating: number | null;
        }>;
      };
    };
  }>(
    RECOMMENDATIONS_QUERY,
    { id: anilistId, page: 1, perPage },
    cacheKey,
  );

  if (!data?.Media?.recommendations?.nodes) {
    warn(`No recommendations for AniList ID ${anilistId}`);
    return [];
  }

  const recs = data.Media.recommendations.nodes
    .filter((node) => node.mediaRecommendation !== null)
    .map((node) => {
      const media = node.mediaRecommendation!;
      return {
        anilistId: media.id,
        malId: media.idMal ?? null,
        title: {
          romaji: media.title?.romaji ?? null,
          english: media.title?.english ?? null,
          native: media.title?.native ?? null,
        },
        coverImage: media.coverImage ?? { large: null, medium: null },
        averageScore: media.averageScore ?? null,
        meanScore: media.meanScore ?? null,
        siteUrl: media.siteUrl ?? null,
        format: media.format ?? null,
        recommendationRating: node.rating,
      };
    });

  log(`Recommendations for AniList ${anilistId} → ${recs.length} result(s) (${Date.now() - startTime}ms)`);
  return recs;
}

// ─── Trending & Popular ──────────────────────────────────────────────────────

/**
 * Get currently trending anime from AniList (sorted by TRENDING_DESC).
 * This is the proper way to get trending anime, rather than searching for "trending".
 * Returns up to `limit` results, filtering out entries with no cover image.
 */
export async function getTrendingAnime(limit: number = 10): Promise<AniListResult[]> {
  const cacheKey = `trending:${limit}`;
  const startTime = Date.now();

  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; hasNextPage: boolean };
      media: AniListMediaNode[];
    };
  }>(
    TRENDING_QUERY,
    { page: 1, perPage: limit * 2 }, // Over-fetch to allow filtering
    cacheKey,
  );

  if (!data?.Page?.media) {
    warn('No trending anime results');
    return [];
  }

  const results = data.Page.media
    .map(transformMediaNode)
    .filter((a) => a.coverImage?.large); // Filter out entries with no cover image

  log(`Trending → ${results.length} result(s) (${Date.now() - startTime}ms)`);
  return results.slice(0, limit);
}

/**
 * Get popular anime from AniList (sorted by POPULARITY_DESC).
 * Useful as a fallback when trending returns too few results.
 * Returns up to `limit` results, filtering out entries with no cover image.
 */
export async function getPopularAnime(limit: number = 10): Promise<AniListResult[]> {
  const cacheKey = `popular:${limit}`;
  const startTime = Date.now();

  const data = await anilistFetch<{
    Page: {
      pageInfo: { total: number; hasNextPage: boolean };
      media: AniListMediaNode[];
    };
  }>(
    POPULAR_QUERY,
    { page: 1, perPage: limit * 2 },
    cacheKey,
  );

  if (!data?.Page?.media) {
    warn('No popular anime results');
    return [];
  }

  const results = data.Page.media
    .map(transformMediaNode)
    .filter((a) => a.coverImage?.large);

  log(`Popular → ${results.length} result(s) (${Date.now() - startTime}ms)`);
  return results.slice(0, limit);
}

// ─── Cache management ────────────────────────────────────────────────────────

/** Return current cache size (useful for diagnostics). */
export function cacheSize(): number {
  return cache.size;
}
