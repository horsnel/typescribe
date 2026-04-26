/**
 * TVMaze API Client — Where to Watch
 *
 * Free API, no key required. Used for fetching streaming/network info.
 * All calls are client-side to keep API route usage at ~10%.
 *
 * Endpoints used:
 *   GET /search/shows?q={query}  → search shows by name
 *   GET /shows/{id}              → show details
 *   GET /shows/{id}/akas         → also known as (country info)
 */

// ─── Types ───

export interface TVMazeShow {
  id: number;
  name: string;
  url: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  schedule: { time: string; days: string[] };
  rating: { average: number | null };
  weight: number;
  network: TVMazeNetwork | null;
  webChannel: TVMazeWebChannel | null;
  image: { medium: string; original: string } | null;
  summary: string | null;
  updated: number;
  _links: { self: { href: string }; previousepisode?: { href: string } };
}

export interface TVMazeNetwork {
  id: number;
  name: string;
  country: {
    name: string;
    code: string;
    timezone: string;
  } | null;
}

export interface TVMazeWebChannel {
  id: number;
  name: string;
  country: {
    name: string;
    code: string;
    timezone: string;
  } | null;
}

export interface TVMazeSearchResult {
  score: number;
  show: TVMazeShow;
}

export interface StreamingOption {
  platform: string;
  type: 'network' | 'streaming' | 'official';
  url: string | null;
  country: string;
}

export interface WhereToWatchResult {
  showId: number;
  showName: string;
  showUrl: string;
  network: { name: string; country: string; code: string } | null;
  webChannel: { name: string; country: string } | null;
  officialSite: string | null;
  streamingOptions: StreamingOption[];
  image: string | null;
}

// ─── API Functions (all client-side) ───

const TVMAZE_BASE = 'https://api.tvmaze.com';

/**
 * Search for TV shows by name. Free, no API key.
 * Call directly from the browser.
 */
export async function searchShows(query: string): Promise<TVMazeSearchResult[]> {
  try {
    const res = await fetch(
      `${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Get full show details by TVMaze ID.
 */
export async function getShowDetails(showId: number): Promise<TVMazeShow | null> {
  try {
    const res = await fetch(
      `${TVMAZE_BASE}/shows/${showId}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get "where to watch" information for a show by its name.
 * Searches TVMaze, picks the best match, then extracts network/streaming info.
 * Runs entirely client-side.
 */
export async function getWhereToWatch(showName: string): Promise<WhereToWatchResult | null> {
  const results = await searchShows(showName);
  if (results.length === 0) return null;

  // Pick the best-scoring result
  const best = results[0].show;

  return extractWhereToWatch(best);
}

/**
 * Extract where-to-watch info from a TVMaze show object.
 */
export function extractWhereToWatch(show: TVMazeShow): WhereToWatchResult {
  const streamingOptions: StreamingOption[] = [];

  // Network (traditional TV)
  if (show.network) {
    streamingOptions.push({
      platform: show.network.name,
      type: 'network',
      url: show.officialSite || show.url,
      country: show.network.country?.name || 'Unknown',
    });
  }

  // Web channel (streaming service like Netflix, Prime, Hulu, etc.)
  if (show.webChannel) {
    streamingOptions.push({
      platform: show.webChannel.name,
      type: 'streaming',
      url: show.officialSite || show.url,
      country: show.webChannel.country?.name || 'Global',
    });
  }

  // Official site
  if (show.officialSite && !streamingOptions.some(s => s.url === show.officialSite)) {
    streamingOptions.push({
      platform: new URL(show.officialSite).hostname.replace('www.', ''),
      type: 'official',
      url: show.officialSite,
      country: 'Global',
    });
  }

  return {
    showId: show.id,
    showName: show.name,
    showUrl: show.url,
    network: show.network
      ? { name: show.network.name, country: show.network.country?.name || 'Unknown', code: show.network.country?.code || '' }
      : null,
    webChannel: show.webChannel
      ? { name: show.webChannel.name, country: show.webChannel.country?.name || 'Global' }
      : null,
    officialSite: show.officialSite,
    streamingOptions,
    image: show.image?.medium || null,
  };
}

/**
 * Batch search: given a movie title, find the TV show equivalent
 * and return streaming info. Useful for movies that became TV series.
 */
export async function searchWhereToWatch(query: string): Promise<WhereToWatchResult[]> {
  const results = await searchShows(query);
  return results.slice(0, 5).map(r => extractWhereToWatch(r.show));
}
