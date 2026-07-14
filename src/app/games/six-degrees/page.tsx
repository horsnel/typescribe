'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, Plus, X, Send, Network } from 'lucide-react';

interface Puzzle {
  start_actor: string;
  end_actor: string;
  hint: string;
  max_links: number;
}

interface ChainEntry { actor: string; movie: string; }

export default function SixDegreesPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [chain, setChain] = useState<ChainEntry[]>([]);
  const [actorInput, setActorInput] = useState('');
  const [movieInput, setMovieInput] = useState('');
  const [result, setResult] = useState<{ score: number; links: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/six-degrees').then(r => r.json()).then(setPuzzle);
  }, []);

  function addLink() {
    if (!actorInput || !movieInput) return;
    setChain(prev => [...prev, { actor: actorInput, movie: movieInput }]);
    setActorInput('');
    setMovieInput('');
  }

  function removeLink(i: number) {
    setChain(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/six-degrees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  function newPuzzle() {
    setChain([]);
    setResult(null);
    fetch('/api/six-degrees').then(r => r.json()).then(setPuzzle);
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Network className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Six Degrees</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">{puzzle.hint}</p>

        {/* Puzzle */}
        <div className="bg-gradient-to-br from-[#D4A853]/15 to-transparent border border-[#D4A853]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-xs text-[#9ca3af] uppercase tracking-wide">Start</p>
              <p className="text-xl font-bold text-[#D4A853]">{puzzle.start_actor}</p>
            </div>
            <Sparkles className="w-5 h-5 text-[#D4A853]" />
            <div className="text-center flex-1">
              <p className="text-xs text-[#9ca3af] uppercase tracking-wide">End</p>
              <p className="text-xl font-bold text-[#D4A853]">{puzzle.end_actor}</p>
            </div>
          </div>
        </div>

        {/* Chain */}
        {chain.length > 0 && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-4 mb-4">
            <ol className="space-y-2">
              {chain.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#D4A853] font-bold">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="font-medium">{c.actor}</span>
                    <span className="text-[#9ca3af]"> — via </span>
                    <span className="italic text-[#9ca3af]">{c.movie}</span>
                  </div>
                  {!result && (
                    <button onClick={() => removeLink(i)} className="text-[#9ca3af] hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Add link form */}
        {!result && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-4 mb-4">
            <p className="text-xs text-[#9ca3af] uppercase tracking-wide mb-3">
              {chain.length === 0 ? `Add an actor who appeared with ${puzzle.start_actor}` : `Add an actor who appeared with ${chain[chain.length-1].actor}`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={actorInput}
                onChange={e => setActorInput(e.target.value)}
                placeholder="Actor name"
                className="flex-1 px-3 py-2 bg-[#050507] border border-[#1e1e28] rounded-lg text-sm outline-none focus:border-[#D4A853]/50"
              />
              <input
                type="text"
                value={movieInput}
                onChange={e => setMovieInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
                placeholder="Movie they share"
                className="flex-1 px-3 py-2 bg-[#050507] border border-[#1e1e28] rounded-lg text-sm outline-none focus:border-[#D4A853]/50"
              />
              <button
                onClick={addLink}
                disabled={!actorInput || !movieInput}
                className="px-4 py-2 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-lg disabled:opacity-30 hover:bg-[#D4A853]/20 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!result ? (
          <button
            onClick={submit}
            disabled={submitting || chain.length === 0}
            className="w-full py-3 bg-[#D4A853] text-black font-bold rounded-lg hover:bg-[#B8922F] transition disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Chain
          </button>
        ) : (
          <div className="bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-2xl p-6 text-center mb-4">
            <p className="text-3xl font-extrabold text-[#D4A853]">{result.score} XP</p>
            <p className="text-sm text-[#9ca3af] mt-1">{result.links} links used (max {puzzle.max_links})</p>
            <button
              onClick={newPuzzle}
              className="mt-4 px-4 py-2 bg-[#D4A853] text-black rounded-lg text-sm font-medium hover:bg-[#B8922F]"
            >
              New Puzzle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
