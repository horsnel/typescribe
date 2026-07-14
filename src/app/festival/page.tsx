'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, Film } from 'lucide-react';

interface Festival {
  id: string;
  festival_key: string;
  title: string;
  description: string;
  movie_titles: string[];
  starts_on: string;
  ends_on: string;
}

export default function FestivalPage() {
  const [festival, setFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/film-festival')
      .then(r => r.json())
      .then(d => setFestival(d.festival ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white">
        <Film className="w-12 h-12 text-[#5b5b6b] mb-4" />
        <p className="text-[#9ca3af]">No festival available right now.</p>
      </div>
    );
  }

  const today = new Date().getDate();
  const dayNum = today; // map day → film index

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#D4A853]/20 to-transparent border border-[#D4A853]/30 rounded-3xl p-8 mb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[#D4A853] mb-2">Monthly Festival</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{festival.title}</h1>
          <p className="text-[#9ca3af] text-sm max-w-xl mx-auto">{festival.description}</p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-[#9ca3af]">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {festival.starts_on} → {festival.ends_on}</span>
            <span>· {festival.movie_titles.length} films</span>
          </div>
        </div>

        {/* Today's pick */}
        <div className="bg-[#0c0c10] border border-[#D4A853]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-[#D4A853] text-black font-bold text-xs px-2 py-0.5 rounded">TODAY</span>
            <span className="text-sm text-[#9ca3af]">Day {dayNum}</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">{festival.movie_titles[dayNum - 1] ?? festival.movie_titles[0]}</h2>
          <p className="text-sm text-[#9ca3af]">Free to stream — no subscription required.</p>
        </div>

        {/* All films */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-4">All Films This Month</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {festival.movie_titles.map((title, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  i + 1 === dayNum ? 'bg-[#D4A853]/15 border-[#D4A853]/50' : 'bg-[#050507] border-[#1e1e28]'
                }`}
              >
                <div className="text-[10px] text-[#9ca3af] mb-1">Day {i + 1}</div>
                <div className="text-xs font-medium line-clamp-2">{title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
