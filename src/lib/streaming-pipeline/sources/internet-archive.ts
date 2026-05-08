/**
 * Internet Archive Free Movies Source
 *
 * Fetches public domain movies from the Internet Archive.
 * Uses the Archive.org API (free, no key needed).
 *
 * After searching, fetches metadata for each result to find
 * the actual video file name, so the videoUrl points to a
 * playable MP4/WebM file.
 */

import { fetchWithTimeout, safeJsonParse } from '@/lib/pipeline/core/resilience';
import { getCached, setCached } from '../cache';
import type { StreamableMovie, AudioLanguage, SubtitleTrack } from '../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const ARCHIVE_API = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA = 'https://archive.org/metadata';
const ARCHIVE_DOWNLOAD = 'https://archive.org/download';
const ARCHIVE_THUMBNAIL = 'https://archive.org/services/img';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── Collections to search ──────────────────────────────────────────────────

const COLLECTIONS = [
  'feature_films',
  'SciFi_Horror',
  'Film_Noir',
  'Comedy_Films',
  'SciFi_Fantasy',
  'Mystery_and_Detective_Films',
  'Action_and_Adventure_Films',
  'Romance_Films',
  'Western_Films',
  'anime',
  'animationandcartoons',
];

const ANIME_COLLECTIONS = [
  'anime',
  'animationandcartoons',
  'SciFi_Fantasy',
  'japaneseclassicanimation',
];

// Additional anime-specific search queries for broader coverage
const ANIME_SEARCH_QUERIES = [
  'anime',
  '日本アニメ',
  'classic anime',
  'anime full episode',
  'japanese animation',
];

// ─── Internal Types ─────────────────────────────────────────────────────────

interface ArchiveSearchDoc {
  identifier: string;
  title: string;
  description?: string;
  year?: string;
  runtime?: string;
  genre?: string | string[];
  avg_rating?: number;
  downloads?: number;
  collection?: string | string[];
  mediatype?: string;
}

interface ArchiveSearchResponse {
  response?: {
    docs: ArchiveSearchDoc[];
    numFound: number;
  };
  error?: string;
}

interface ArchiveMetadataFile {
  name: string;
  source: string;
  format: string;
  size?: string;
  length?: string;
}

interface ArchiveMetadataResponse {
  metadata?: {
    title?: string;
    description?: string;
    year?: string;
    runtime?: string;
    genre?: string | string[];
    avg_rating?: string | number;
    collection?: string | string[];
  };
  files?: ArchiveMetadataFile[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a runtime string like "1:42:30" or "102 min" to seconds.
 */
function parseRuntime(runtime: string | undefined): number {
  if (!runtime) return 0;

  // Format: "1:42:30" or "42:30"
  const timeMatch = runtime.match(/(\d+):(\d+)(?::(\d+))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Format: "102 min" or "102m"
  const minMatch = runtime.match(/(\d+)\s*(?:min|m)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60;
  }

  return 0;
}

/**
 * Format seconds to human-readable duration.
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

/**
 * Normalize genres from Archive.org data (can be string or string[]).
 */
function normalizeGenres(genre: string | string[] | undefined): string[] {
  if (!genre) return [];
  if (Array.isArray(genre)) {
    return genre.map(g => g.trim()).filter(Boolean);
  }
  return genre.split(/[;,]/).map(g => g.trim()).filter(Boolean);
}

/**
 * Find the best MP4 file in the archive metadata.
 */
function findBestVideoFile(files: ArchiveMetadataFile[]): string | null {
  // Prefer higher quality formats
  const formatPriority = [
    '4K',
    '1080p',
    '720p',
    'h.264',
    'MPEG4',
    '512Kb MPEG4',
    'Ogg Video',
    'h264',
  ];

  for (const format of formatPriority) {
    const file = files.find(f =>
      f.format?.toLowerCase().includes(format.toLowerCase()) &&
      f.name?.toLowerCase().endsWith('.mp4') &&
      f.source === 'original'
    );
    if (file) return file.name;
  }

  // Fallback: any MP4 file
  const mp4 = files.find(f =>
    f.name?.toLowerCase().endsWith('.mp4') &&
    f.source === 'original'
  );
  if (mp4) return mp4.name;

  // Fallback: any video file
  const videoFile = files.find(f => {
    const ext = f.name?.toLowerCase() ?? '';
    return (ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.ogv')) &&
      f.source === 'original';
  });
  return videoFile?.name ?? null;
}

// ─── Convert Archive result to StreamableMovie ──────────────────────────────

function toStreamableMovie(doc: ArchiveSearchDoc, videoFileName?: string): StreamableMovie {
  const durationSeconds = parseRuntime(doc.runtime);
  const genres = normalizeGenres(doc.genre);
  const poster = `${ARCHIVE_THUMBNAIL}/${doc.identifier}`;

  // Build the video URL with the actual video file name if available
  let videoUrl: string;
  if (videoFileName) {
    // Handle subdirectories in the filename (e.g. "Astro Boy 2003 English/01.mp4")
    const encodedFile = videoFileName.split('/').map(part => encodeURIComponent(part)).join('/');
    videoUrl = `${ARCHIVE_DOWNLOAD}/${doc.identifier}/${encodedFile}`;
  } else {
    // Without a specific file, link to the archive details page
    videoUrl = `${ARCHIVE_DOWNLOAD}/${doc.identifier}`;
  }

  const languages: AudioLanguage[] = [
    { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
  ];

  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];

  return {
    id: `archive-${doc.identifier}`,
    title: doc.title?.replace(/\s*\(\d{4}\)\s*$/, '').trim() || doc.identifier,
    description: (doc.description || 'A public domain film from the Internet Archive.').slice(0, 500),
    year: doc.year ? parseInt(doc.year, 10) : 0,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    genres,
    rating: typeof doc.avg_rating === 'number' ? Math.round(doc.avg_rating * 10) / 10 : 0,
    quality: 'Unknown',
    poster,
    backdrop: poster,
    source: 'internet-archive',
    sourceUrl: `https://archive.org/details/${doc.identifier}`,
    sourceLicense: 'Public Domain',
    videoUrl,
    videoType: 'direct',
    isEmbeddable: true,
    languages,
    subtitles,
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Batch detail fetcher ───────────────────────────────────────────────────

/**
 * Fetch video file details for a batch of archive identifiers.
 * Returns a map of identifier -> video file name (or null if not found).
 * Limits concurrency to avoid overwhelming the Archive.org API.
 */
async function batchFetchVideoFiles(identifiers: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();

  // Process in chunks of 5 to avoid overwhelming the API
  const CHUNK_SIZE = 5;
  for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
    const chunk = identifiers.slice(i, i + CHUNK_SIZE);
    const detailPromises = chunk.map(async (identifier) => {
      try {
        const res = await fetchWithTimeout(`${ARCHIVE_METADATA}/${identifier}`, undefined, 15_000);
        if (!res?.ok) {
          result.set(identifier, null);
          return;
        }
        const data = await safeJsonParse<ArchiveMetadataResponse>(res);
        if (data?.files) {
          const videoFile = findBestVideoFile(data.files);
          result.set(identifier, videoFile);
        } else {
          result.set(identifier, null);
        }
      } catch {
        result.set(identifier, null);
      }
    });

    await Promise.allSettled(detailPromises);
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch movies from the Internet Archive.
 * Fetches video file details for each result to build proper play URLs.
 */
export async function fetchArchiveMovies(category?: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-archive-movies${category ? `-${category}` : ''}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];

  const collections = category
    ? [category]
    : COLLECTIONS.slice(0, 3); // Limit to 3 collections by default

  for (const collection of collections) {
    try {
      const params = new URLSearchParams({
        q: `mediatype:movies AND collection:${collection}`,
        fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
        sort: 'downloads desc',
        rows: '20',
        output: 'json',
      }).toString();

      const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 15_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<ArchiveSearchResponse>(res);
      if (!data?.response?.docs?.length) continue;

      // Filter for actual movies (> 30 minutes)
      const validDocs = data.response.docs.filter(doc => {
        const durationSeconds = parseRuntime(doc.runtime);
        return durationSeconds === 0 || durationSeconds >= 30 * 60;
      });

      if (validDocs.length === 0) continue;

      // Batch fetch video file details for all valid docs
      const identifiers = validDocs.map(doc => doc.identifier);
      const videoFileMap = await batchFetchVideoFiles(identifiers);

      for (const doc of validDocs) {
        const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
        movies.push(toStreamableMovie(doc, videoFileName));
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:Archive] Error fetching collection ${collection}:`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search the Internet Archive for movies matching a query.
 * Also fetches video file details for proper play URLs.
 */
export async function searchArchiveMovies(query: string): Promise<StreamableMovie[]> {
  const cacheKey = `streaming-archive-search:${query}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q: `mediatype:movies AND title:"${query}"`,
      fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
      sort: 'avg_rating desc',
      rows: '20',
      output: 'json',
    }).toString();

    const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 15_000);
    if (!res?.ok) return [];

    const data = await safeJsonParse<ArchiveSearchResponse>(res);
    if (!data?.response?.docs?.length) return [];

    const validDocs = data.response.docs.filter(doc => {
      const durationSeconds = parseRuntime(doc.runtime);
      return durationSeconds === 0 || durationSeconds >= 30 * 60;
    });

    // Batch fetch video file details
    const identifiers = validDocs.map(doc => doc.identifier);
    const videoFileMap = await batchFetchVideoFiles(identifiers);

    const movies = validDocs.map(doc => {
      const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
      return toStreamableMovie(doc, videoFileName);
    });

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Archive] Search error:', err);
    return [];
  }
}

/**
 * Get detailed information for a specific archive movie.
 * Fetches full metadata including file list for video URL.
 */
export async function getArchiveMovieDetails(identifier: string): Promise<StreamableMovie | null> {
  const cacheKey = `streaming-archive-detail:${identifier}`;
  const cached = getCached<StreamableMovie>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(`${ARCHIVE_METADATA}/${identifier}`, undefined, 15_000);
    if (!res?.ok) return null;

    const data = await safeJsonParse<ArchiveMetadataResponse>(res);
    if (!data?.metadata) return null;

    const meta = data.metadata;
    const videoFileName = data.files ? findBestVideoFile(data.files) : null;

    const doc: ArchiveSearchDoc = {
      identifier,
      title: meta.title || identifier,
      description: typeof meta.description === 'string' ? meta.description : undefined,
      year: meta.year,
      runtime: meta.runtime,
      genre: meta.genre,
      avg_rating: typeof meta.avg_rating === 'string' ? parseFloat(meta.avg_rating) : meta.avg_rating,
      collection: meta.collection,
    };

    const movie = toStreamableMovie(doc, videoFileName ?? undefined);
    setCached(cacheKey, movie, CACHE_TTL);
    return movie;
  } catch (err) {
    console.warn(`[StreamingPipeline:Archive] Error fetching details for ${identifier}:`, err);
    return null;
  }
}

/**
 * Fetch anime/animation from Internet Archive collections.
 * Searches anime-specific collections AND anime keyword queries for broader coverage.
 */
export async function fetchArchiveAnime(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-archive-anime';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];
  const seenIdentifiers = new Set<string>();

  // Helper to process docs into movies
  const processDocs = (docs: ArchiveSearchDoc[], videoFileMap: Map<string, string | null>) => {
    for (const doc of docs) {
      if (seenIdentifiers.has(doc.identifier)) continue;
      seenIdentifiers.add(doc.identifier);

      const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
      const movie = toStreamableMovie(doc, videoFileName);
      // Ensure Anime genre tag
      if (!movie.genres.some(g => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))) {
        movie.genres.push('Anime');
      }
      movies.push(movie);
    }
  };

  // 1. Search by collections
  for (const collection of ANIME_COLLECTIONS) {
    try {
      const params = new URLSearchParams({
        q: `mediatype:movies AND collection:${collection}`,
        fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
        sort: 'downloads desc',
        rows: '20',
        output: 'json',
      }).toString();

      const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 15_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<ArchiveSearchResponse>(res);
      if (!data?.response?.docs?.length) continue;

      // For anime, accept shorter content (> 10 min for episodes)
      const validDocs = data.response.docs.filter(doc => {
        const durationSeconds = parseRuntime(doc.runtime);
        return durationSeconds === 0 || durationSeconds >= 10 * 60;
      });

      if (validDocs.length === 0) continue;

      const identifiers = validDocs.map(doc => doc.identifier);
      const videoFileMap = await batchFetchVideoFiles(identifiers);
      processDocs(validDocs, videoFileMap);
    } catch (err) {
      console.warn(`[StreamingPipeline:Archive] Error fetching anime collection ${collection}:`, err);
    }
  }

  // 2. Search by keyword queries for broader anime coverage
  for (const query of ANIME_SEARCH_QUERIES) {
    try {
      const params = new URLSearchParams({
        q: `mediatype:movies AND title:"${query}"`,
        fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
        sort: 'downloads desc',
        rows: '10',
        output: 'json',
      }).toString();

      const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 15_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<ArchiveSearchResponse>(res);
      if (!data?.response?.docs?.length) continue;

      const validDocs = data.response.docs.filter(doc => {
        if (seenIdentifiers.has(doc.identifier)) return false;
        const durationSeconds = parseRuntime(doc.runtime);
        return durationSeconds === 0 || durationSeconds >= 10 * 60;
      });

      if (validDocs.length === 0) continue;

      const identifiers = validDocs.map(doc => doc.identifier);
      const videoFileMap = await batchFetchVideoFiles(identifiers);
      processDocs(validDocs, videoFileMap);
    } catch (err) {
      console.warn(`[StreamingPipeline:Archive] Error fetching anime query "${query}":`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search Internet Archive for anime matching a query.
 */
export async function searchArchiveAnime(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-archive-anime-search:${query.toLowerCase().trim()}`;
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q: `mediatype:movies AND (title:"${query}" OR genre:anime OR genre:animation)`,
      fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
      sort: 'avg_rating desc',
      rows: '20',
      output: 'json',
    }).toString();

    const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 15_000);
    if (!res?.ok) return [];

    const data = await safeJsonParse<ArchiveSearchResponse>(res);
    if (!data?.response?.docs?.length) return [];

    const validDocs = data.response.docs.filter(doc => {
      const durationSeconds = parseRuntime(doc.runtime);
      return durationSeconds === 0 || durationSeconds >= 10 * 60;
    });

    const identifiers = validDocs.map(doc => doc.identifier);
    const videoFileMap = await batchFetchVideoFiles(identifiers);

    const movies = validDocs.map(doc => {
      const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
      const movie = toStreamableMovie(doc, videoFileName);
      if (!movie.genres.some(g => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))) {
        movie.genres.push('Anime');
      }
      return movie;
    });

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:Archive] Anime search error:', err);
    return [];
  }
}
