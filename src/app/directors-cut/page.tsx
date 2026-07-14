'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, MessageSquareQuote, Sparkles } from 'lucide-react';

const SUGGESTED = [
  'What is the central metaphor of the film?',
  'How does the cinematography reinforce the theme?',
  'What was the director trying to say about family?',
  'Why does the protagonist make that choice at the end?',
  'How does the score shape the emotional arc?',
];

export default function DirectorsCutPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('');

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      // Use a placeholder movieId/title for demo — in production we'd pass them from the movie page
      const res = await fetch('/api/directors-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: 278, movieTitle: 'The Shawshank Redemption', question }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? data.error ?? 'No answer');
      setSource(data.source ?? '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <MessageSquareQuote className="w-7 h-7 text-[#D4A853]" />
          <h1 className="text-3xl font-extrabold">Director&apos;s Cut</h1>
        </div>
        <p className="text-[#9ca3af] text-sm mb-6">
          AI-powered deep-dive Q&amp;A about any film. Ask about themes, cinematography, character motivations, and more.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="Ask anything about The Shawshank Redemption…"
            className="flex-1 px-4 py-3 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-white placeholder:text-[#5b5b6b] outline-none focus:border-[#D4A853]/50"
          />
          <button
            onClick={ask}
            disabled={loading}
            className="px-5 py-3 bg-[#D4A853] text-black font-bold rounded-lg hover:bg-[#B8922F] transition flex items-center gap-2 disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {SUGGESTED.map(q => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-xs px-2.5 py-1 bg-[#D4A853]/10 border border-[#D4A853]/20 text-[#D4A853] rounded-full hover:bg-[#D4A853]/20"
            >
              {q}
            </button>
          ))}
        </div>

        {answer && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#D4A853]" />
              <span className="text-xs text-[#9ca3af] uppercase tracking-wide">Answer · {source}</span>
            </div>
            <p className="text-sm text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
