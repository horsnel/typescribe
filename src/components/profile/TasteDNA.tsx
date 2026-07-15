'use client';

import { useEffect, useState } from 'react';
import { Dna, Loader2, Sparkles, TrendingUp, Calendar } from 'lucide-react';

/**
 * TasteDNA — visualizes the user's taste profile from /api/taste-dna.
 *
 * Shows three sections:
 *   1. Summary tiles: total rated, avg rating, diversity score
 *   2. Top 6 genre affinities (enthusiasm % + avg rating + count)
 *   3. Decade affinity (count + avg rating per decade)
 *
 * Handles four states:
 *   - loading
 *   - needs_more (user has < 5 ratings)
 *   - error
 *   - loaded (real data)
 *
 * No mock data — every number comes from the API.
 */

interface GenreAffinity {
  genre: string;
  count: number;
  avgRating: number;
  enthusiasm: number;
}

interface DecadeAffinity {
  decade: string;
  count: number;
  avgRating: number;
}

interface TasteDNA {
  genreAffinity?: GenreAffinity[];
  decadeAffinity?: DecadeAffinity[];
  topDirectors?: { director: string; count: number }[];
  topCountries?: { country: string; count: number }[];
  totalRated?: number;
  avgRating?: number;
  diversity?: number;
}

interface NeedsMore {
  needs_more: true;
  message: string;
  have: { diary: number; reviews: number };
}

export default function TasteDNA() {
  const [data, setData] = useState<TasteDNA | null>(null);
  const [needsMore, setNeedsMore] = useState<NeedsMore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount (React docs: legitimate)
    setLoading(true);
    setError('');
    fetch('/api/taste-dna', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (d && d.needs_more) {
          setNeedsMore(d);
          setData(null);
        } else {
          setData(d as TasteDNA);
          setNeedsMore(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load Taste DNA');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Dna className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Taste DNA</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" strokeWidth={1.5} />
          <span className="ml-2 text-sm text-[#9ca3af]">Analyzing your taste profile…</span>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Dna className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Taste DNA</h3>
        </div>
        <p className="text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  // ─── Empty state: user hasn't rated enough movies yet ───
  if (needsMore) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Dna className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Taste DNA</h3>
        </div>
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#9ca3af] mb-1">{needsMore.message}</p>
          <p className="text-xs text-[#6b7280] mt-1">
            You have {needsMore.have.reviews} reviews and {needsMore.have.diary} diary entries.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const topGenres = (data.genreAffinity ?? []).slice(0, 6);
  const decades = data.decadeAffinity ?? [];
  const totalRated = data.totalRated ?? 0;
  const avgRating = data.avgRating ?? 0;
  const diversity = data.diversity ?? 0;

  // ─── Loaded state ───
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-5">
        <Dna className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Taste DNA</h3>
        <span className="text-xs text-[#6b7280] ml-auto">
          Based on {totalRated} rated {totalRated === 1 ? 'movie' : 'movies'}
        </span>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#050507] rounded-lg p-3 text-center border border-[#1e1e28]">
          <p className="text-2xl font-bold text-[#D4A853]">{totalRated}</p>
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mt-1">Movies Rated</p>
        </div>
        <div className="bg-[#050507] rounded-lg p-3 text-center border border-[#1e1e28]">
          <p className="text-2xl font-bold text-[#D4A853]">{avgRating.toFixed(1)}</p>
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mt-1">Avg Rating</p>
        </div>
        <div className="bg-[#050507] rounded-lg p-3 text-center border border-[#1e1e28]">
          <p className="text-2xl font-bold text-[#D4A853]">{diversity}</p>
          <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mt-1">Diversity Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genre affinity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#9ca3af]" strokeWidth={1.5} />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Top Genres</h4>
          </div>
          {topGenres.length > 0 ? (
            <div className="space-y-2.5">
              {topGenres.map((g) => (
                <div key={g.genre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#9ca3af]">{g.genre}</span>
                    <span className="text-xs text-[#6b7280]">
                      {g.enthusiasm}% · {g.avgRating.toFixed(1)}★ · {g.count} {g.count === 1 ? 'film' : 'films'}
                    </span>
                  </div>
                  <div className="h-2 bg-[#050507] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4A853]/70 to-[#D4A853] rounded-full transition-all"
                      style={{ width: `${Math.max(2, g.enthusiasm)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6b7280]">No genre data yet.</p>
          )}
        </div>

        {/* Decade affinity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#9ca3af]" strokeWidth={1.5} />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">By Decade</h4>
          </div>
          {decades.length > 0 ? (
            <div className="space-y-2.5">
              {decades.map((d) => {
                const maxCount = Math.max(...decades.map((x) => x.count), 1);
                return (
                  <div key={d.decade}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#9ca3af]">{d.decade}</span>
                      <span className="text-xs text-[#6b7280]">
                        {d.count} {d.count === 1 ? 'film' : 'films'}
                        {d.avgRating > 0 ? ` · ${d.avgRating.toFixed(1)}★` : ''}
                      </span>
                    </div>
                    <div className="h-2 bg-[#050507] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b82f6]/60 to-[#3b82f6] rounded-full transition-all"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#6b7280]">No decade data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
