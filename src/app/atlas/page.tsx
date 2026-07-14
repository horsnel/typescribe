'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Globe2, Film } from 'lucide-react';

interface CountryFilms {
  code: string;
  name: string;
  flag: string;
  filmCount: number;
  films: { id: number; title: string; poster_url: string; year: number }[];
}

export default function AtlasPage() {
  const [countries, setCountries] = useState<CountryFilms[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cinema-atlas')
      .then(r => r.json())
      .then(d => setCountries(d.countries ?? []))
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
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Globe2 className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Global Cinema Atlas</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-8">
          Browse world cinema one country at a time. Click a flag to see curated films from that nation.
        </p>

        {/* Country grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {countries.map(c => (
            <button
              key={c.code}
              onClick={() => setSelected(selected === c.code ? null : c.code)}
              className={`p-4 bg-[#0c0c10] border rounded-xl text-center transition ${
                selected === c.code ? 'border-[#D4A853]/50 bg-[#D4A853]/10' : 'border-[#1e1e28] hover:border-[#D4A853]/30'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.flag} alt={c.name} className="w-12 h-8 mx-auto mb-2 object-cover rounded" />
              <div className="text-xs font-semibold">{c.name}</div>
              <div className="text-[10px] text-[#9ca3af]">{c.filmCount} films</div>
            </button>
          ))}
        </div>

        {/* Selected country films */}
        {selected && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#D4A853] mb-4 uppercase tracking-wide">
              {countries.find(c => c.code === selected)?.name} Cinema
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {countries.find(c => c.code === selected)?.films.map(f => (
                <Link
                  key={f.id}
                  href={`/movie/${f.id}`}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#050507] border border-[#1e1e28] hover:border-[#D4A853]/50 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.poster_url} alt={f.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <h4 className="text-xs font-semibold line-clamp-2">{f.title}</h4>
                    <span className="text-[10px] text-[#D4A853]">{f.year}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
