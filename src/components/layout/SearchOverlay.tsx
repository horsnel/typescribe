'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Film, MessageSquare, Newspaper, Loader2 } from 'lucide-react';
import { movies, userReviews, newsItems } from '@/lib/data';

interface SearchOverlayProps { isOpen: boolean; onClose: () => void; }
interface SearchResult { type: 'movie' | 'review' | 'news'; id: number; title: string; subtitle: string; image?: string; slug?: string; url?: string; }

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search both local mock data AND the API
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); setSelectedIndex(-1); return; }

    const q = debouncedQuery.toLowerCase();

    // Local mock results (instant)
    const movieResults: SearchResult[] = movies.filter((m) =>
      m.title.toLowerCase().includes(q) || m.genres.some((g) => g.name.toLowerCase().includes(q)) || m.director.toLowerCase().includes(q)
    ).slice(0, 5).map((m) => ({
      type: 'movie' as const, id: m.id, title: m.title,
      subtitle: `${m.release_date.split('-')[0]} · ${m.genres.map((g) => g.name).join(', ')}`,
      image: m.poster_path, slug: m.slug,
    }));

    const reviewResults: SearchResult[] = userReviews.filter((r) =>
      r.text.toLowerCase().includes(q) || r.user_name.toLowerCase().includes(q)
    ).slice(0, 3).map((r) => {
      const movie = movies.find((m) => m.id === r.movie_id);
      return { type: 'review' as const, id: r.id, title: r.user_name, subtitle: `Review of ${movie?.title || 'Unknown'} · ${r.rating}/10`, image: r.user_avatar, slug: movie?.slug };
    });

    const newsResults: SearchResult[] = newsItems.filter((n) =>
      n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q)
    ).slice(0, 3).map((n) => ({ type: 'news' as const, id: n.id, title: n.title, subtitle: `${n.source} · ${n.date}`, image: n.image, url: n.url }));

    const localResults = [...movieResults, ...reviewResults, ...newsResults];
    setResults(localResults);
    setSelectedIndex(-1);

    // Also search the API for more results
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.results?.length) {
          const apiResults: SearchResult[] = data.results.slice(0, 8).map((m: any) => ({
            type: 'movie' as const,
            id: m.id || m.tmdb_id,
            title: m.title,
            subtitle: `${m.release_date?.split('-')[0] || ''} · ${(m.genres || []).map((g: any) => g.name || g).join(', ')}`,
            image: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w92${m.poster_path}`) : undefined,
            slug: m.slug,
          }));
          // Merge: prioritize API results, remove duplicates
          const existingTitles = new Set(localResults.map(r => r.title.toLowerCase()));
          const newApiResults = apiResults.filter(r => !existingTitles.has(r.title.toLowerCase()));
          setResults([...localResults, ...newApiResults]);
        }
      })
      .catch(() => {})
      .finally(() => setIsSearching(false));

  }, [debouncedQuery]);

  useEffect(() => {
    if (isOpen) { setQuery(''); setDebouncedQuery(''); setResults([]); setSelectedIndex(-1); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => Math.max(prev - 1, -1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) handleSelect(results[selectedIndex]);
        else if (debouncedQuery.trim()) { router.push(`/search?q=${encodeURIComponent(debouncedQuery)}`); onClose(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, onClose, debouncedQuery, router]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'movie' && result.slug) router.push(`/movie/${result.slug}`);
    else if (result.type === 'review' && result.slug) router.push(`/movie/${result.slug}`);
    else if (result.type === 'news') router.push('/news');
    onClose();
  }, [router, onClose]);

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-[#d4a853]/30 text-white rounded px-0.5">{part}</mark> : part);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) { case 'movie': return <Film className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />; case 'review': return <MessageSquare className="w-4 h-4 text-[#f5c518]" strokeWidth={1.5} />; case 'news': return <Newspaper className="w-4 h-4 text-[#22c55e]" strokeWidth={1.5} />; }
  };

  const movieResults = results.filter((r) => r.type === 'movie');
  const reviewResults = results.filter((r) => r.type === 'review');
  const newsResults = results.filter((r) => r.type === 'news');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#050507]/90 backdrop-blur-md flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e1e28]">
            <Search className="w-5 h-5 text-[#6b7280] flex-shrink-0" strokeWidth={1.5} />
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies, anime, reviews, news..." className="flex-1 bg-transparent text-white placeholder:text-[#6b7280] focus:outline-none text-lg" />
            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[#6b7280]" strokeWidth={1.5} />}
            <button onClick={onClose} className="p-1.5 text-[#6b7280] hover:text-white transition-colors" aria-label="Close search"><X className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>
          {debouncedQuery && (
            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 && !isSearching ? (
                <div className="px-5 py-10 text-center"><p className="text-[#9ca3af]">No results for &ldquo;{debouncedQuery}&rdquo;</p><p className="text-xs text-[#6b7280] mt-1">Try a different search term</p></div>
              ) : (
                <>
                  {movieResults.length > 0 && (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2 px-1">{getIcon('movie')}<span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Movies & Anime</span></div>
                      {movieResults.map((result) => { const globalIdx = results.indexOf(result); return (
                        <button key={`movie-${result.id}`} onClick={() => handleSelect(result)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedIndex === globalIdx ? 'bg-[#111118]' : 'hover:bg-[#111118]'}`}>
                          {result.image && <div className="w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[#050507]"><img src={result.image} alt={result.title} className="w-full h-full object-cover" /></div>}
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{highlightMatch(result.title, debouncedQuery)}</p><p className="text-xs text-[#6b7280]">{result.subtitle}</p></div>
                        </button>); })}
                    </div>
                  )}
                  {reviewResults.length > 0 && (
                    <div className="px-4 py-3 border-t border-[#1e1e28]">
                      <div className="flex items-center gap-2 mb-2 px-1">{getIcon('review')}<span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Reviews</span></div>
                      {reviewResults.map((result) => { const globalIdx = results.indexOf(result); return (
                        <button key={`review-${result.id}`} onClick={() => handleSelect(result)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedIndex === globalIdx ? 'bg-[#111118]' : 'hover:bg-[#111118]'}`}>
                          {result.image && <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#050507]"><img src={result.image} alt={result.title} className="w-full h-full object-cover" /></div>}
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{highlightMatch(result.title, debouncedQuery)}</p><p className="text-xs text-[#6b7280]">{result.subtitle}</p></div>
                        </button>); })}
                    </div>
                  )}
                  {newsResults.length > 0 && (
                    <div className="px-4 py-3 border-t border-[#1e1e28]">
                      <div className="flex items-center gap-2 mb-2 px-1">{getIcon('news')}<span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">News</span></div>
                      {newsResults.map((result) => { const globalIdx = results.indexOf(result); return (
                        <button key={`news-${result.id}`} onClick={() => handleSelect(result)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedIndex === globalIdx ? 'bg-[#111118]' : 'hover:bg-[#111118]'}`}>
                          {result.image && <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#050507]"><img src={result.image} alt={result.title} className="w-full h-full object-cover" /></div>}
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{highlightMatch(result.title, debouncedQuery)}</p><p className="text-xs text-[#6b7280]">{result.subtitle}</p></div>
                        </button>); })}
                    </div>
                  )}
                  {/* View All Results Link */}
                  <div className="px-4 py-3 border-t border-[#1e1e28]">
                    <button
                      onClick={() => { router.push(`/search?q=${encodeURIComponent(debouncedQuery)}`); onClose(); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[#d4a853] hover:bg-[#d4a853]/10 transition-colors text-sm font-medium"
                    >
                      <Search className="w-4 h-4" strokeWidth={1.5} /> View all results for &ldquo;{debouncedQuery}&rdquo;
                    </button>
                  </div>
                </>
              )}
              <div className="px-5 py-3 border-t border-[#1e1e28] flex items-center justify-between text-xs text-[#6b7280]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[#050507] rounded border border-[#1e1e28]">↑↓</kbd> Navigate</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[#050507] rounded border border-[#1e1e28]">↵</kbd> Select</span>
                  <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-[#050507] rounded border border-[#1e1e28]">esc</kbd> Close</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
