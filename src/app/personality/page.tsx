'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, Loader2, Sparkles } from 'lucide-react';

interface Trait { name: string; score: number; description: string }
interface Result {
  archetype: string;
  emoji: string;
  description: string;
  traits: Trait[];
  totalWatched: number;
  avgRating: number;
}

export default function PersonalityPage() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMore, setNeedsMore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/personality')
      .then(r => r.json())
      .then(d => {
        if (d.needs_more) setNeedsMore(d.message);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Your Movie Personality</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-8">
          A 12-trait profile computed from your reviews, diary, and social activity.
        </p>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin mb-4" />
            <p className="text-[#9ca3af] text-sm">Analyzing your taste…</p>
          </div>
        ) : needsMore ? (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-8 text-center">
            <Sparkles className="w-10 h-10 text-[#D4A853] mx-auto mb-4" />
            <p className="text-[#9ca3af] mb-4">{needsMore}</p>
            <Link href="/" className="inline-flex px-4 py-2 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-lg text-sm">
              Browse movies to rate
            </Link>
          </div>
        ) : data && (
          <>
            <div className="bg-gradient-to-br from-[#D4A853]/15 to-transparent border border-[#D4A853]/30 rounded-2xl p-8 mb-6 text-center">
              <div className="text-6xl mb-3">{data.emoji}</div>
              <h2 className="text-2xl font-extrabold text-[#D4A853]">{data.archetype}</h2>
              <p className="text-[#9ca3af] text-sm mt-2 max-w-md mx-auto">{data.description}</p>
              <div className="mt-4 flex justify-center gap-6 text-xs text-[#9ca3af]">
                <span><strong className="text-white">{data.totalWatched}</strong> watched</span>
                <span><strong className="text-white">{data.avgRating.toFixed(1)}</strong> avg rating</span>
              </div>
            </div>

            <h3 className="text-sm font-semibold mb-3 text-[#9ca3af] uppercase tracking-wide">12 Traits</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.traits.map(t => (
                <div key={t.name} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{t.name}</span>
                    <span className="text-sm font-bold text-[#D4A853]">{t.score}</span>
                  </div>
                  <div className="h-1.5 bg-[#1e1e28] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-[#D4A853] rounded-full transition-all duration-1000" style={{ width: `${t.score}%` }} />
                  </div>
                  <p className="text-[10px] text-[#6b7280]">{t.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
