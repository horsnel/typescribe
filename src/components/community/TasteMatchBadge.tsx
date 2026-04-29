'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Zap, Target, ArrowRight } from 'lucide-react';
import { calculateTasteMatch, type TasteMatchResult } from '@/lib/community-storage';

interface TasteMatchBadgeProps {
  userGenres: string[];
  communityId: string;
  communityName: string;
  compact?: boolean;
}

export default function TasteMatchBadge({ userGenres, communityId, communityName, compact = false }: TasteMatchBadgeProps) {
  const [match, setMatch] = useState<TasteMatchResult | null>(null);

  useEffect(() => {
    if (userGenres.length > 0) {
      setMatch(calculateTasteMatch(userGenres, communityId));
    }
  }, [userGenres, communityId]);

  if (!match) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBgColor = (score: number) => {
    if (score >= 85) return 'from-green-500/15 to-emerald-500/10 border-green-500/20';
    if (score >= 70) return 'from-emerald-500/15 to-teal-500/10 border-emerald-500/20';
    if (score >= 50) return 'from-yellow-500/15 to-amber-500/10 border-yellow-500/20';
    if (score >= 30) return 'from-orange-500/15 to-amber-500/10 border-orange-500/20';
    return 'from-red-500/15 to-rose-500/10 border-red-500/20';
  };

  const getIcon = (score: number) => {
    if (score >= 85) return <Heart className="w-4 h-4 text-green-400" fill="currentColor" />;
    if (score >= 70) return <Zap className="w-4 h-4 text-emerald-400" />;
    if (score >= 50) return <Target className="w-4 h-4 text-yellow-400" />;
    return <ArrowRight className="w-4 h-4 text-orange-400" />;
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${getBgColor(match.score)} border`}>
        {getIcon(match.score)}
        <span className={`text-xs font-bold ${getScoreColor(match.score)}`}>{match.score}%</span>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${getBgColor(match.score)} border rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-3">
        {getIcon(match.score)}
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-extrabold ${getScoreColor(match.score)}`}>{match.score}%</span>
            <span className="text-sm font-semibold text-white">{match.label}</span>
          </div>
          <p className="text-xs text-[#9ca3af]">
            Your taste alignment with <Link href={`/community/${communityId}`} className="text-[#d4a853] hover:underline">{communityName}</Link>
          </p>
        </div>
      </div>

      {/* Genre tags */}
      {match.matchedGenres.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#6b7280]">You both love:</span>
          {match.matchedGenres.map((genre) => (
            <span key={genre} className="text-[10px] bg-[#d4a853]/10 text-[#d4a853] px-2 py-0.5 rounded-full border border-[#d4a853]/20 font-medium">
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 w-full h-1.5 bg-[#1e1e28] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            match.score >= 85 ? 'bg-green-400' : match.score >= 70 ? 'bg-emerald-400' : match.score >= 50 ? 'bg-yellow-400' : match.score >= 30 ? 'bg-orange-400' : 'bg-red-400'
          }`}
          style={{ width: `${match.score}%` }}
        />
      </div>
    </div>
  );
}
