'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, Star, Film, TrendingUp, Flame, Users, Heart } from 'lucide-react';

interface WrappedData {
  year: number;
  displayName: string;
  avatar: string;
  personalityType: string | null;
  totalWatched: number;
  totalReviews: number;
  avgRating: string;
  totalRuntimeHours: number;
  topMovies: { id: number; title: string; rating: number }[];
  monthly: { month: number; count: number }[];
  peakMonth: number;
  peakMonthCount: number;
  longestStreak: number;
  currentStreak: number;
  following: number;
  followers: number;
  xp: number;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function WrappedPage() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMore, setNeedsMore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wrapped')
      .then(r => r.json())
      .then(d => {
        if (d.needs_more) setNeedsMore(d.message);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0c0c10] to-[#050507] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        {needsMore ? (
          <div className="text-center py-20">
            <Film className="w-12 h-12 text-[#5b5b6b] mx-auto mb-4" />
            <p className="text-[#9ca3af]">{needsMore}</p>
          </div>
        ) : data && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#D4A853]/20 to-transparent border border-[#D4A853]/30 rounded-3xl p-8 mb-6 text-center">
              <p className="text-xs uppercase tracking-widest text-[#D4A853] mb-2">{data.year} Wrapped</p>
              <h1 className="text-4xl font-extrabold mb-2">{data.displayName}'s Year in Film</h1>
              {data.personalityType && (
                <p className="text-[#9ca3af] text-sm">Personality: <span className="text-[#D4A853] capitalize">{data.personalityType.replace(/_/g, ' ')}</span></p>
              )}
            </div>

            {/* Big stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Stat icon={<Film className="w-5 h-5" />} label="Movies Watched" value={String(data.totalWatched)} />
              <Stat icon={<Star className="w-5 h-5" />} label="Avg Rating" value={data.avgRating} />
              <Stat icon={<TrendingUp className="w-5 h-5" />} label="Hours Watched" value={String(data.totalRuntimeHours)} />
              <Stat icon={<Flame className="w-5 h-5" />} label="Best Streak" value={`${data.longestStreak}d`} />
            </div>

            {/* Top 5 */}
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D4A853]" /> Your Top 5 of {data.year}
              </h3>
              <div className="space-y-2">
                {data.topMovies.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">No rated reviews this year.</p>
                ) : data.topMovies.map((m, i) => (
                  <Link key={m.id} href={`/movie/${m.id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition">
                    <span className="text-2xl font-extrabold text-[#D4A853] w-8">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-bold text-[#D4A853]">
                      <Star className="w-3.5 h-3.5 fill-[#D4A853]" />{m.rating}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Monthly chart */}
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4A853]" /> Monthly Activity
              </h3>
              <div className="flex items-end gap-1 h-32">
                {data.monthly.map(m => {
                  const max = Math.max(...data.monthly.map(x => x.count), 1);
                  const h = (m.count / max) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-[#9ca3af]">{m.count || ''}</div>
                      <div className="w-full bg-[#D4A853]/30 rounded-t hover:bg-[#D4A853]/60 transition" style={{ height: `${h}%` }} />
                      <div className="text-[10px] text-[#6b7280]">{MONTH_NAMES[m.month - 1]}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#9ca3af] mt-3">
                Peak month: <strong className="text-[#D4A853]">{MONTH_NAMES[data.peakMonth - 1]}</strong> ({data.peakMonthCount} movies)
              </p>
            </div>

            {/* Community */}
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Users className="w-5 h-5" />} label="Following" value={String(data.following)} />
              <Stat icon={<Heart className="w-5 h-5" />} label="Followers" value={String(data.followers)} />
              <Stat icon={<Star className="w-5 h-5" />} label="Total XP" value={String(data.xp)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-3 text-center">
      <div className="text-[#D4A853] mx-auto mb-1 w-fit">{icon}</div>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[10px] text-[#9ca3af] uppercase tracking-wide">{label}</div>
    </div>
  );
}
