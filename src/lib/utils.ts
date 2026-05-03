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

/** SVG placeholder for broken/missing person profile images */
export const PERSON_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 185"><rect fill="#0c0c10" width="185" height="185"/><circle cx="92.5" cy="70" r="30" fill="#1a1a22"/><ellipse cx="92.5" cy="155" rx="50" ry="40" fill="#1a1a22"/></svg>'
);

/**
 * Extract initials from a person's name (max 2 chars).
 * E.g. "Tom Hanks" → "TH", "Oprah" → "OP"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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
  type: 'poster' | 'backdrop' | 'person' = 'poster',
) {
  const img = e.currentTarget;
  // Prevent infinite loop if the placeholder itself fails
  if (img.src.startsWith('data:image/svg+xml')) return;
  switch (type) {
    case 'backdrop': img.src = BACKDROP_PLACEHOLDER; break;
    case 'person': img.src = PERSON_PLACEHOLDER; break;
    default: img.src = POSTER_PLACEHOLDER; break;
  }
}
