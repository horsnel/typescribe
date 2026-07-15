'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Loader2, Sparkles, Heart } from 'lucide-react';

/**
 * TasteTwin — shows the user's top 5 closest "taste twins" via /api/taste-twin.
 *
 * Taste twins are computed server-side by Pearson correlation of co-rated
 * movies (see `compute_taste_twins` Postgres RPC). A twin appears here only
 * if (a) the user has co-rated at least one movie with them and (b) the twin
 * has a public profile.
 *
 * States handled: loading, needs_more (no twins yet), error, loaded.
 * No mock data — every entry comes from the API.
 */

interface Twin {
  user_id: string;
  twin_user_id: string;
  similarity: number;       // 0..1 Pearson correlation
  shared_count: number;     // # of co-rated movies
  computed_at: string;
  twin?: {
    id: string;
    display_name: string;
    avatar: string | null;
    bio: string | null;
  };
}

interface ApiResponse {
  twins?: Twin[];
  error?: string;
}

function getInitials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatSimilarity(s: number): string {
  // Pearson 0..1 → display as a percentage with one decimal.
  const pct = Math.max(0, Math.min(1, s)) * 100;
  return `${pct.toFixed(0)}%`;
}

function similarityColor(s: number): string {
  if (s >= 0.85) return 'text-emerald-400';
  if (s >= 0.7) return 'text-[#D4A853]';
  if (s >= 0.5) return 'text-orange-400';
  return 'text-[#9ca3af]';
}

export default function TasteTwin() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount (React docs: legitimate)
    setLoading(true);
    setError('');
    fetch('/api/taste-twin', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: ApiResponse) => {
        if (cancelled) return;
        // Filter out twins that lack a profile (e.g. deleted accounts)
        setTwins((d.twins ?? []).filter((t) => t.twin));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load taste twins');
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
          <Users className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Your Taste Twins</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" strokeWidth={1.5} />
          <span className="ml-2 text-sm text-[#9ca3af]">Finding your closest matches…</span>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Your Taste Twins</h3>
        </div>
        <p className="text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  // ─── Empty state: no twins computed yet ───
  if (twins.length === 0) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Your Taste Twins</h3>
        </div>
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#9ca3af] mb-1">No taste twins yet</p>
          <p className="text-xs text-[#6b7280] mt-1 max-w-sm mx-auto">
            Rate a few more movies and we&apos;ll match you with users who share
            your taste. Twins are recomputed automatically as your ratings grow.
          </p>
        </div>
      </div>
    );
  }

  // ─── Loaded state ───
  const top = twins.slice(0, 5);
  const bestMatch = top[0];

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-5">
        <Users className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">Your Taste Twins</h3>
        <span className="text-xs text-[#6b7280] ml-auto">
          {top.length} {top.length === 1 ? 'match' : 'matches'} ·{' '}
          {bestMatch?.shared_count ?? 0} shared {bestMatch?.shared_count === 1 ? 'film' : 'films'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {top.map((twin, idx) => {
          const profile = twin.twin!;
          const isTop = idx === 0;
          return (
            <Link
              key={twin.twin_user_id}
              href={`/profile/${profile.id}`}
              className={`group relative bg-[#050507] border rounded-lg p-4 flex flex-col items-center text-center transition-all hover:border-[#D4A853]/40 hover:bg-[#111118] ${
                isTop ? 'border-[#D4A853]/40' : 'border-[#1e1e28]'
              }`}
            >
              {/* Rank badge for top match */}
              {isTop && (
                <div className="absolute -top-2 -right-2 bg-[#D4A853] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                  Best
                </div>
              )}

              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1a1a22] flex items-center justify-center mb-2 border-2 border-[#1e1e28] group-hover:border-[#D4A853]/50 transition-colors">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-base font-bold text-[#6b7280]">
                    {getInitials(profile.display_name)}
                  </span>
                )}
              </div>

              {/* Name + bio */}
              <p className="text-sm font-medium text-white truncate max-w-full">
                {profile.display_name}
              </p>
              {profile.bio && (
                <p className="text-[10px] text-[#6b7280] line-clamp-2 mt-1 min-h-[24px]">
                  {profile.bio}
                </p>
              )}

              {/* Similarity score */}
              <div className="mt-3 pt-2 border-t border-[#1e1e28] w-full">
                <div className="flex items-center justify-center gap-1">
                  <Heart
                    className={`w-3 h-3 ${similarityColor(twin.similarity)}`}
                    strokeWidth={2}
                    fill={isTop ? 'currentColor' : 'none'}
                  />
                  <span className={`text-xs font-semibold ${similarityColor(twin.similarity)}`}>
                    {formatSimilarity(twin.similarity)}
                  </span>
                </div>
                <p className="text-[9px] text-[#6b7280] uppercase tracking-wider mt-0.5">
                  taste match
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-[10px] text-[#6b7280] mt-4 text-center">
        Twins are computed by Pearson correlation of movies you&apos;ve both rated.
        The list refreshes as your ratings change.
      </p>
    </div>
  );
}
