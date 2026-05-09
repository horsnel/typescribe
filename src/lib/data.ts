/**
 * Static data module for Typescribe.
 *
 * Real movie/show data comes from the free-tier pipeline
 * (AniList, Jikan, TVMaze — no API keys required).
 *
 * This file retains:
 *   - Static genre definitions (these are categories, not fake data)
 *   - Empty arrays for movie/review/news data (populated by API)
 *   - Helper functions that return empty results (API handles lookups)
 */

import type { Movie, Genre, UserReview, NewsItem, TopRatedItem } from '@/lib/types';

// ─── Static Genre Definitions ────────────────────────────────────────────────
// These are categorical navigation items, not fake movie data.

export const genres: Genre[] = [
  { id: 'action', name: 'Action', icon: 'Sword', count: 12400 },
  { id: 'comedy', name: 'Comedy', icon: 'Laugh', count: 9800 },
  { id: 'drama', name: 'Drama', icon: 'Drama', count: 15200 },
  { id: 'horror', name: 'Horror', icon: 'Ghost', count: 4300 },
  { id: 'thriller', name: 'Thriller', icon: 'Eye', count: 7600 },
  { id: 'sci-fi', name: 'Sci-Fi', icon: 'Rocket', count: 5100 },
  { id: 'romance', name: 'Romance', icon: 'Heart', count: 8900 },
  { id: 'documentary', name: 'Documentary', icon: 'Film', count: 3200 },
  { id: 'bollywood', name: 'Bollywood', icon: 'Film', count: 6700 },
  { id: 'k-drama', name: 'K-Drama', icon: 'Film', count: 5400 },
  { id: 'nollywood', name: 'Nollywood', icon: 'Film', count: 2800 },
  { id: 'anime', name: 'Anime', icon: 'Sparkles', count: 11000 },
];

// ─── Empty arrays — populated by API / free-tier pipeline ─────────────────────

export const movies: Movie[] = [];

export const userReviews: UserReview[] = [];

export const newsItems: NewsItem[] = [];

export const topRated: TopRatedItem[] = [];

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getMovieBySlug(slug: string): Movie | undefined {
  return undefined;
}

export function getMoviesByGenre(genreName: string): Movie[] {
  return [];
}

export function getReviewsByMovieId(movieId: number): UserReview[] {
  return [];
}
