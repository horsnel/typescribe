'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, Users, ChevronRight, Heart, Zap, Target,
  ArrowRight, CheckCircle2, UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  getSmartRecommendations,
  getJoinedCommunities as getJoinedCommunityIds,
  saveJoinedCommunities as saveJoinedCommunityIds,
  type CommunityRecommendation,
} from '@/lib/community-storage';

interface SmartRecommendationsProps {
  userGenres: string[];
  maxItems?: number;
}

const SCORE_ICONS: Array<{ min: number; icon: typeof Heart; color: string }> = [
  { min: 85, icon: Heart, color: 'text-green-400' },
  { min: 70, icon: Zap, color: 'text-emerald-400' },
  { min: 50, icon: Target, color: 'text-yellow-400' },
  { min: 0, icon: ArrowRight, color: 'text-orange-400' },
];

export default function SmartRecommendations({ userGenres, maxItems = 6 }: SmartRecommendationsProps) {
  const { isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState<CommunityRecommendation[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);

  useEffect(() => {
    const currentJoined = getJoinedCommunityIds();
    setJoinedIds(currentJoined);
    if (userGenres.length > 0) {
      setRecommendations(getSmartRecommendations(userGenres, currentJoined).slice(0, maxItems));
    }
  }, [userGenres, maxItems]);

  const handleQuickJoin = (communityId: string) => {
    if (!isAuthenticated) return;
    const current = getJoinedCommunityIds();
    if (!current.includes(communityId)) {
      current.push(communityId);
      saveJoinedCommunityIds(current);
      setJoinedIds(current);
      // Refresh recommendations
      setRecommendations(getSmartRecommendations(userGenres, current).slice(0, maxItems));
    }
  };

  const getScoreIcon = (score: number) => {
    const match = SCORE_ICONS.find(s => score >= s.min);
    return match || SCORE_ICONS[SCORE_ICONS.length - 1];
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'from-green-500/15 to-emerald-500/5 border-green-500/20';
    if (score >= 70) return 'from-emerald-500/15 to-teal-500/5 border-emerald-500/20';
    if (score >= 50) return 'from-yellow-500/15 to-amber-500/5 border-yellow-500/20';
    if (score >= 30) return 'from-orange-500/15 to-amber-500/5 border-orange-500/20';
    return 'from-red-500/15 to-rose-500/5 border-red-500/20';
  };

  if (recommendations.length === 0) return null;

  // Separate unjoined and joined
  const unjoined = recommendations.filter(r => !r.isJoined);
  const joined = recommendations.filter(r => r.isJoined);

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#1e1e28]/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recommended for You</h3>
            <p className="text-xs text-[#6b7280]">Communities that match your taste profile</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#1e1e28]/50">
        {unjoined.map((rec) => {
          const ScoreIcon = getScoreIcon(rec.matchScore);
          return (
            <div key={rec.communityId} className="p-4 hover:bg-[#050507]/50 transition-colors group">
              <div className="flex items-start gap-3">
                {/* Match score badge */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${getScoreBg(rec.matchScore)} border flex flex-col items-center justify-center`}>
                  <ScoreIcon.icon className={`w-4 h-4 ${ScoreIcon.color}`} />
                  <span className={`text-xs font-bold ${getScoreColor(rec.matchScore)}`}>{rec.matchScore}%</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/community/${rec.communityId}`} className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors truncate">
                      {rec.communityName}
                    </Link>
                    <span className="flex items-center gap-1 text-[10px] text-[#6b7280]">
                      <Users className="w-3 h-3" /> {rec.memberCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#9ca3af] mb-2 leading-relaxed">{rec.reason}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rec.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-[#d4a853]/10 text-[#d4a853] px-2 py-0.5 rounded-full border border-[#d4a853]/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick join */}
                <Button
                  onClick={() => handleQuickJoin(rec.communityId)}
                  size="sm"
                  className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-1 min-h-[36px] flex-shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Join
                </Button>
              </div>
            </div>
          );
        })}

        {/* Already joined section */}
        {joined.length > 0 && unjoined.length > 0 && (
          <div className="p-3 bg-[#050507]/50">
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold mb-2">Your Communities</p>
          </div>
        )}
        {joined.map((rec) => (
          <div key={rec.communityId} className="p-4 hover:bg-[#050507]/50 transition-colors group opacity-70">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#d4a853]/10 border border-[#d4a853]/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#d4a853]" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/community/${rec.communityId}`} className="text-sm font-semibold text-[#d4a853] group-hover:text-white transition-colors truncate">
                  {rec.communityName}
                </Link>
                <p className="text-[10px] text-[#6b7280]">Already a member</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-[#d4a853] transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e1e28]/50 text-center">
        <Link href="/communities" className="text-xs text-[#d4a853] hover:underline flex items-center justify-center gap-1">
          Browse all communities <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
