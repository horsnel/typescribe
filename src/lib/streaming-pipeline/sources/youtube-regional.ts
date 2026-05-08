/**
 * YouTube Regional Free Movies Source
 *
 * Fetches free full movies from YouTube channels specific to different countries.
 * Extends the base YouTube source with region-specific channel lists and queries.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL = 12 * 60 * 60 * 1000;

// Region-specific search configurations
const REGIONAL_CONFIGS = [
  {
    code: 'KR',
    name: 'Korean',
    queries: ['korean full movie eng sub', 'korean drama full episode free', 'k-movie english subtitles'],
    channels: {
      'KBS World': 'UC4iVeRclR1SyU_n-viK-bBw',
      'Kocowa': 'UCwkqeMmMjv0CBqSFQX4JEaQ',
    },
  },
  {
    code: 'IN',
    name: 'Indian',
    queries: ['bollywood full movie free', 'hindi full movie', 'tamil full movie free', 'telugu full movie free'],
    channels: {
      'Goldmines': 'UC5Q7wJ-F1TsbJ3xtsGhImDA',
      'Shemaroo Movies': 'UCUOY5FOw0TNXvdR6VmhtIgw',
      'BWF Hindi': 'UCbTLnANhCTnYiMBYlAe6v5Q',
    },
  },
  {
    code: 'CN',
    name: 'Chinese',
    queries: ['chinese full movie eng sub', 'c-drama full episode free', 'chinese action movie english'],
    channels: {
      'Youku': 'UCeBqRFTMD3jZnlNdMg4RnBw',
    },
  },
  {
    code: 'NG',
    name: 'Nigerian',
    queries: ['nollywood full movie free', 'nigerian movie full', 'african movie full'],
    channels: {
      'Nollywood Reinvented': 'UCGLNQdaUgQz5mMqK3RYgYxg',
      'Yorubahood': 'UCNRfLr0mljU7yMDwKQKzMAg',
      'Nollywood Picture': 'UC2njFmy2gUNbhXjJ5anP3_w',
    },
  },
  {
    code: 'JP',
    name: 'Japanese',
    queries: ['japanese full movie eng sub', 'j-movie free', 'japanese drama english subtitles'],
    channels: {
      'TMS Entertainment': 'UCIvSmmqaJM0uRc2Kc1MbNzg',
    },
  },
  {
    code: 'TH',
    name: 'Thai',
    queries: ['thai full movie eng sub', 'thai drama full episode free', 'thai horror movie english'],
    channels: {},
  },
  {
    code: 'TR',
    name: 'Turkish',
    queries: ['turkish drama full episode english', 'turkish movie eng sub free'],
    channels: {},
  },
  {
    code: 'US',
    name: 'American',
    queries: ['full movie free', 'public domain movie', 'free classic movie'],
    channels: {
      'Popcornflix': 'UCbym7JHtbE2z8g7QSmO4k0g',
      'Movie Central': 'UCRkB0mQBD3hfpRq8ffPagqA',
    },
  },
  {
    code: 'PH',
    name: 'Filipino',
    queries: ['filipino full movie free', 'pinoy movie full', 'teleserye full episode'],
    channels: {
      'ABS-CBN Entertainment': 'UC3ibM1mmdJOVWp3sW_p5D0g',
      'GMA Network': 'UCEd1Q3fNzQ6VwHQXRqYbfNA',
    },
  },
  {
    code: 'BR',
    name: 'Brazilian',
    queries: ['filme completo dublado', 'filme brasileiro completo', 'cinema brasileiro gratis'],
    channels: {},
  },
  {
    code: 'MX',
    name: 'Mexican',
    queries: ['pelicula completa gratis', 'pelicula mexicana completa', 'telenovela completa'],
    channels: {},
  },
];

interface YouTubeSearchResult {
  id: { kind: string; videoId?: string };
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
  error?: { message: string };
}

interface YouTubeVideoItem {
  id: string;
  snippet: { title: string; description: string; channelTitle: string; publishedAt: string };
  contentDetails: { duration: string };
}

interface YouTubeVideoResponse {
  items: YouTubeVideoItem[];
  error?: { message: string };
}

function getApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
}

function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0', 10) * 3600 + parseInt(match[2] || '0', 10) * 60 + parseInt(match[3] || '0', 10);
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Unknown';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[\(\[](?:Full Movie|Free|HD|4K|1080p|720p|Eng Sub|English Sub)[\)\]]\s*/gi, '')
    .replace(/\s*[-–|]\s*(?:Full Movie|Free Movie|Watch Free|English Subtitle).*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractYear(title: string): number {
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1], 10) : 0;
}

function detectQuality(title: string): StreamableMovie['quality'] {
  const lower = title.toLowerCase();
  if (lower.includes('4k') || lower.includes('uhd')) return '4K';
  if (lower.includes('1080p') || lower.includes('full hd')) return '1080p';
  if (lower.includes('720p') || lower.includes('hd')) return '720p';
  return 'Unknown';
}

// Language map per region
const REGION_LANGUAGES: Record<string, { code: string; label: string }> = {
  'KR': { code: 'ko', label: 'Korean (Original)' },
  'IN': { code: 'hi', label: 'Hindi (Original)' },
  'CN': { code: 'zh', label: 'Chinese (Original)' },
  'NG': { code: 'en', label: 'English (Original)' },
  'JP': { code: 'ja', label: 'Japanese (Original)' },
  'TH': { code: 'th', label: 'Thai (Original)' },
  'TR': { code: 'tr', label: 'Turkish (Original)' },
  'US': { code: 'en', label: 'English (Original)' },
  'PH': { code: 'fil', label: 'Filipino (Original)' },
  'BR': { code: 'pt', label: 'Portuguese (Original)' },
  'MX': { code: 'es', label: 'Spanish (Original)' },
};

function toStreamableMovie(
  videoId: string, title: string, description: string, channelTitle: string,
  publishedAt: string, thumbnails: YouTubeSearchResult['snippet']['thumbnails'],
  durationSeconds: number, regionCode: string,
): StreamableMovie {
  const regionName = REGIONAL_CONFIGS.find(r => r.code === regionCode)?.name || regionCode;
  const langInfo = REGION_LANGUAGES[regionCode] || { code: 'en', label: `${regionName} (Original)` };
  const is4K = detectQuality(title) === '4K';
  const poster = thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? '';
  
  const languages: AudioLanguage[] = [
    { code: langInfo.code, label: langInfo.label, isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
  ];
  if (langInfo.code !== 'en') {
    languages.push({ code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' });
  }
  
  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];
  if (langInfo.code !== 'en') {
    subtitles.push({ code: langInfo.code, label: langInfo.label.split(' (')[0], isDefault: false });
  }
  
  // Detect genre from title/description
  const genres: string[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  if (lowerTitle.includes('drama') || lowerDesc.includes('drama')) genres.push('Drama');
  if (lowerTitle.includes('action') || lowerDesc.includes('action')) genres.push('Action');
  if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy')) genres.push('Comedy');
  if (lowerTitle.includes('horror') || lowerDesc.includes('horror')) genres.push('Horror');
  if (lowerTitle.includes('romance') || lowerDesc.includes('romance') || lowerTitle.includes('romantic')) genres.push('Romance');
  if (lowerTitle.includes('thriller') || lowerDesc.includes('thriller')) genres.push('Thriller');
  if (genres.length === 0) genres.push(regionName);
  
  return {
    id: `yt-${regionCode.toLowerCase()}-${videoId}`,
    title: cleanTitle(title),
    description: description.slice(0, 500),
    year: extractYear(title) || new Date(publishedAt).getFullYear(),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    genres,
    rating: 0,
    quality: detectQuality(title),
    poster,
    backdrop: poster,
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

/**
 * Fetch free regional movies from YouTube.
 */
export async function fetchYouTubeRegionalMovies(regionCode?: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-yt-regional${regionCode ? `-${regionCode}` : ''}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;
  
  const apiKey = getApiKey();
  if (!apiKey) return [];
  
  const configs = regionCode
    ? REGIONAL_CONFIGS.filter(r => r.code === regionCode)
    : REGIONAL_CONFIGS;
  
  const allMovies: StreamableMovie[] = [];
  const seenIds = new Set<string>();
  
  for (const config of configs) {
    // Search using regional queries
    for (const query of config.queries.slice(0, 2)) { // Limit to 2 queries per region
      try {
        const qs = new URLSearchParams({
          key: apiKey,
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '1',
          maxResults: '8',
          videoDuration: 'long',
          videoEmbeddable: 'true',
        }).toString();
        
        const res = await fetchWithTimeout(`${BASE_URL}/search?${qs}`, undefined, 10_000);
        if (!res?.ok) continue;
        
        const data = await safeJsonParse<YouTubeSearchResponse>(res);
        if (!data?.items?.length) continue;
        
        // Get video durations
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
          if (durationSeconds < 40 * 60) continue; // Filter for actual movies
          
          const videoId = video.id;
          if (seenIds.has(videoId)) continue;
          seenIds.add(videoId);
          
          allMovies.push(toStreamableMovie(
            videoId,
            video.snippet.title,
            video.snippet.description,
            video.snippet.channelTitle,
            video.snippet.publishedAt,
            data.items.find(i => i.id.videoId === videoId)?.snippet.thumbnails ?? {},
            durationSeconds,
            config.code,
          ));
        }
      } catch (err) {
        console.warn(`[StreamingPipeline:YTRegional] Error for ${config.code}:`, err);
      }
    }
  }
  
  setCached(cacheKey, allMovies, CACHE_TTL);
  return allMovies;
}

/**
 * Get the list of regional configs (for building categories).
 */
export function getRegionalConfigs() {
  return REGIONAL_CONFIGS;
}
