'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Search, Loader2, Sparkles, RotateCcw } from 'lucide-react';

interface GridData {
  date: string;
  criteria: { decades: string[]; genres: string[] };
  cell_count: number;
}

interface SubmitResponse {
  score: number;
  correct: number;
  total: number;
  details: Record<number, { guess: number; correct: boolean; partial: boolean }>;
  solutions: { ids: number[]; titles: string[]; posters: string[] };
}

export default function GridPage() {
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [search, setSearch] = useState<Record<number, string>>({});
  const [results, setResults] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [movieResults, setMovieResults] = useState<Record<number, any[]>>({});

  useEffect(() => {
    fetch('/api/grid')
      .then(r => r.json())
      .then(d => setGrid(d))
      .finally(() => setLoading(false));
  }, []);

  async function searchMovies(i: number, q: string) {
    setSearch(prev => ({ ...prev, [i]: q }));
    if (q.length < 2) {
      setMovieResults(prev => ({ ...prev, [i]: [] }));
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=movie&limit=8`);
      const data = await res.json();
      setMovieResults(prev => ({ ...prev, [i]: data.results ?? [] }));
    } catch {}
  }

  async function submit() {
    setSubmitting(true);
    const guessMap: Record<string, number> = {};
    Object.entries(guesses).forEach(([k, v]) => { guessMap[k] = Number(v); });
    const res = await fetch('/api/grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: grid!.date, guesses: guessMap }),
    });
    const data = await res.json();
    setResults(data);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Immaculate Grid</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          Pick one movie that fits both the row genre and the column decade. 9 cells, 1 chance per day.
          Today: <span className="text-[#D4A853]">{grid?.date}</span>
        </p>

        {/* Grid */}
        {grid && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-4 mb-6">
            <div className="grid grid-cols-4 gap-2">
              {/* Header row */}
              <div className="aspect-square" />
              {grid.criteria.decades.map(d => (
                <div key={d} className="aspect-square flex items-center justify-center p-2 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-lg text-center">
                  <span className="text-xs font-bold text-[#D4A853]">{d}</span>
                </div>
              ))}

              {/* Body rows */}
              {grid.criteria.genres.map((g, ri) => (
                <>
                  <div key={`label-${g}`} className="aspect-square flex items-center justify-center p-2 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-lg text-center">
                    <span className="text-xs font-bold text-[#D4A853]">{g}</span>
                  </div>
                  {[0, 1, 2].map(ci => {
                    const i = ri * 3 + ci;
                    const guess = guesses[i];
                    const result = results?.details[i];
                    return (
                      <div
                        key={`cell-${i}`}
                        className={`aspect-square relative p-2 rounded-lg border transition ${
                          result
                            ? result.correct
                              ? 'bg-green-500/15 border-green-500/40'
                              : 'bg-red-500/15 border-red-500/40'
                            : 'bg-[#050507] border-[#1e1e28]'
                        }`}
                      >
                        {results && result && (
                          <div className="absolute inset-1 flex flex-col items-center justify-center text-center overflow-hidden">
                            {results.solutions.posters[i] && (
                               
                              <img src={results.solutions.posters[i]} alt="" className="w-full h-full object-cover rounded opacity-80 absolute inset-0" />
                            )}
                            <span className="relative z-10 text-[10px] font-semibold bg-black/70 px-1 py-0.5 rounded text-white">
                              {results.solutions.titles[i]}
                            </span>
                          </div>
                        )}
                        {!results && (
                          <div className="absolute inset-1 flex flex-col">
                            <input
                              type="text"
                              value={search[i] ?? ''}
                              onChange={e => searchMovies(i, e.target.value)}
                              placeholder="Search…"
                              className="w-full bg-transparent text-[10px] text-white placeholder:text-[#5b5b6b] outline-none mb-1"
                              disabled={!!guess}
                            />
                            {guess ? (
                              <div className="text-[10px] text-white truncate flex items-center justify-between">
                                <span>{movieResults[i]?.find(m => m.id === guess)?.title ?? `#${guess}`}</span>
                                <button onClick={() => setGuesses(prev => { const n = { ...prev }; delete n[i]; return n; })} className="text-[#9ca3af] hover:text-red-400">
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              (movieResults[i]?.length ?? 0) > 0 && (
                                <div className="absolute top-6 left-0 right-0 bg-[#0c0c10] border border-[#1e1e28] rounded-md max-h-32 overflow-auto z-10">
                                  {movieResults[i]!.slice(0, 5).map(m => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        setGuesses(prev => ({ ...prev, [i]: m.id }));
                                        setMovieResults(prev => ({ ...prev, [i]: [] }));
                                        setSearch(prev => ({ ...prev, [i]: m.title }));
                                      }}
                                      className="block w-full text-left px-2 py-1 text-[10px] text-white hover:bg-[#D4A853]/10 truncate"
                                    >
                                      {m.title} ({m.release_date?.slice(0, 4)})
                                    </button>
                                  ))}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>

            {!results && (
              <button
                onClick={submit}
                disabled={submitting || Object.keys(guesses).length < 9}
                className="mt-4 w-full py-3 bg-[#D4A853] text-black font-bold rounded-lg disabled:opacity-30 hover:bg-[#B8922F] transition flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Submit Grid
              </button>
            )}

            {results && (
              <div className="mt-4 p-4 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-lg text-center">
                <p className="text-2xl font-extrabold text-[#D4A853]">
                  {results.correct} / {results.total}
                </p>
                <p className="text-xs text-[#9ca3af] mt-1">+{results.score} XP</p>
                <button
                  onClick={() => { setResults(null); setGuesses({}); setSearch({}); }}
                  className="mt-3 text-xs text-[#9ca3af] hover:text-white"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
