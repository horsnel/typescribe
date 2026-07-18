'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Brain, Check, X } from 'lucide-react';

interface Trivia {
  date: string;
  movie_id: number;
  question: string;
  choices: string[];
}
interface Result {
  correct: boolean;
  correct_idx: number;
  explanation: string;
  score: number;
}

export default function TriviaPage() {
  const [trivia, setTrivia] = useState<Trivia | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/daily-trivia')
      .then(r => r.json())
      .then(d => setTrivia(d))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/daily-trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_idx: selected }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  if (!trivia) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white">
        <Brain className="w-12 h-12 text-[#5b5b6b] mb-4" />
        <p className="text-[#9ca3af]">No trivia today.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Daily Trivia</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">{trivia.date} · A new question every day.</p>

        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6">
          <Link href={`/movie/${trivia.movie_id}`} className="text-xs text-[#D4A853] hover:underline">Movie {trivia.movie_id}</Link>
          <h2 className="text-lg font-semibold mt-2 mb-4">{trivia.question}</h2>

          <div className="space-y-2">
            {trivia.choices.map((c, i) => {
              const isSelected = selected === i;
              const isCorrect = result && i === result.correct_idx;
              const isWrong = result && isSelected && !result.correct;
              return (
                <button
                  key={i}
                  onClick={() => !result && setSelected(i)}
                  disabled={!!result}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition flex items-center justify-between ${
                    isCorrect ? 'bg-green-500/15 border-green-500/40' :
                    isWrong ? 'bg-red-500/15 border-red-500/40' :
                    isSelected ? 'bg-[#D4A853]/15 border-[#D4A853]/50' :
                    'bg-[#050507] border-[#1e1e28] hover:border-[#D4A853]/30'
                  }`}
                >
                  <span>{c}</span>
                  {isCorrect && <Check className="w-4 h-4 text-green-500" />}
                  {isWrong && <X className="w-4 h-4 text-red-500" />}
                </button>
              );
            })}
          </div>

          {!result ? (
            <button
              onClick={submit}
              disabled={selected === null || submitting}
              className="mt-4 w-full py-3 bg-[#D4A853] text-black font-bold rounded-lg hover:bg-[#B8922F] transition disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit Answer
            </button>
          ) : (
            <div className={`mt-4 p-4 rounded-lg border ${result.correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-sm font-semibold mb-1">
                {result.correct ? '✅ Correct!' : '❌ Not quite.'}
              </p>
              <p className="text-sm text-[#d4d4d4]">{result.explanation}</p>
              <p className="text-xs text-[#9ca3af] mt-2">+{result.score} XP</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
