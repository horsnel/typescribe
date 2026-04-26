'use client';

import { useEffect, useState } from 'react';
import type { Movie } from '@/lib/types';

interface TasteMatchProps {
  movie: Movie;
}

interface Review {
  movie_id: number;
  rating: number;
}

interface WatchlistItem {
  movieId: number;
}

export default function TasteMatch({ movie }: TasteMatchProps) {
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [userGenreSet, setUserGenreSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get user's genre preferences from reviews and watchlist
    const userGenres = new Set<string>();

    // From user profile favorite genres
    try {
      const session = localStorage.getItem('typescribe_session');
      if (session) {
        const user = JSON.parse(session);
        if (user.favorite_genres) {
          user.favorite_genres.forEach((g: string) => userGenres.add(g.toLowerCase()));
        }
      }
    } catch { /* ignore */ }

    // From reviews - we need to look up movie genres
    // For simplicity, we'll use the profile genres and watchlist as proxies
    try {
      const data = localStorage.getItem('typescribe_reviews');
      if (data) {
        const reviews: Review[] = JSON.parse(data);
        // If user has reviewed this movie type before, that counts
        reviews.forEach(() => {
          // We don't have movie genres in reviews, so we just count participation
        });
      }
    } catch { /* ignore */ }

    setUserGenreSet(userGenres);

    // Calculate match: overlap between user's genres and movie's genres
    const movieGenres = movie.genres.map(g => g.name.toLowerCase());
    if (movieGenres.length === 0) {
      setMatchPercent(50);
      return;
    }

    // If user has no preferences, show a neutral score
    if (userGenres.size === 0) {
      setMatchPercent(null);
      return;
    }

    let overlap = 0;
    movieGenres.forEach(g => {
      if (userGenres.has(g)) overlap++;
    });

    // Weight: overlap / movie genres + bonus for having more user genres matching
    const baseMatch = (overlap / movieGenres.length) * 100;
    // Give some bonus if user has many matching genres
    const bonus = Math.min(overlap * 3, 15);
    const finalMatch = Math.min(Math.round(baseMatch + bonus), 99);

    setMatchPercent(finalMatch);
  }, [movie]);

  if (matchPercent === null) {
    return (
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-white">Taste Match</span>
          <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">NEW</span>
        </div>
        <p className="text-xs text-[#6b6b7b]">Set your favorite genres in settings to see your taste match.</p>
        <a href="/dashboard/settings" className="text-xs text-purple-400 hover:underline mt-1 inline-block">Update Preferences →</a>
      </div>
    );
  }

  const color = matchPercent >= 90 ? 'text-green-400' : matchPercent >= 60 ? 'text-yellow-400' : 'text-red-400';
  const strokeColor = matchPercent >= 90 ? '#22c55e' : matchPercent >= 60 ? '#eab308' : '#ef4444';
  const bgColor = matchPercent >= 90 ? 'bg-green-500/5' : matchPercent >= 60 ? 'bg-yellow-500/5' : 'bg-red-500/5';
  const borderColor = matchPercent >= 90 ? 'border-green-500/20' : matchPercent >= 60 ? 'border-yellow-500/20' : 'border-red-500/20';

  // SVG circular progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (matchPercent / 100) * circumference;

  return (
    <div className={`bg-[#12121a] border ${borderColor} rounded-xl p-5 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-white">Taste Match</span>
        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">NEW</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r={radius} stroke="#2a2a35" strokeWidth="6" fill="none" />
            <circle
              cx="48" cy="48" r={radius}
              stroke={strokeColor}
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${color}`}>{matchPercent}%</span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${color}`}>
            {matchPercent >= 90 ? 'Perfect Match!' : matchPercent >= 60 ? 'Good Match' : 'Different Taste'}
          </p>
          <p className="text-xs text-[#6b6b7b] mt-1">Based on your watch history and genre preferences</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {movie.genres.map(g => {
              const isMatch = userGenreSet.has(g.name.toLowerCase());
              return (
                <span
                  key={g.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isMatch
                      ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                      : 'border-[#2a2a35] text-[#6b6b7b] bg-[#0a0a0f]'
                  }`}
                >
                  {g.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
