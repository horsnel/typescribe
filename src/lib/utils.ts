import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** SVG placeholder for broken/missing poster images */
export const POSTER_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750"><rect fill="#0c0c10" width="500" height="750"/><text x="250" y="365" text-anchor="middle" fill="#2a2a35" font-size="40" font-family="sans-serif">🎬</text></svg>'
);

/** SVG placeholder for broken/missing backdrop images */
export const BACKDROP_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect fill="#0c0c10" width="1280" height="720"/></svg>'
);

/**
 * Resolve a poster/backdrop path to a full image URL.
 * - Full URLs (http/https) are returned as-is (Jikan, AniList, etc.)
 * - TMDb relative paths (starting with /) get the TMDb image prefix
 * - Empty/null/undefined returns the fallback SVG placeholder
 */
export function resolveImageUrl(
  path: string | null | undefined,
  tmdbSize: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500',
): string {
  if (!path || path.trim() === '') return POSTER_PLACEHOLDER;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `https://image.tmdb.org/t/p/${tmdbSize}${path}`;
  return path;
}

/** Standard onError handler for <img> elements — replaces with placeholder */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  type: 'poster' | 'backdrop' = 'poster',
) {
  const img = e.currentTarget;
  // Prevent infinite loop if the placeholder itself fails
  if (img.src.startsWith('data:image/svg+xml')) return;
  img.src = type === 'poster' ? POSTER_PLACEHOLDER : BACKDROP_PLACEHOLDER;
}
