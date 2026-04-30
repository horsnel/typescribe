'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitCompare, TrendingUp, TrendingDown, Minus, ArrowRight, Users } from 'lucide-react';
import { getCrossCommunityComparisons, type CrossCommunityComparison } from '@/lib/community-storage';

interface CrossCommunityComparisonProps {
  communityIds: string[];
  limit?: number;
}

export default function CrossCommunityComparisonWidget({ communityIds, limit = 5 }: CrossCommunityComparisonProps) {
  const [comparisons, setComparisons] = useState<CrossCommunityComparison[]>([]);

  useEffect(() => {
    if (communityIds.length >= 2) {
      const data = getCrossCommunityComparisons(communityIds, limit);
      setComparisons(data);
    }
  }, [communityIds, limit]);

  if (comparisons.length === 0) return null;

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#1e1e28]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-green-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Community Divides</h3>
            <p className="text-xs text-[#6b7280]">Where your communities disagree the most</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#1e1e28]/50">
        {comparisons.map((comp) => {
          const maxRating = Math.max(...comp.communityRatings.map(r => r.averageRating));
          const minRating = Math.min(...comp.communityRatings.map(r => r.averageRating));

          return (
            <div key={comp.movieId} className="p-4 hover:bg-[#050507]/50 transition-colors">
              {/* Movie title */}
              <div className="flex items-center justify-between mb-3">
                <Link
                  href={comp.movieSlug ? `/movie/${comp.movieSlug}` : '#'}
                  className="text-sm font-semibold text-white hover:text-[#d4a853] transition-colors"
                >
                  {comp.movieTitle}
                </Link>
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {comp.biggestDivide} point divide
                </span>
              </div>

              {/* Community rating bars */}
              <div className="space-y-2">
                {comp.communityRatings.map((cr) => {
                  const TrendIcon = cr.trend === 'higher' ? TrendingUp : cr.trend === 'lower' ? TrendingDown : Minus;
                  const trendColor = cr.trend === 'higher' ? 'text-green-400' : cr.trend === 'lower' ? 'text-red-400' : 'text-yellow-400';
                  const barColor = cr.trend === 'higher' ? 'bg-green-400' : cr.trend === 'lower' ? 'bg-red-400' : 'bg-yellow-400';

                  return (
                    <div key={cr.communityId} className="flex items-center gap-2">
                      <Link href={`/community/${cr.communityId}`} className="text-xs text-[#9ca3af] hover:text-[#d4a853] transition-colors w-28 truncate flex-shrink-0">
                        {cr.communityName}
                      </Link>
                      <div className="flex-1 h-1.5 bg-[#1e1e28] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${(cr.averageRating / 10) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs font-bold text-white w-7 text-right">{cr.averageRating.toFixed(1)}</span>
                        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e1e28]/50 text-center">
        <p className="text-xs text-[#6b7280]">
          <Users className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
          Ratings vary by community taste — the divide reveals why debates happen
        </p>
      </div>
    </div>
  );
}
