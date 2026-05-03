/**
 * Internet Archive Free Movies Source
 *
 * Fetches public domain movies from the Internet Archive.
 * Uses the Archive.org API (free, no key needed).
 *
 * Only shared import: fetchWithTimeout from resilience utilities.
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
  const videoUrl = videoFileName
    ? `${ARCHIVE_DOWNLOAD}/${doc.identifier}/${encodeURIComponent(videoFileName)}`
    : `${ARCHIVE_DOWNLOAD}/${doc.identifier}`;

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
    languages,
    subtitles,
    is4K: false,
    isFree: true,
    addedAt: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch movies from the Internet Archive.
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

      for (const doc of data.response.docs) {
        // Filter for actual movies (> 30 minutes)
        const durationSeconds = parseRuntime(doc.runtime);
        if (durationSeconds > 0 && durationSeconds < 30 * 60) continue;

        movies.push(toStreamableMovie(doc));
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

    const movies = data.response.docs
      .filter(doc => {
        const durationSeconds = parseRuntime(doc.runtime);
        return durationSeconds === 0 || durationSeconds >= 30 * 60;
      })
      .map(doc => toStreamableMovie(doc));

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
