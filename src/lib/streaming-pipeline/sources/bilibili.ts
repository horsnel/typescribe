/**
 * Bilibili Free Anime/Animation Source
 *
 * Fetches free anime and animation from Bilibili's public API.
 * Bilibili has an embeddable player! Entries use videoType: 'bilibili'
 * with real Bilibili video IDs (bvids) that play in our iframe-based
 * video player using Bilibili's official embed URL.
 *
 * API: https://api.bilibili.com/x/web-interface/ (public, no key needed)
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const BILIBILI_API = 'https://api.bilibili.com/x/web-interface';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const SEARCH_QUERIES = [
  'anime movie',
  '动画电影',
  'anime episode',
  '动漫',
  'studio ghibli',
  '日本动漫',
  '经典动画',
  'gundam anime',
  'sailor moon anime',
  'dragon ball anime',
  'astro boy anime',
  'anime english dub',
  'anime full movie',
  '机器人动画',
];

// ─── Internal Types ─────────────────────────────────────────────────────────

interface BilibiliSearchResult {
  type?: string;
  bvid?: string;
  aid?: number;
  title?: string;
  description?: string;
  author?: string;
  duration?: string; // "10:30" or "1:02:30"
  pic?: string;
  tag?: string;
  pubdate?: number;
  play?: number;
  video_review?: number;
}

interface BilibiliSearchResponse {
  data?: {
    result?: BilibiliSearchResult[];
    numResults?: number;
  };
  code?: number;
  message?: string;
}

interface BilibiliPopularItem {
  bvid?: string;
  aid?: number;
  title?: string;
  desc?: string;
  owner?: {
    name?: string;
  };
  duration?: number; // seconds
  pic?: string;
  tag?: string;
  pubdate?: number;
  stat?: {
    view?: number;
    danmaku?: number;
  };
  tname?: string; // sub-channel name
}

interface BilibiliPopularResponse {
  data?: {
    item?: BilibiliPopularItem[];
  };
  code?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse Bilibili duration string like "10:30" or "1:02:30" to seconds.
 */
function parseDuration(duration: string | number | undefined): number {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;

  const parts = String(duration).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Unknown';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const min = Math.floor(totalSeconds / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${min}m`;
}

/**
 * Clean HTML entities from Bilibili titles.
 */
function cleanTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extract genres from tags.
 */
function extractGenres(tag: string | undefined, tname: string | undefined): string[] {
  const genres: string[] = [];
  const isAnimeRelated = (s: string) =>
    s.toLowerCase().includes('anime') ||
    s.toLowerCase().includes('动画') ||
    s.toLowerCase().includes('动漫') ||
    s.toLowerCase().includes('anime') ||
    s.toLowerCase().includes('ghibli');

  if (tname) genres.push(tname);
  if (tag) {
    const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
    for (const t of tags) {
      if (!genres.includes(t)) genres.push(t);
    }
  }
  // Ensure anime tag if search query was anime
  if (!genres.some(isAnimeRelated)) {
    genres.push('Anime');
  }
  return genres.slice(0, 5);
}

function toStreamableMovie(
  bvid: string,
  title: string,
  description: string,
  durationSeconds: number,
  poster: string,
  genres: string[],
  pubdate: number,
): StreamableMovie {
  const watchUrl = `https://www.bilibili.com/video/${bvid}`;
  const embedUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&high_quality=1`;

  return {
    id: `bilibili-${bvid}`,
    title: cleanTitle(title),
    description: description.slice(0, 500),
    year: pubdate > 0 ? new Date(pubdate * 1000).getFullYear() : 0,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    genres,
    rating: 0, // Bilibili doesn't provide a 1-10 rating in search results
    quality: durationSeconds > 0 ? '720p' : 'Unknown',
    poster,
    backdrop: poster,
    source: 'bilibili',
    sourceUrl: watchUrl,
    sourceLicense: 'Free to Watch',
    videoUrl: watchUrl,
    videoType: 'bilibili',
    embedUrl,
    isEmbeddable: true,
    languages: [
      { code: 'ja', label: 'Japanese (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
      { code: 'zh', label: 'Chinese (Subtitled)', isOriginal: false, isDubbed: false, audioFormat: 'Stereo' },
    ],
    subtitles: [
      { code: 'zh', label: 'Chinese', isDefault: true },
      { code: 'en', label: 'English', isDefault: false },
    ],
    is4K: false,
    isFree: true,
    addedAt: pubdate > 0 ? new Date(pubdate * 1000).toISOString() : new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch anime/animation from Bilibili using their public search API.
 */
export async function fetchBilibiliMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-bilibili-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];
  const seenBvids = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `${BILIBILI_API}/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1&page_size=20`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.bilibili.com/',
        },
      }, 8_000);

      if (!res?.ok) continue;

      const data = await safeJsonParse<BilibiliSearchResponse>(res);
      if (data?.code !== 0 || !data?.data?.result) continue;

      for (const item of data.data.result) {
        if (!item.bvid || seenBvids.has(item.bvid)) continue;
        if (item.type === 'video_review') continue; // Skip review videos

        seenBvids.add(item.bvid);

        const durationSeconds = parseDuration(item.duration);
        // Skip very short clips (< 5 min) — keep actual episodes/movies
        if (durationSeconds > 0 && durationSeconds < 300) continue;

        movies.push(toStreamableMovie(
          item.bvid,
          item.title ?? 'Untitled',
          item.description ?? 'Anime content from Bilibili.',
          durationSeconds,
          item.pic ?? '',
          extractGenres(item.tag, undefined),
          item.pubdate ?? 0,
        ));
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:Bilibili] Error fetching query "${query}":`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search Bilibili for anime matching a query.
 */
export async function searchBilibiliMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-bilibili-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BILIBILI_API}/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1&page_size=20`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com/',
      },
    }, 8_000);

    if (!res?.ok) return [];

    const data = await safeJsonParse<BilibiliSearchResponse>(res);
    if (data?.code !== 0 || !data?.data?.result) return [];

    const movies = data.data.result
      .filter(item => item.bvid)
      .map(item => toStreamableMovie(
        item.bvid!,
        item.title ?? 'Untitled',
        item.description ?? 'Anime content from Bilibili.',
        parseDuration(item.duration),
        item.pic ?? '',
        extractGenres(item.tag, undefined),
        item.pubdate ?? 0,
      ));

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Bilibili] Search error:', err);
    return [];
  }
}
