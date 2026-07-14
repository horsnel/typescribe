/**
 * Static configuration for Typescribe.
 *
 * All movie/show/review/news data comes from live APIs (TMDb, AniList, Jikan,
 * Supabase). This file only retains:
 *   - Genre navigation config (categorical labels + icons, NOT fake counts)
 *   - Empty helper signatures kept for backwards compatibility (return empty)
 *
 * Previously this module exported hardcoded mock arrays (movies, userReviews,
 * newsItems, topRated) and a genres array with fake counts like 12400. Those
 * were removed because they produced misleading UI ("12,400 Action movies
 * available" when no such count existed).
 */

import type { Genre } from '@/lib/types';

// ─── Genre navigation config ────────────────────────────────────────────────
// Note: no fake `count` field — UI surfaces real counts from the API when
// available, and shows nothing otherwise.
export const genres: Genre[] = [
  { id: 'action', name: 'Action', icon: 'Sword' },
  { id: 'comedy', name: 'Comedy', icon: 'Laugh' },
  { id: 'drama', name: 'Drama', icon: 'Drama' },
  { id: 'horror', name: 'Horror', icon: 'Ghost' },
  { id: 'thriller', name: 'Thriller', icon: 'Eye' },
  { id: 'sci-fi', name: 'Sci-Fi', icon: 'Rocket' },
  { id: 'romance', name: 'Romance', icon: 'Heart' },
  { id: 'documentary', name: 'Documentary', icon: 'Film' },
  { id: 'bollywood', name: 'Bollywood', icon: 'Film' },
  { id: 'k-drama', name: 'K-Drama', icon: 'Film' },
  { id: 'nollywood', name: 'Nollywood', icon: 'Film' },
  { id: 'anime', name: 'Anime', icon: 'Sparkles' },
] as Genre[];

// ─── Backwards-compat shims (return empty) ─────────────────────────────────
// These exist because several legacy pages still import them. They always
// return empty/undefined — pages should fetch real data from the API.
//
// Previously these were non-empty arrays filled with hardcoded mock movies,
// reviews, and news items. Those have been removed because they produced
// misleading UI showing fake content. Pages that still import these names
// will see an empty list and should fall through to their API-backed paths.

import type { Movie, UserReview, NewsItem, TopRatedItem } from '@/lib/types';

export const movies: Movie[] = [];
export const userReviews: UserReview[] = [];
export const newsItems: NewsItem[] = [];
export const topRated: TopRatedItem[] = [];

export function getMovieBySlug(_slug: string): undefined {
  return undefined;
}

export function getMoviesByGenre(_genreName: string): [] {
  return [];
}

export function getReviewsByMovieId(_movieId: number): [] {
  return [];
}
