/**
 * YouTube Free Movies Source
 *
 * Fetches free, ad-supported full movies from YouTube.
 * Uses the YouTube Data API v3 to search for free full movies on
 * official channels like YouTube Movies, Popcornflix, Maverick Movies, etc.
 *
 * Only shared import: fetchWithTimeout from resilience utilities.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Known free movie channels on YouTube (channel IDs for featured content).
 */
const FREE_MOVIE_CHANNELS: Record<string, string> = {
  'YouTube Movies': 'UCuVPqsHJi4e4eMlZsaWaaLg',
  'Movie Central': 'UCRkB0mQBD3hfpRq8ffPagqA',
  'Popcornflix': 'UCbym7JHtbE2z8g7QSmO4k0g',
  'Maverick Movies': 'UCkRqw9lE3J3fnbdMB5RMPRg',
  'Timeless Classic Movies': 'UCFzIDCuLbpJWhw5O3hxiF-A',
  'Kino Lorber': 'UC5HZ5hF9SXHKDhjJPM1n4ew',
  'FilmRise Movies': 'UCsQB0H0R3q9w34vq6R0T8qw',
};

// ─── Internal Types ─────────────────────────────────────────────────────────

interface YouTubeSearchResult {
  id: {
    kind: string;
    videoId?: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchResult[];
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
  error?: {
    message: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 duration (e.g. "PT1H42M")
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
  };
}

interface YouTubeVideoResponse {
  items: YouTubeVideoItem[];
  error?: {
    message: string;
  };
}

// ─── API Key ─────────────────────────────────────────────────────────────────

function getApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
}

// ─── Duration Parsing ────────────────────────────────────────────────────────

/**
 * Parse ISO 8601 duration (e.g. "PT1H42M30S") to seconds.
 */
function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to human-readable duration (e.g. "1h 42m").
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Unknown';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// ─── Title Cleaning ─────────────────────────────────────────────────────────

/**
 * Clean a YouTube video title to extract the movie title.
 * Strips common suffixes like "Full Movie", "Free", etc.
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[\(\[](?:Full Movie|Free|HD|4K|1080p|720p)[\)\]]\s*/gi, '')
    .replace(/\s*[-–|]\s*(?:Full Movie|Free Movie|Watch Free).*$/gi, '')
    .replace(/\s+\((\d{4})\)\s*$/, '') // Remove year in parentheses
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extract a year from the video title.
 */
function extractYear(title: string): number {
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

// ─── Quality Detection ──────────────────────────────────────────────────────

function detectQuality(title: string): StreamableMovie['quality'] {
  const lower = title.toLowerCase();
  if (lower.includes('4k') || lower.includes('uhd')) return '4K';
  if (lower.includes('1080p') || lower.includes('full hd') || lower.includes('fhd')) return '1080p';
  if (lower.includes('720p') || lower.includes('hd')) return '720p';
  if (lower.includes('480p') || lower.includes('sd')) return '480p';
  return 'Unknown';
}

// ─── Convert YouTube result to StreamableMovie ──────────────────────────────

function toStreamableMovie(
  videoId: string,
  title: string,
  description: string,
  channelTitle: string,
  publishedAt: string,
  thumbnails: YouTubeSearchResult['snippet']['thumbnails'],
  durationSeconds: number,
): StreamableMovie {
  const is4K = detectQuality(title) === '4K';
  const poster = thumbnails.maxres?.url
    ?? thumbnails.standard?.url
    ?? thumbnails.high?.url
    ?? thumbnails.medium?.url
    ?? thumbnails.default?.url
    ?? '';

  const languages: AudioLanguage[] = [
    { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
  ];

  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];

  return {
    id: `youtube-${videoId}`,
    title: cleanTitle(title),
    description: description.slice(0, 500),
    year: extractYear(title) || new Date(publishedAt).getFullYear(),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    genres: [], // Will be populated by catalog orchestrator
    rating: 0, // YouTube doesn't provide movie ratings
    quality: detectQuality(title),
    poster,
    backdrop: poster, // YouTube doesn't have separate backdrop images
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    sourceLicense: 'Free to Watch (Ad-Supported)',
    videoUrl: `https://www.youtube.com/embed/${videoId}`,
    videoType: 'youtube',
    languages,
    subtitles,
    is4K,
    isFree: true,
    isEmbeddable: true,
    addedAt: publishedAt,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch free movies from YouTube.
 * Searches for full movies with duration > 40 minutes.
 */
export async function fetchYouTubeFreeMovies(category?: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-youtube-movies${category ? `-${category}` : ''}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[StreamingPipeline:YouTube] No API key configured');
    return [];
  }

  const queries = category
    ? [`${category} full movie free`]
    : ['full movie free', 'public domain movie', 'free full movie'];

  const movies: StreamableMovie[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    try {
      const qs = new URLSearchParams({
        key: apiKey,
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '1', // Film & Animation
        maxResults: '15',
        videoDuration: 'long', // > 20 minutes
        videoEmbeddable: 'true',
      }).toString();

      const res = await fetchWithTimeout(`${BASE_URL}/search?${qs}`, undefined, 10_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<YouTubeSearchResponse>(res);
      if (!data?.items?.length) continue;

      // Get video IDs for duration info
      const videoIds = data.items
        .filter(item => item.id.kind === 'youtube#video' && item.id.videoId)
        .map(item => item.id.videoId!)
        .join(',');

      if (!videoIds) continue;

      // Fetch video details (including duration)
      const detailQs = new URLSearchParams({
        key: apiKey,
        part: 'snippet,contentDetails',
        id: videoIds,
      }).toString();

      const detailRes = await fetchWithTimeout(`${BASE_URL}/videos?${detailQs}`, undefined, 10_000);
      if (!detailRes?.ok) continue;

      const detailData = await safeJsonParse<YouTubeVideoResponse>(detailRes);
      if (!detailData?.items?.length) continue;

      for (const video of detailData.items) {
        const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');
        // Filter for actual movies (> 40 minutes)
        if (durationSeconds < 40 * 60) continue;

        if (seenIds.has(video.id)) continue;
        seenIds.add(video.id);

        movies.push(toStreamableMovie(
          video.id,
          video.snippet.title,
          video.snippet.description,
          video.snippet.channelTitle,
          video.snippet.publishedAt,
          data.items.find(i => i.id.videoId === video.id)?.snippet.thumbnails ?? {},
          durationSeconds,
        ));
      }
    } catch (err) {
      console.warn('[StreamingPipeline:YouTube] Error fetching movies:', err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search YouTube for a specific free movie.
 */
export async function searchYouTubeFreeMovie(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-youtube-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const qs = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      q: `${query} full movie`,
      type: 'video',
      videoCategoryId: '1',
      maxResults: '10',
      videoDuration: 'long',
      videoEmbeddable: 'true',
    }).toString();

    const res = await fetchWithTimeout(`${BASE_URL}/search?${qs}`, undefined, 10_000);
    if (!res?.ok) return [];

    const data = await safeJsonParse<YouTubeSearchResponse>(res);
    if (!data?.items?.length) return [];

    // Fetch details
    const videoIds = data.items
      .filter(item => item.id.kind === 'youtube#video' && item.id.videoId)
      .map(item => item.id.videoId!)
      .join(',');

    if (!videoIds) return [];

    const detailQs = new URLSearchParams({
      key: apiKey,
      part: 'snippet,contentDetails',
      id: videoIds,
    }).toString();

    const detailRes = await fetchWithTimeout(`${BASE_URL}/videos?${detailQs}`, undefined, 10_000);
    if (!detailRes?.ok) return [];

    const detailData = await safeJsonParse<YouTubeVideoResponse>(detailRes);
    if (!detailData?.items?.length) return [];

    const movies: StreamableMovie[] = detailData.items
      .filter(video => {
        const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');
        return durationSeconds >= 40 * 60;
      })
      .map(video => {
        const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');
        const searchItem = data.items.find(i => i.id.videoId === video.id);
        return toStreamableMovie(
          video.id,
          video.snippet.title,
          video.snippet.description,
          video.snippet.channelTitle,
          video.snippet.publishedAt,
          searchItem?.snippet.thumbnails ?? {},
          durationSeconds,
        );
      });

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:YouTube] Search error:', err);
    return [];
  }
}

/**
 * Get details for a specific YouTube movie by video ID.
 */
export async function getYouTubeMovieDetails(videoId: string): Promise<StreamableMovie | null> {
  const cacheKey = `streaming-youtube-video:${videoId}`;
  const cached = getCached<StreamableMovie>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const qs = new URLSearchParams({
      key: apiKey,
      part: 'snippet,contentDetails,statistics',
      id: videoId,
    }).toString();

    const res = await fetchWithTimeout(`${BASE_URL}/videos?${qs}`, undefined, 10_000);
    if (!res?.ok) return null;

    const data = await safeJsonParse<YouTubeVideoResponse>(res);
    if (!data?.items?.length) return null;

    const video = data.items[0];
    const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');

    const movie = toStreamableMovie(
      video.id,
      video.snippet.title,
      video.snippet.description,
      video.snippet.channelTitle,
      video.snippet.publishedAt,
      {}, // No search thumbnails available for direct video lookup
      durationSeconds,
    );

    setCached(cacheKey, movie, CACHE_TTL);
    return movie;
  } catch (err) {
    console.warn('[StreamingPipeline:YouTube] Video detail error:', err);
    return null;
  }
}

/**
 * Get the list of known free movie channel names (for display purposes).
 */
export function getFreeMovieChannelNames(): string[] {
  return Object.keys(FREE_MOVIE_CHANNELS);
}

/**
 * Fetch anime-specific content from YouTube.
 * Searches for free full anime episodes and movies.
 */
export async function fetchYouTubeAnime(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-youtube-anime';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[StreamingPipeline:YouTube] No API key configured for anime search');
    return [];
  }

  const animeQueries = [
    'anime full movie english',
    'anime movie free',
    'free anime episode english dub',
    'studio ghibli full movie',
    'astro boy full episode',
    'speed racer full episode',
    'gundam full episode',
    'sailor moon full episode',
    'dragon ball full episode',
    'voltron full episode',
    'robotech full episode',
  ];

  const movies: StreamableMovie[] = [];
  const seenIds = new Set<string>();

  for (const query of animeQueries) {
    try {
      const qs = new URLSearchParams({
        key: apiKey,
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '1', // Film & Animation
        maxResults: '10',
        videoDuration: 'long', // > 20 minutes
        videoEmbeddable: 'true',
      }).toString();

      const res = await fetchWithTimeout(`${BASE_URL}/search?${qs}`, undefined, 10_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<YouTubeSearchResponse>(res);
      if (!data?.items?.length) continue;

      const videoIds = data.items
        .filter(item => item.id.kind === 'youtube#video' && item.id.videoId)
        .map(item => item.id.videoId!)
        .join(',');

      if (!videoIds) continue;

      const detailQs = new URLSearchParams({
        key: apiKey,
        part: 'snippet,contentDetails',
        id: videoIds,
      }).toString();

      const detailRes = await fetchWithTimeout(`${BASE_URL}/videos?${detailQs}`, undefined, 10_000);
      if (!detailRes?.ok) continue;

      const detailData = await safeJsonParse<YouTubeVideoResponse>(detailRes);
      if (!detailData?.items?.length) continue;

      for (const video of detailData.items) {
        const durationSeconds = parseIsoDuration(video.contentDetails?.duration || '');
        if (durationSeconds < 15 * 60) continue; // Skip short clips for anime

        if (seenIds.has(video.id)) continue;
        seenIds.add(video.id);

        const movie = toStreamableMovie(
          video.id,
          video.snippet.title,
          video.snippet.description,
          video.snippet.channelTitle,
          video.snippet.publishedAt,
          data.items.find(i => i.id.videoId === video.id)?.snippet.thumbnails ?? {},
          durationSeconds,
        );

        // Ensure Anime genre tag
        if (!movie.genres.some(g => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))) {
          movie.genres.push('Anime');
        }

        movies.push(movie);
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:YouTube] Anime search error for "${query}":`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}
