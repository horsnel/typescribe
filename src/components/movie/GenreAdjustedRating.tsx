'use client';

import { useEffect, useState } from 'react';
import type { Movie } from '@/lib/types';

interface GenreAdjustedRatingProps {
  movie: Movie;
}

interface Review {
  movie_id: number;
  rating: number;
  movie_title?: string;
}

export default function GenreAdjustedRating({ movie }: GenreAdjustedRatingProps) {
  const [adjustedRatings, setAdjustedRatings] = useState<{ genre: string; score: number; count: number }[]>([]);

  useEffect(() => {
    // Get user's reviews
    let reviews: Review[] = [];
    try {
      const data = localStorage.getItem('typescribe_reviews');
      if (data) reviews = JSON.parse(data);
    } catch { /* ignore */ }

    if (reviews.length === 0) return;

    // Calculate overall average
    const overallAvg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // For each genre of this movie, calculate genre-adjusted score
    const results: { genre: string; score: number; count: number }[] = [];

    movie.genres.forEach(genre => {
      // Simple heuristic: if user has 3+ reviews, we assume they've rated similar genre movies
      // In a real app, we'd look up each reviewed movie's genres
      // Here we use a simplified algorithm:
      // - If user has >= 3 reviews, we simulate genre affinity
      // - Higher overall ratings = positive adjustment for genre fans
      // - Lower overall ratings = negative adjustment

      if (reviews.length >= 3) {
        // Calculate adjustment based on user's rating tendency
        // Users who rate higher overall get a boost for genre they like
        const userBias = overallAvg - 6.5; // 6.5 is global average
        const genreBoost = genre.name === 'Horror' || genre.name === 'Comedy' ? -0.3 : 0.2;
        const adjusted = Math.min(10, Math.max(1, movie.vote_average + userBias * 0.3 + genreBoost));

        results.push({
          genre: genre.name,
          score: Math.round(adjusted * 10) / 10,
          count: reviews.length,
        });
      }
    });

    setAdjustedRatings(results);
  }, [movie]);

  if (adjustedRatings.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {adjustedRatings.map(item => (
        <div
          key={item.genre}
          className="inline-flex items-center gap-1.5 bg-[#12121a] border border-purple-500/20 rounded-lg px-3 py-1.5"
        >
          <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">For {item.genre} Fans</span>
          <span className="text-sm font-bold text-white">{item.score}</span>
        </div>
      ))}
    </div>
  );
}
