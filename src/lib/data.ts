/**
 * Placeholder data module.
 *
 * All real data now comes from the free-tier pipeline
 * (AniList, Jikan, TVMaze — no API keys required).
 *
 * This file retains only the exported shape so that
 * existing imports don't break. All arrays are empty.
 */

import type { Movie, Genre, UserReview, NewsItem, TopRatedItem } from '@/lib/types';

// ─── Empty placeholder arrays ────────────────────────────────────────────────

export const movies: Movie[] = [];

export const genres: Genre[] = [];

export const userReviews: UserReview[] = [];

export const newsItems: NewsItem[] = [];

export const topRated: TopRatedItem[] = [];

// ─── Helper functions (return empty results) ─────────────────────────────────

export function getMovieBySlug(slug: string): Movie | undefined {
  return undefined;
}

export function getMoviesByGenre(genreName: string): Movie[] {
  return [];
}

export function getReviewsByMovieId(movieId: number): UserReview[] {
  return [];
}
