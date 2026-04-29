'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';
import { 
  generateMockCommunityRatings, 
  getCommunityRatings, 
  getJoinedCommunities,
  type CommunityMovieRating 
} from '@/lib/community-storage';

// Community name lookup
const COMMUNITY_NAMES: Record<string, string> = {
  'horror-fans': 'Horror Fans',
  'k-drama-club': 'K-Drama Club',
  'nollywood-watchers': 'Nollywood Watchers',
  'nolan-fans': 'Nolan Fans',
  'anime-explorers': 'Anime Explorers',
  'classic-cinema': 'Classic Cinema',
  'scifi-universe': 'Sci-Fi Universe',
  'indie-film-lovers': 'Indie Film Lovers',
  'bollywood-beats': 'Bollywood Beats',
  'documentary-circle': 'Documentary Circle',
  'romance-fans': 'Romance Fans',
  'a24-appreciation': 'A24 Appreciation',
};

interface CommunityRatingsProps {
  movieId: number;
  movieSlug: string;
  genres: Array<{ id: number; name: string }>;
  generalRating: number;
}

export default function CommunityRatings({ movieId, movieSlug, genres, generalRating }: CommunityRatingsProps) {
  const [ratings, setRatings] = useState<CommunityMovieRating[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);

  useEffect(() => {
    // Load joined communities
    setJoinedIds(getJoinedCommunities());
    
    // Get or generate community ratings
    let existing = getCommunityRatings(movieId);
    if (existing.length === 0) {
      existing = generateMockCommunityRatings(movieId, genres, generalRating);
    }
    setRatings(existing);
  }, [movieId, genres, generalRating]);

  if (ratings.length === 0) return null;

  // Sort: joined first, then by absolute deviation from general
  const sorted = [...ratings].sort((a, b) => {
    const aJoined = joinedIds.includes(a.communityId) ? 0 : 1;
    const bJoined = joinedIds.includes(b.communityId) ? 0 : 1;
    if (aJoined !== bJoined) return aJoined - bJoined;
    return Math.abs(b.averageRating - generalRating) - Math.abs(a.averageRating - generalRating);
  });

  const aboveAverage = ratings.filter(r => r.averageRating > generalRating).length;
  const maxRating = Math.max(...ratings.map(r => r.averageRating), generalRating);

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#1e1e28]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#d4a853]/10 border border-[#d4a853]/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#d4a853]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Community Ratings</h3>
            <p className="text-xs text-[#6b7280]">How different communities rate this movie</p>
          </div>
          <span className="ml-auto text-[10px] bg-[#d4a853]/10 text-[#d4a853] px-2.5 py-0.5 rounded-full border border-[#d4a853]/20 font-semibold">
            EXCLUSIVE
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* General Audience Baseline */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#9ca3af]">General Audience</span>
            <span className="text-sm font-bold text-white">{generalRating.toFixed(1)}</span>
          </div>
          <div className="w-full h-2.5 bg-[#1e1e28] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6b7280] rounded-full transition-all duration-700"
              style={{ width: `${(generalRating / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-[#1e1e28]" />
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-medium">Community Breakdown</span>
          <div className="h-px flex-1 bg-[#1e1e28]" />
        </div>

        {/* Community Rating Bars */}
        <div className="space-y-3.5">
          {sorted.map((rating) => {
            const name = COMMUNITY_NAMES[rating.communityId] || rating.communityId;
            const diff = rating.averageRating - generalRating;
            const isHigher = diff > 0.3;
            const isLower = diff < -0.3;
            const isJoined = joinedIds.includes(rating.communityId);
            const barColor = isHigher ? 'bg-green-400' : isLower ? 'bg-red-400' : 'bg-yellow-400';
            const diffColor = isHigher ? 'text-green-400' : isLower ? 'text-red-400' : 'text-yellow-400';
            const DiffIcon = isHigher ? TrendingUp : isLower ? TrendingDown : Minus;

            return (
              <div key={rating.communityId} className={`group ${isJoined ? 'bg-[#d4a853]/5 border border-[#d4a853]/10 rounded-lg p-3 -mx-1' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/community/${rating.communityId}`} className="text-sm font-medium text-[#9ca3af] group-hover:text-[#d4a853] transition-colors">
                      {name}
                    </Link>
                    {isJoined && (
                      <span className="text-[9px] text-[#d4a853] bg-[#d4a853]/10 px-1.5 py-0.5 rounded-full">Joined</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6b7280] flex items-center gap-0.5">
                      <Users className="w-3 h-3" /> {rating.ratingCount}
                    </span>
                    <span className="text-sm font-bold text-white w-8 text-right">{rating.averageRating.toFixed(1)}</span>
                    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${diffColor}`}>
                      <DiffIcon className="w-3 h-3" />
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#1e1e28] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${(rating.averageRating / 10) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-5 pt-4 border-t border-[#1e1e28]/50">
          <p className="text-xs text-[#6b7280] text-center">
            <span className="text-[#d4a853] font-semibold">{aboveAverage}</span> of{' '}
            <span className="text-[#9ca3af] font-semibold">{ratings.length}</span> communities rate this{' '}
            {aboveAverage > ratings.length / 2 ? 'above' : 'below'} average
          </p>
        </div>
      </div>
    </div>
  );
}
