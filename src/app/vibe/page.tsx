'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Search, Loader2, Film } from 'lucide-react';

const EXAMPLES = [
  'a slow-burn neo-noir with rain-soaked streets',
  'uplifting underdog sports story based on true events',
  'mind-bending sci-fi with a twist ending',
  'cozy studio ghibli vibe with strong female lead',
  'tense psychological horror in a single location',
  'sweeping historical epic about family and war',
];

interface VibeResult {
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  overview: string;
  genres: string[];
  release_date?: string | null;
  similarity?: number;
}

// Build a URL slug from a movie title + tmdb id, matching the format
// expected by /api/movies/slug/[slug] (e.g. "inception-27205").
function toSlug(title: string, id: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${id}`;
}

export default function VibePage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<VibeResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`/api/vibe-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-5 sm:mb-6">
          <ArrowLeft className="w-4 h-4 flex-shrink-0" /> Home
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#D4A853] flex-shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-extrabold">Vibe Search</h1>
        </div>
        <p className="text-[#9ca3af] text-xs sm:text-sm mb-5 sm:mb-6">
          Describe a feeling, mood, or vibe — get matched movies using semantic embeddings.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="e.g. a slow-burn neo-noir with rain-soaked streets"
            className="flex-1 min-w-0 px-4 py-2.5 sm:px-5 sm:py-3 bg-[#0c0c10] border border-[#1e1e28] rounded-full text-sm text-white placeholder:text-[#5b5b6b] focus:outline-none focus:border-[#D4A853]/50"
          />
          <button
            onClick={search}
            disabled={loading}
            className="flex-shrink-0 px-3 py-2.5 sm:px-5 sm:py-3 bg-[#D4A853] text-black font-bold rounded-full hover:bg-[#B8922F] transition flex items-center gap-2 disabled:opacity-30"
            aria-label="Search by vibe"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => { setQ(ex); }}
              className="text-[11px] sm:text-xs px-2.5 py-1 bg-[#D4A853]/10 border border-[#D4A853]/20 text-[#D4A853] rounded-full hover:bg-[#D4A853]/20 text-left"
            >
              {ex}
            </button>
          ))}
        </div>

        {results && (
          <div>
            {results.length === 0 ? (
              <div className="text-center py-12">
                <Film className="w-10 h-10 text-[#5b5b6b] mx-auto mb-3" />
                <p className="text-[#9ca3af] text-sm">No matches. Try a different vibe.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {results.map(r => {
                  const slug = toSlug(r.movie_title, r.movie_id);
                  const year = r.release_date ? r.release_date.split('-')[0] : '';
                  return (
                  <Link
                    key={r.movie_id}
                    href={`/movie/${slug}`}
                    className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#0c0c10] border border-[#1e1e28] hover:border-[#D4A853]/50 transition"
                  >
                    {r.poster_path ? (
                       
                      <img
                        src={`https://image.tmdb.org/t/p/w300${r.poster_path}`}
                        alt={r.movie_title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Hide broken image — fall back to text-only card
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      // No poster available — show title + genres as a placeholder
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
                        <Film className="w-6 h-6 text-[#3a3a45] mb-2" strokeWidth={1.5} />
                        <p className="text-xs font-semibold text-[#9ca3af] line-clamp-3">{r.movie_title}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h3 className="text-xs font-semibold text-white line-clamp-2">{r.movie_title}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {year && <span className="text-[10px] text-[#9ca3af]">{year}</span>}
                        {r.similarity != null && (
                          <>
                            <span className="text-[10px] text-[#5b5b6b]">·</span>
                            <span className="text-[10px] text-[#D4A853]">{(r.similarity * 100).toFixed(0)}% match</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
