'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Calendar, Users, Film } from 'lucide-react';

interface Party {
  id: string;
  host_id: string;
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  scheduled_for: string;
  room_code: string;
  status: string;
  attendee_count: number;
}
interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { id: string; display_name: string; avatar: string };
}

export default function WatchPartyPage() {
  const params = useParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/watch-parties?id=${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setParty(data.party);
          setChat(data.chat ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  // Poll chat every 3s
  useEffect(() => {
    if (!params.id) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/watch-parties?id=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setChat(data.chat ?? []);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  async function send() {
    if (!msg.trim() || !party) return;
    setSending(true);
    try {
      await fetch('/api/watch-parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', party_id: party.id, body: msg }),
      });
      setMsg('');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white px-6 text-center">
        <Film className="w-12 h-12 text-[#5b5b6b] mb-4" />
        <p className="text-[#9ca3af] mb-4">Watch party not found.</p>
        <Link href="/" className="text-[#D4A853]">Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-6">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-start gap-4 mb-6">
          {party.poster_path && (
             
            <img src={`https://image.tmdb.org/t/p/w200${party.poster_path}`} alt="" className="w-20 rounded-lg" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{party.movie_title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9ca3af] mt-1">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(party.scheduled_for).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {party.attendee_count} attending</span>
              <span className="bg-[#D4A853]/15 text-[#D4A853] px-2 py-0.5 rounded font-mono">{party.room_code}</span>
              <span className={`px-2 py-0.5 rounded uppercase font-bold ${party.status === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-[#1e1e28] text-[#9ca3af]'}`}>
                {party.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.length === 0 ? (
              <p className="text-center text-[#6b7280] text-sm py-8">No messages yet. Say hi!</p>
            ) : chat.map(m => (
              <div key={m.id} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[#D4A853]/20 flex items-center justify-center text-xs font-bold text-[#D4A853] flex-shrink-0">
                  {m.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{m.author?.display_name ?? 'Anonymous'}</span>
                    <span className="text-[10px] text-[#6b7280]">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-[#d4d4d4] break-words">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-[#1e1e28] p-3 flex gap-2">
            <input
              type="text"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#5b5b6b] outline-none focus:border-[#D4A853]/50"
            />
            <button
              onClick={send}
              disabled={sending || !msg.trim()}
              className="px-4 py-2 bg-[#D4A853] text-black rounded-lg disabled:opacity-30 hover:bg-[#B8922F] transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
