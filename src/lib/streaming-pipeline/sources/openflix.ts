/**
 * OpenFlix Source — Free movies from open collections
 *
 * Fetches public domain and Creative Commons movies from Internet Archive
 * collections that are curated in the spirit of "open flix" — freely
 * available, legally streamable content.
 *
 * Uses Archive.org's Advanced Search API (free, no key needed).
 * All videos are directly playable (videoType: 'direct').
 *
 * Collections: opensource_movies, animationandcartoons, anime, classic_tv
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

const OPENFLIX_COLLECTIONS = [
  'opensource_movies',
  'animationandcartoons',
  'anime',
  'japaneseclassicanimation',
  'classic_tv',
  'Film_Noir',
  'SciFi_Horror',
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

function parseRuntime(runtime: string | undefined): number {
  if (!runtime) return 0;
  const timeMatch = runtime.match(/(\d+):(\d+)(?::(\d+))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const minMatch = runtime.match(/(\d+)\s*(?:min|m)/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  return 0;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Unknown';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function normalizeGenres(genre: string | string[] | undefined): string[] {
  if (!genre) return [];
  if (Array.isArray(genre)) return genre.map(g => g.trim()).filter(Boolean);
  return genre.split(/[;,]/).map(g => g.trim()).filter(Boolean);
}

function findBestVideoFile(files: ArchiveMetadataFile[]): string | null {
  const formatPriority = ['h.264', 'MPEG4', '512Kb MPEG4', 'Ogg Video', 'h264'];
  for (const format of formatPriority) {
    const file = files.find(f =>
      f.format?.toLowerCase().includes(format.toLowerCase()) &&
      f.name?.toLowerCase().endsWith('.mp4') &&
      f.source === 'original'
    );
    if (file) return file.name;
  }
  const mp4 = files.find(f => f.name?.toLowerCase().endsWith('.mp4') && f.source === 'original');
  if (mp4) return mp4.name;
  const videoFile = files.find(f => {
    const ext = f.name?.toLowerCase() ?? '';
    return (ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.ogv')) && f.source === 'original';
  });
  return videoFile?.name ?? null;
}

function toStreamableMovie(doc: ArchiveSearchDoc, videoFileName?: string): StreamableMovie {
  const durationSeconds = parseRuntime(doc.runtime);
  const genres = normalizeGenres(doc.genre);
  const poster = `${ARCHIVE_THUMBNAIL}/${doc.identifier}`;

  let videoUrl: string;
  if (videoFileName) {
    const encodedFile = videoFileName.split('/').map(part => encodeURIComponent(part)).join('/');
    videoUrl = `${ARCHIVE_DOWNLOAD}/${doc.identifier}/${encodedFile}`;
  } else {
    videoUrl = `${ARCHIVE_DOWNLOAD}/${doc.identifier}`;
  }

  const languages: AudioLanguage[] = [
    { code: 'en', label: 'English (Original)', isOriginal: true, isDubbed: false, audioFormat: 'Stereo' },
  ];
  const subtitles: SubtitleTrack[] = [
    { code: 'en', label: 'English', isDefault: true },
  ];

  return {
    id: `openflix-${doc.identifier}`,
    title: doc.title?.replace(/\s*\(\d{4}\)\s*$/, '').trim() || doc.identifier,
    description: (doc.description || 'A free movie from open collections on the Internet Archive.').slice(0, 500),
    year: doc.year ? parseInt(doc.year, 10) : 0,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    genres,
    rating: typeof doc.avg_rating === 'number' ? Math.round(doc.avg_rating * 10) / 10 : 0,
    quality: 'Unknown',
    poster,
    backdrop: poster,
    source: 'openflix',
    sourceUrl: `https://archive.org/details/${doc.identifier}`,
    sourceLicense: 'Public Domain / Open Source',
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

async function batchFetchVideoFiles(identifiers: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const CHUNK_SIZE = 5;
  for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
    const chunk = identifiers.slice(i, i + CHUNK_SIZE);
    const detailPromises = chunk.map(async (identifier) => {
      try {
        const res = await fetchWithTimeout(`${ARCHIVE_METADATA}/${identifier}`, undefined, 10_000);
        if (!res?.ok) { result.set(identifier, null); return; }
        const data = await safeJsonParse<ArchiveMetadataResponse>(res);
        if (data?.files) {
          result.set(identifier, findBestVideoFile(data.files));
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
 * Fetch free movies from open collections on Internet Archive.
 */
export async function fetchOpenflixMovies(): Promise<StreamableMovie[]> {
  const cacheKey = 'streaming-openflix-movies';
  const cached = getCached<StreamableMovie[]>(cacheKey);
  if (cached) return cached;

  const movies: StreamableMovie[] = [];

  for (const collection of OPENFLIX_COLLECTIONS) {
    try {
      // Use more rows for anime/animation collections for better coverage
      const isAnimeCollection = ['anime', 'animationandcartoons', 'japaneseclassicanimation'].includes(collection);
      const rowCount = isAnimeCollection ? '25' : '15';

      const params = new URLSearchParams({
        q: `mediatype:movies AND collection:${collection}`,
        fl: 'identifier,title,description,year,runtime,genre,avg_rating,downloads',
        sort: 'downloads desc',
        rows: rowCount,
        output: 'json',
      }).toString();

      const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 10_000);
      if (!res?.ok) continue;

      const data = await safeJsonParse<ArchiveSearchResponse>(res);
      if (!data?.response?.docs?.length) continue;

      // Filter for actual movies or anime episodes (> 10 minutes)
      const validDocs = data.response.docs.filter(doc => {
        const dur = parseRuntime(doc.runtime);
        return dur === 0 || dur >= 10 * 60;
      });

      if (validDocs.length === 0) continue;

      const identifiers = validDocs.map(doc => doc.identifier);
      const videoFileMap = await batchFetchVideoFiles(identifiers);

      for (const doc of validDocs) {
        const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
        movies.push(toStreamableMovie(doc, videoFileName));
      }
    } catch (err) {
      console.warn(`[StreamingPipeline:OpenFlix] Error fetching collection ${collection}:`, err);
    }
  }

  setCached(cacheKey, movies, CACHE_TTL);
  return movies;
}

/**
 * Search open collections for movies matching a query.
 */
export async function searchOpenflixMovies(query: string): Promise<StreamableMovie[]> {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `streaming-openflix-search:${query.toLowerCase().trim()}`;
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

    const res = await fetchWithTimeout(`${ARCHIVE_API}?${params}`, undefined, 10_000);
    if (!res?.ok) return [];

    const data = await safeJsonParse<ArchiveSearchResponse>(res);
    if (!data?.response?.docs?.length) return [];

    const validDocs = data.response.docs.filter(doc => {
      const dur = parseRuntime(doc.runtime);
      return dur === 0 || dur >= 10 * 60;
    });

    const identifiers = validDocs.map(doc => doc.identifier);
    const videoFileMap = await batchFetchVideoFiles(identifiers);

    const movies = validDocs.map(doc => {
      const videoFileName = videoFileMap.get(doc.identifier) ?? undefined;
      return toStreamableMovie(doc, videoFileName);
    });

    setCached(cacheKey, movies, CACHE_TTL);
    return movies;
  } catch (err) {
    console.warn('[StreamingPipeline:OpenFlix] Search error:', err);
    return [];
  }
}
