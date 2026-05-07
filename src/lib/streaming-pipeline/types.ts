/**
 * Streaming Pipeline Data Types
 *
 * Completely separate from the main pipeline's Movie type.
 * These types represent free, legal movies available for streaming.
 */

// ─── Core Movie Type ─────────────────────────────────────────────────────────

export interface StreamableMovie {
  id: string;                    // Unique ID (e.g. "youtube-abc123" or "archive-buckbunny")
  title: string;
  description: string;
  year: number;
  duration: string;              // e.g. "1h 42m"
  durationSeconds: number;
  genres: string[];
  rating: number;
  quality: '4K' | '1080p' | '720p' | '480p' | 'Unknown';
  poster: string;                // URL to poster image
  backdrop: string;              // URL to backdrop image
  source: StreamSource;
  sourceUrl: string;             // Link to original source page
  sourceLicense: string;         // e.g. "CC BY 3.0", "Public Domain", "Free to Watch"
  videoUrl: string;              // Direct video stream URL or embed URL
  videoType: 'direct' | 'youtube' | 'vimeo' | 'embed';
  languages: AudioLanguage[];
  subtitles: SubtitleTrack[];
  is4K: boolean;
  isFree: boolean;               // Always true for this pipeline
  country?: string;              // ISO country code (e.g. "KR", "IN", "NG")
  addedAt: string;               // ISO date when added to catalog
}

// ─── Supporting Types ────────────────────────────────────────────────────────

export interface AudioLanguage {
  code: string;                  // e.g. "en", "es", "fr"
  label: string;                 // e.g. "English (Original)"
  isOriginal: boolean;
  isDubbed: boolean;
  audioFormat?: string;          // e.g. "5.1 Surround", "Stereo"
}

export interface SubtitleTrack {
  code: string;
  label: string;                 // e.g. "English", "Spanish"
  url?: string;                  // VTT file URL if available
  isDefault: boolean;
}

export type StreamSource =
  | 'youtube'
  | 'internet-archive'
  | 'blender-foundation'
  | 'public-domain'
  | 'tubi'
  | 'crackle'
  | 'pluto-tv'
  | 'tmdb-discover'
  | 'retrocrush'
  | 'contv'
  | 'bilibili'
  | 'vimeo-cc'
  | 'indie-animation';

// ─── Catalog & Categories ────────────────────────────────────────────────────

export interface StreamingCategory {
  id: string;
  label: string;
  icon: string;                  // Lucide icon name
  movieIds: string[];
}

export interface StreamingCatalog {
  movies: StreamableMovie[];
  categories: StreamingCategory[];
  lastUpdated: string;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

export interface StreamingCacheEntry {
  key: string;
  data: unknown;
  createdAt: number;
  expiresAt: number;
}
