'use client';
import type { Movie } from '@/lib/types';
interface RatingBadgeProps { movie: Movie; variant?: 'tmdb' | 'imdb' | 'rt' | 'meta' | 'all'; }

function TMDbBadge({ score }: { score: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg">
      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
      </svg>
      <span className="text-sm font-semibold text-blue-400">{score.toFixed(1)}</span>
      <span className="text-[10px] text-blue-400 opacity-70">TMDb</span>
    </div>
  );
}

function IMDbBadge({ score }: { score: string }) {
  if (!score) return null;
  const num = parseFloat(score);
  if (isNaN(num)) return null;
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#f5c518]/10 px-3 py-1.5 rounded-lg">
      <span className="text-sm font-black text-[#f5c518]" style={{ fontFamily: 'monospace' }}>IMDb</span>
      <span className="text-sm font-semibold text-[#f5c518]">{num.toFixed(1)}</span>
    </div>
  );
}

function RTBadge({ score }: { score: string }) {
  if (!score) return null;
  const pct = parseInt(score.replace('%', ''), 10);
  if (isNaN(pct)) return null;
  const isFresh = pct >= 60;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isFresh ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
      <svg className={`w-4 h-4 ${isFresh ? 'text-green-400' : 'text-red-400'}`} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
      <span className={`text-sm font-semibold ${isFresh ? 'text-green-400' : 'text-red-400'}`}>{pct}%</span>
      <span className={`text-[10px] ${isFresh ? 'text-green-400' : 'text-red-400'} opacity-70`}>RT</span>
    </div>
  );
}

function MetaBadge({ score }: { score: string }) {
  if (!score) return null;
  const numScore = parseInt(score, 10);
  if (isNaN(numScore)) return null;
  let colorClass = 'text-red-400', bgClass = 'bg-red-500/10';
  if (numScore >= 61) { colorClass = 'text-green-400'; bgClass = 'bg-green-500/10'; }
  else if (numScore >= 40) { colorClass = 'text-yellow-400'; bgClass = 'bg-yellow-500/10'; }
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${bgClass}`}>
      <span className={`text-[10px] font-black ${colorClass}`} style={{ fontFamily: 'monospace' }}>META</span>
      <span className={`text-sm font-semibold ${colorClass}`}>{numScore}</span>
    </div>
  );
}

export default function RatingBadge({ movie, variant = 'all' }: RatingBadgeProps) {
  if (variant === 'all') {
    return (
      <div className="flex items-center flex-wrap gap-2">
        <TMDbBadge score={movie.vote_average} />
        <IMDbBadge score={movie.imdb_rating} />
        <RTBadge score={movie.rotten_tomatoes} />
        <MetaBadge score={movie.metascore} />
      </div>
    );
  }
  switch (variant) {
    case 'tmdb': return <TMDbBadge score={movie.vote_average} />;
    case 'imdb': return <IMDbBadge score={movie.imdb_rating} />;
    case 'rt': return <RTBadge score={movie.rotten_tomatoes} />;
    case 'meta': return <MetaBadge score={movie.metascore} />;
    default: return null;
  }
}
