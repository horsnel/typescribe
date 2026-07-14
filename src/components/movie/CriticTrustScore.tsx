'use client';
import { Star, Zap, TrendingUp, Clapperboard, Cherry, BarChart3, Film } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CriticTrustScoreProps {
  movieId: number;
  movieTitle: string;
  userReviewCount: number;
}

interface AlignmentSource {
  source: string;
  score: number;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; color?: string }>;
  color: string;
}

/**
 * Real implementation: fetches the user's review history and the movie's
 * regional ratings (IMDb, RT, Metacritic, Letterboxd), then computes the
 * Pearson correlation between the user's ratings and each source's ratings
 * for the movies they've both reviewed.
 *
 * Falls back to a "needs more data" notice if the user has <10 reviews.
 */
export default function CriticTrustScore({ movieId, movieTitle, userReviewCount = 0 }: CriticTrustScoreProps) {
  const [alignmentScores, setAlignmentScores] = useState<AlignmentSource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userReviewCount || userReviewCount < 10) return;
    setLoading(true);
    fetch('/api/critic-trust?movie_id=' + movieId)
      .then(r => r.json())
      .then(data => {
        if (data.sources) {
          const icons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number; color?: string }>> = {
            'IMDb': Clapperboard,
            'Rotten Tomatoes': Cherry,
            'Metacritic': BarChart3,
            'Letterboxd': Film,
          };
          const colors: Record<string, string> = {
            'IMDb': '#D4A853',
            'Rotten Tomatoes': '#fa320a',
            'Metacritic': '#00ce68',
            'Letterboxd': '#00d035',
          };
          setAlignmentScores(data.sources.map((s: any) => ({
            source: s.source,
            score: Math.round(s.score * 100),
            Icon: icons[s.source] ?? Clapperboard,
            color: colors[s.source] ?? '#D4A853',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movieId, userReviewCount]);

  if (!userReviewCount || userReviewCount < 10) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-white">Critics Like You</h4>
          <span className="text-[10px] bg-[#D4A853]/20 text-[#D4A853] px-1.5 py-0.5 rounded-full">10+ REVIEWS NEEDED</span>
        </div>
        <p className="text-xs text-[#6b7280]">Rate {10 - (userReviewCount || 0)} more movies to unlock critic alignment scores that match your taste profile.</p>
      </div>
    );
  }

  if (loading || alignmentScores.length === 0) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-white">Critics Like You</h4>
        </div>
        <p className="text-xs text-[#6b7280]">Computing your alignment with major critics…</p>
      </div>
    );
  }

  const topSource = alignmentScores.reduce((best, s) => s.score > best.score ? s : best, alignmentScores[0]);

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
        <h4 className="text-sm font-semibold text-white">Critics Like You</h4>
        <span className="text-[10px] bg-[#D4A853]/20 text-[#D4A853] px-1.5 py-0.5 rounded-full">REAL DATA</span>
      </div>
      <p className="text-xs text-[#9ca3af] mb-3">
        Based on Pearson correlation of your ratings vs. critics across {userReviewCount}+ movies you&apos;ve reviewed.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {alignmentScores.map(s => (
          <div key={s.source} className="p-2.5 bg-black/30 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <s.Icon className="w-3.5 h-3.5" color={s.color} strokeWidth={2} />
                <span className="text-xs font-medium text-white">{s.source}</span>
              </div>
              <span className="text-xs font-bold text-white">{s.score}%</span>
            </div>
            <div className="h-1.5 bg-[#1e1e28] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.score}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2.5 bg-[#D4A853]/5 border border-[#D4A853]/15 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-[#D4A853]" />
        <p className="text-xs text-[#D4A853]">
          You align most with <strong>{topSource.source}</strong> ({topSource.score}% match)
        </p>
      </div>
    </div>
  );
}
