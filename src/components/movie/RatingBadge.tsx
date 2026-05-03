'use client';
import type { Movie } from '@/lib/types';
interface RatingBadgeProps { movie: Movie; variant?: 'tmdb' | 'imdb' | 'rt' | 'meta' | 'all'; enriching?: boolean; }

function TMDbBadge({ score }: { score: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#8B5CF6]/10 px-3 py-1.5 rounded-lg">
      <svg className="w-5 h-5 text-[#8B5CF6]" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">T</text>
      </svg>
      <span className="text-sm font-semibold text-[#8B5CF6]">{score.toFixed(1)}</span>
      <span className="text-[10px] text-[#8B5CF6] opacity-70">TMDb</span>
    </div>
  );
}

function IMDbBadge({ score }: { score: string }) {
  if (!score) return null;
  const num = parseFloat(score);
  if (isNaN(num)) return null;
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#8B5CF6]/10 px-3 py-1.5 rounded-lg">
      <span className="text-sm font-black text-[#8B5CF6]" style={{ fontFamily: 'monospace' }}>IMDb</span>
      <span className="text-sm font-semibold text-[#8B5CF6]">{num.toFixed(1)}</span>
    </div>
  );
}

function RTBadge({ score, audienceScore }: { score: string; audienceScore?: string }) {
  if (!score) return null;
  const pct = parseInt(score.replace('%', ''), 10);
  if (isNaN(pct)) return null;
  const isFresh = pct >= 60;
  const audPct = audienceScore ? parseInt(audienceScore.replace('%', ''), 10) : null;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isFresh ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
      {/* Tomato icon: fresh = filled circle, rotten = X */}
      {isFresh ? (
        <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="8" x2="16" y2="16" />
          <line x1="16" y1="8" x2="8" y2="16" />
        </svg>
      )}
      <span className={`text-sm font-semibold ${isFresh ? 'text-green-400' : 'text-red-400'}`}>{pct}%</span>
      {audPct !== null && !isNaN(audPct) && (
        <>
          <span className="text-[#6b7280] text-[10px]">/</span>
          <span className="text-sm font-semibold text-yellow-400">{audPct}%</span>
          <span className="text-[10px] text-yellow-400 opacity-70">AUD</span>
        </>
      )}
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

/** Subtle placeholder badge shown while enrichment is fetching data */
function PendingBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#1e1e28]/40 px-3 py-1.5 rounded-lg animate-pulse">
      <span className="text-[10px] text-[#4b5563] uppercase font-semibold">{label}</span>
      <span className="text-[10px] text-[#4b5563]">—</span>
    </div>
  );
}

export default function RatingBadge({ movie, variant = 'all', enriching }: RatingBadgeProps) {
  if (variant === 'all') {
    return (
      <div className="flex items-center flex-wrap gap-2">
        <TMDbBadge score={movie.vote_average} />
        {movie.imdb_rating ? (
          <IMDbBadge score={movie.imdb_rating} />
        ) : enriching ? (
          <PendingBadge label="IMDb" />
        ) : null}
        {movie.rotten_tomatoes ? (
          <RTBadge score={movie.rotten_tomatoes} audienceScore={movie.rt_audience_score} />
        ) : enriching ? (
          <PendingBadge label="RT" />
        ) : null}
        {movie.metascore ? (
          <MetaBadge score={movie.metascore} />
        ) : enriching ? (
          <PendingBadge label="Meta" />
        ) : null}
      </div>
    );
  }
  switch (variant) {
    case 'tmdb': return <TMDbBadge score={movie.vote_average} />;
    case 'imdb': return movie.imdb_rating ? <IMDbBadge score={movie.imdb_rating} /> : null;
    case 'rt': return movie.rotten_tomatoes ? <RTBadge score={movie.rotten_tomatoes} audienceScore={movie.rt_audience_score} /> : null;
    case 'meta': return movie.metascore ? <MetaBadge score={movie.metascore} /> : null;
    default: return null;
  }
}
