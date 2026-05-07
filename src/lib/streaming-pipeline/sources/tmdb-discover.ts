/**
 * TMDb Country-Based Discovery Source
 *
 * Discovers movies from specific countries using TMDb's discover API.
 * Filters for movies that have free watch providers (YouTube, Tubi, Crackle, Pluto TV).
 * Creates country-specific and genre-specific categories for the streaming catalog.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// Cache TTL - 12 hours for discovered movies
const CACHE_TTL = 12 * 60 * 60 * 1000;

// TMDb configuration
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';

// Country configurations for diverse content
const COUNTRY_CONFIGS = [
  { code: 'KR', name: 'Korea', genreLabel: 'K-Drama & K-Movies', keywords: ['korean', 'k-drama'] },
  { code: 'US', name: 'United States', genreLabel: 'American Movies', keywords: ['american', 'hollywood'] },
  { code: 'IN', name: 'India', genreLabel: 'Bollywood', keywords: ['bollywood', 'hindi', 'indian'] },
  { code: 'CN', name: 'China', genreLabel: 'Chinese Movies', keywords: ['chinese', 'c-drama'] },
  { code: 'NG', name: 'Nigeria', genreLabel: 'Nollywood', keywords: ['nollywood', 'nigerian'] },
  { code: 'JP', name: 'Japan', genreLabel: 'Japanese Movies', keywords: ['japanese', 'j-movie'] },
  { code: 'GB', name: 'United Kingdom', genreLabel: 'British Movies', keywords: ['british', 'uk'] },
  { code: 'TH', name: 'Thailand', genreLabel: 'Thai Movies', keywords: ['thai', 'thai drama'] },
  { code: 'TR', name: 'Turkey', genreLabel: 'Turkish Dramas', keywords: ['turkish', 'dizi'] },
  { code: 'BR', name: 'Brazil', genreLabel: 'Brazilian Movies', keywords: ['brazilian'] },
  { code: 'MX', name: 'Mexico', genreLabel: 'Mexican Cinema', keywords: ['mexican', 'telenovela'] },
  { code: 'FR', name: 'France', genreLabel: 'French Cinema', keywords: ['french'] },
  { code: 'PH', name: 'Philippines', genreLabel: 'Filipino Movies', keywords: ['filipino', 'pinoy'] },
  { code: 'ZA', name: 'South Africa', genreLabel: 'South African Movies', keywords: ['south african'] },
];

// Free watch provider IDs on TMDb (these platforms offer free ad-supported streaming)
const FREE_PROVIDER_IDS = [
  1828,  // YouTube Premium (free movies)
  337,   // Tubi TV
  409,   // Crackle
  543,   // Pluto TV
  419,   // The Roku Channel
  446,   // Plex
  434,   // Freevee (IMDb TV)
  564,   // VIX
  596,   // Amazon Freevee
  456,   // Peacock Free
];

// Genre mappings
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY;
}

// TMDb movie result type
interface TMDbMovieResult {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  origin_country?: string[];
  runtime?: number;
}

interface TMDbDiscoverResponse {
  results: TMDbMovieResult[];
  total_results?: number;
  total_pages?: number;
}

interface TMDbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

interface TMDbWatchProvidersResponse {
  id: number;
  results?: Record<string, {
    link?: string;
    flatrate?: TMDbWatchProvider[];
    free?: TMDbWatchProvider[];
    ads?: TMDbWatchProvider[];
  }>;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Unknown';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

function toStreamableMovie(movie: TMDbMovieResult, countryCode: string, countryName: string, isFreeOnPlatform: boolean): StreamableMovie {
  const genres = (movie.genre_ids || []).map(id => GENRE_MAP[id] || 'Unknown').filter(g => g !== 'Unknown');
  const poster = movie.poster_path ? `${TMDB_IMAGE}/w500${movie.poster_path}` : '';
  const backdrop = movie.backdrop_path ? `${TMDB_IMAGE}/w1280${movie.backdrop_path}` : poster;
  const year = movie.release_date ? parseInt(movie.release_date.split('-')[0], 10) : 0;
  const runtime = movie.runtime || 0;
  
  // Build language tracks based on country
  const languages: AudioLanguage[] = [];
  const langMap: Record<string, { code: string; label: string }> = {
    'KR': { code: 'ko', label: 'Korean (Original)' },
    'US': { code: 'en', label: 'English (Original)' },
    'IN': { code: 'hi', label: 'Hindi (Original)' },
    'CN': { code: 'zh', label: 'Chinese (Original)' },
    'NG': { code: 'en', label: 'English (Original)' },
    'JP': { code: 'ja', label: 'Japanese (Original)' },
    'GB': { code: 'en', label: 'English (Original)' },
    'TH': { code: 'th', label: 'Thai (Original)' },
    'TR': { code: 'tr', label: 'Turkish (Original)' },
    'BR': { code: 'pt', label: 'Portuguese (Original)' },
    'MX': { code: 'es', label: 'Spanish (Original)' },
    'FR': { code: 'fr', label: 'French (Original)' },
    'PH': { code: 'fil', label: 'Filipino (Original)' },
    'ZA': { code: 'en', label: 'English (Original)' },
  };
  
  const langInfo = langMap[countryCode] || { code: movie.original_language || 'en', label: `${countryName} (Original)` };
  languages.push({ code: langInfo.code, label: langInfo.label, isOriginal: true, isDubbed: false, audioFormat: 'Stereo' });
  
  // Add English dubbed option for non-English content
  if (langInfo.code !== 'en') {
    languages.push({ code: 'en', label: 'English (Dubbed)', isOriginal: false, isDubbed: true, audioFormat: 'Stereo' });
  }
  
  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];
  if (langInfo.code !== 'en') {
    subtitles.push({ code: langInfo.code, label: langInfo.label.split(' (')[0], isDefault: false });
  }
  
  return {
    id: `tmdb-${countryCode.toLowerCase()}-${movie.id}`,
    title: movie.title,
    description: (movie.overview || `A ${countryName.toLowerCase()} film.`).slice(0, 500),
    year,
    duration: formatDuration(runtime),
    durationSeconds: runtime * 60,
    genres,
    rating: Math.round((movie.vote_average || 0) * 10) / 10,
    quality: '1080p',
    poster,
    backdrop,
    source: 'tmdb-discover',
    sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    sourceLicense: isFreeOnPlatform ? 'Free to Watch (Ad-Supported)' : 'Check Streaming Availability',
    videoUrl: `https://www.themoviedb.org/movie/${movie.id}/watch`,
    videoType: 'embed',
    languages,
    subtitles,
    is4K: false,
    isFree: isFreeOnPlatform,
    country: countryCode,
    addedAt: new Date().toISOString(),
  };
}

/**
 * Discover movies from a specific country via TMDb.
 * Returns movies sorted by popularity.
 */
export async function discoverMoviesByCountry(countryCode: string, page: number = 1): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-tmdb-country-${countryCode}-${page}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;
  
  const apiKey = getApiKey();
  if (!apiKey) return [];
  
  const config = COUNTRY_CONFIGS.find(c => c.code === countryCode);
  const countryName = config?.name || countryCode;
  
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      sort_by: 'popularity.desc',
      'vote_count.gte': '20',
      'with_origin_country': countryCode,
      page: String(page),
    }).toString();
    
    const res = await fetchWithTimeout(`${TMDB_BASE}/discover/movie?${params}`, undefined, 15_000);
    if (!res?.ok) return [];
    
    const data = await safeJsonParse<TMDbDiscoverResponse>(res);
    if (!data?.results?.length) return [];
    
    const movies = data.results
      .filter(m => (m.vote_average ?? 0) > 0 && m.poster_path)
      .slice(0, 20)
      .map(m => toStreamableMovie(m, countryCode, countryName, false));
    
    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn(`[StreamingPipeline:TMDbDiscover] Error discovering ${countryCode} movies:`, err);
    return [];
  }
}

/**
 * Discover movies from ALL configured countries.
 * Returns deduplicated movies grouped by country.
 */
export async function discoverAllCountries(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-tmdb-all-countries';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;
  
  const allMovies: StreamableMovie[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];
  
  // Fetch from all countries in parallel (batches of 5 to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < COUNTRY_CONFIGS.length; i += batchSize) {
    const batch = COUNTRY_CONFIGS.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(config => discoverMoviesByCountry(config.code))
    );
    
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        for (const movie of result.value) {
          if (!seenIds.has(movie.id)) {
            allMovies.push(movie);
            seenIds.add(movie.id);
          }
        }
      } else {
        errors.push(`${batch[j].code}: ${result.reason}`);
      }
    }
  }
  
  if (errors.length > 0) {
    console.warn('[StreamingPipeline:TMDbDiscover] Country discovery errors:', errors.join('; '));
  }
  
  setCached(cacheKey, allMovies, CACHE_TTL);
  return allMovies;
}

/**
 * Get the list of country configurations (for building categories).
 */
export function getCountryConfigs() {
  return COUNTRY_CONFIGS;
}

/**
 * Search for movies from a specific country.
 */
export async function searchByCountry(countryCode: string, query: string): Promise<StreamableMovie[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  
  const config = COUNTRY_CONFIGS.find(c => c.code === countryCode);
  const countryName = config?.name || countryCode;
  
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query,
      'with_origin_country': countryCode,
      page: '1',
    }).toString();
    
    const res = await fetchWithTimeout(`${TMDB_BASE}/search/movie?${params}`, undefined, 10_000);
    if (!res?.ok) return [];
    
    const data = await safeJsonParse<TMDbDiscoverResponse>(res);
    if (!data?.results?.length) return [];
    
    return data.results
      .filter(m => (m.vote_average ?? 0) > 0 && m.poster_path)
      .slice(0, 10)
      .map(m => toStreamableMovie(m, countryCode, countryName, false));
  } catch (err) {
    console.warn(`[StreamingPipeline:TMDbDiscover] Search error for ${countryCode}:`, err);
    return [];
  }
}
