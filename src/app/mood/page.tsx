'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Smile, Film } from 'lucide-react';

const MOODS = ['Cozy','Melancholic','Pumped','Nostalgic','Romantic','Tense','Curious','Inspired','Sad','Triumphant'];
const MOOD_EMOJI: Record<string, string> = {
  Cozy: '🛋️', Melancholic: '🌧️', Pumped: '⚡', Nostalgic: '📻', Romantic: '💕',
  Tense: '😨', Curious: '🔍', Inspired: '✨', Sad: '😢', Triumphant: '🏆',
};

interface Entry { mood: string; movie_id: number; movie_title: string; poster_path: string | null; rating: number | null; logged_at: string; }

export default function MoodHeatmapPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mood-heatmap')
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? []);
        setTally(d.tally ?? {});
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

  const max = Math.max(1, ...Object.values(tally));

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Smile className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Mood Heatmap</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          Tag movies you watched by the mood they put you in. See which feelings you chase most.
        </p>

        {/* Heatmap */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">Mood Distribution</h3>
          <div className="grid grid-cols-5 gap-3">
            {MOODS.map(m => {
              const count = tally[m] ?? 0;
              const intensity = count / max;
              return (
                <div key={m} className="text-center">
                  <div
                    className="aspect-square rounded-lg flex items-center justify-center text-3xl mb-2 transition"
                    style={{ background: `rgba(212, 168, 83, ${0.1 + intensity * 0.5})` }}
                  >
                    {MOOD_EMOJI[m]}
                  </div>
                  <div className="text-xs font-semibold">{m}</div>
                  <div className="text-xs text-[#9ca3af]">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">Recent Mood Logs</h3>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Film className="w-10 h-10 text-[#5b5b6b] mx-auto mb-3" />
              <p className="text-[#9ca3af] text-sm">No mood logs yet. Tag a movie from its detail page.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 10).map((e, i) => (
                <Link key={i} href={`/movie/${e.movie_id}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
                  <span className="text-2xl">{MOOD_EMOJI[e.mood] ?? '🎬'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.movie_title}</p>
                    <p className="text-xs text-[#9ca3af]">{e.mood} · {new Date(e.logged_at).toLocaleDateString()}</p>
                  </div>
                  {e.rating && <span className="text-sm font-bold text-[#D4A853]">{e.rating}/10</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
