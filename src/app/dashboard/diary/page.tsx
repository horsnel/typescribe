'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Calendar, Plus, Loader2, Star, MapPin, RotateCcw, Film, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DiaryEntryForm from '@/components/review/DiaryEntryForm';

interface DiaryEntry {
  id: string;
  movie_id: number;
  movie_title: string;
  poster_path?: string | null;
  watched_on: string;
  rating?: number | null;
  rewatch?: boolean;
  location?: string | null;
  notes?: string | null;
  genres?: string[] | null;
  release_year?: number | null;
  created_at: string;
}

function resolvePoster(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `https://image.tmdb.org/t/p/w185${path}`;
  return path;
}

export default function DashboardDiaryPage() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState<'recent' | 'rating' | 'rewatch'>('recent');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diary?limit=200', { cache: 'no-store' });
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const data = await res.json();
      setEntries(data?.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchEntries();
  }, [isAuthenticated, fetchEntries]);

  const handleDelete = async (id: string) => {
    // Optimistic delete
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[dashboard/diary] delete failed:', data?.error ?? res.status);
        fetchEntries(); // re-sync
      }
    } catch (err) {
      console.error('[dashboard/diary] delete error:', err);
      fetchEntries();
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    switch (sort) {
      case 'rating':
        return (b.rating ?? 0) - (a.rating ?? 0);
      case 'rewatch':
        return (b.rewatch ? 1 : 0) - (a.rewatch ? 1 : 0) || new Date(b.watched_on).getTime() - new Date(a.watched_on).getTime();
      default:
        return new Date(b.watched_on).getTime() - new Date(a.watched_on).getTime();
    }
  });

  // Group entries by month for visual organization
  const entriesByMonth = new Map<string, DiaryEntry[]>();
  for (const e of sortedEntries) {
    const d = new Date(e.watched_on);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!entriesByMonth.has(key)) entriesByMonth.set(key, []);
    entriesByMonth.get(key)!.push(e);
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
        <p className="text-[#9ca3af]">Please sign in to view your watch diary.</p>
        <Link href="/login" className="text-[#D4A853] hover:underline text-sm mt-2 inline-block">Sign In</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch Diary</h1>
          <p className="text-xs text-[#6b7280] mt-1">Every movie you watch, all in one place</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#D4A853]"
          >
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rated</option>
            <option value="rewatch">Rewatches First</option>
          </select>
          <Button
            onClick={() => setShowForm(s => !s)}
            className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Log a Watch
          </Button>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-8">
          <DiaryEntryForm
            onSubmitted={() => {
              setShowForm(false);
              fetchEntries();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{loading ? '—' : entries.length}</p>
          <p className="text-xs text-[#6b7280]">Total Watches</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {loading ? '—' : (entries.length > 0 ? (entries.reduce((s, e) => s + (e.rating ?? 0), 0) / Math.max(1, entries.filter(e => e.rating != null).length)).toFixed(1) : '--')}
          </p>
          <p className="text-xs text-[#6b7280]">Average Rating</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{loading ? '—' : entries.filter(e => e.rewatch).length}</p>
          <p className="text-xs text-[#6b7280]">Rewatches</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
          <span className="ml-3 text-[#6b7280]">Loading your diary...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedEntries.length === 0 && (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">Your diary is empty</h2>
          <p className="text-[#9ca3af] mb-6">Log every movie you watch to build your personal viewing history.</p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Log Your First Watch
          </Button>
        </div>
      )}

      {/* Diary entries grouped by month */}
      {!loading && sortedEntries.length > 0 && (
        <div className="space-y-8">
          {[...entriesByMonth.entries()].map(([monthLabel, monthEntries]) => (
            <div key={monthLabel}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{monthLabel}</h2>
                <div className="flex-1 h-px bg-[#1e1e28]" />
              </div>
              <div className="space-y-3">
                {monthEntries.map((entry) => (
                  <div key={entry.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors flex items-start gap-4">
                    {/* Poster */}
                    {entry.poster_path ? (
                      <img
                        src={resolvePoster(entry.poster_path)}
                        alt={entry.movie_title}
                        className="w-12 h-18 object-cover rounded-md flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-18 bg-[#1a1a22] rounded-md flex-shrink-0 flex items-center justify-center">
                        <Film className="w-4 h-4 text-[#3a3a45]" strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/movie/${encodeURIComponent(entry.movie_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${entry.movie_id}`}
                          className="text-base font-semibold text-white truncate hover:text-[#D4A853] transition-colors"
                        >
                          {entry.movie_title}
                        </Link>
                        {entry.release_year && <span className="text-xs text-[#6b7280]">({entry.release_year})</span>}
                        {entry.rewatch && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                            <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> REWATCH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#6b7280] mb-2 flex-wrap">
                        <span>{new Date(entry.watched_on).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        {entry.rating != null && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-[#D4A853] fill-[#D4A853]" strokeWidth={0} />
                            <span className="font-bold text-[#D4A853]">{entry.rating}/10</span>
                          </span>
                        )}
                        {entry.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" strokeWidth={1.5} /> {entry.location}
                          </span>
                        )}
                      </div>
                      {entry.notes && <p className="text-sm text-[#9ca3af] leading-relaxed line-clamp-2">{entry.notes}</p>}
                      {entry.genres && entry.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.genres.slice(0, 4).map((g, i) => (
                            <span key={`${g}-${i}`} className="text-[10px] px-2 py-0.5 bg-[#1a1a22] text-[#9ca3af] rounded-full">{g}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-[#6b7280] hover:text-red-400 transition-colors rounded-lg hover:bg-[#111118] flex-shrink-0"
                      aria-label="Delete diary entry"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
