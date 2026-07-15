'use client';

import { useMemo } from 'react';
import type { Movie } from '@/lib/types';

interface GenreAdjustedRatingProps {
  movie: Movie;
}

interface Review {
  movie_id: number;
  rating: number;
  movie_title?: string;
}

/**
 * Reads the user's local review history from localStorage and computes a
 * per-genre "adjusted rating" for the current movie.
 *
 * Refactored from useEffect+setState (which triggered cascading renders per
 * `react-hooks/set-state-in-effect`) to a synchronous useMemo. The work was
 * already synchronous — there was no reason to defer it to an effect.
 *
 * Note: this reads localStorage inside useMemo, which is fine on the client
 * (the component is `'use client'`). On the server the lazy initializer
 * returns an empty array, so SSR output is stable.
 */
function loadLocalReviews(): Review[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('typescribe_reviews');
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return [];
}

export default function GenreAdjustedRating({ movie }: GenreAdjustedRatingProps) {
  const adjustedRatings = useMemo(() => {
    const reviews = loadLocalReviews();
    if (reviews.length === 0) return [];

    // Calculate overall average
    const overallAvg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // For each genre of this movie, calculate genre-adjusted score.
    // Simple heuristic: if user has 3+ reviews, we assume they've rated similar genre movies.
    // In a real app, we'd look up each reviewed movie's genres.
    // Here we use a simplified algorithm:
    //   - If user has >= 3 reviews, we simulate genre affinity
    //   - Higher overall ratings = positive adjustment for genre fans
    //   - Lower overall ratings = negative adjustment
    if (reviews.length < 3) return [];

    const results: { genre: string; score: number; count: number }[] = [];
    movie.genres.forEach(genre => {
      const userBias = overallAvg - 6.5; // 6.5 is global average
      const genreBoost = genre.name === 'Horror' || genre.name === 'Comedy' ? -0.3 : 0.2;
      const adjusted = Math.min(10, Math.max(1, movie.vote_average + userBias * 0.3 + genreBoost));
      results.push({
        genre: genre.name,
        score: Math.round(adjusted * 10) / 10,
        count: reviews.length,
      });
    });
    return results;
  }, [movie]);

  if (adjustedRatings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {adjustedRatings.map(item => (
        <div
          key={item.genre}
          className="inline-flex items-center gap-1.5 bg-[#0c0c10] border border-[#D4A853]/20 rounded-lg px-3 py-1.5"
        >
          <span className="text-[10px] text-[#D4A853] uppercase tracking-wider font-semibold">For {item.genre} Fans</span>
          <span className="text-sm font-bold text-white">{item.score}</span>
        </div>
      ))}
    </div>
  );
}
