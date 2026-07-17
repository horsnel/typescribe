'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Film, MessageSquare, Newspaper, Loader2 } from 'lucide-react';

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

  // Live API search — no local mock data
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); setSelectedIndex(-1); return; }

    setResults([]);
    setSelectedIndex(-1);
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.results?.length) {
          const apiResults: SearchResult[] = data.results.slice(0, 12).map((m: any) => ({
            type: 'movie' as const,
            id: m.id || m.tmdb_id,
            title: m.title,
            subtitle: `${m.release_date?.split('-')[0] || ''} · ${(m.genres || []).map((g: any) => g.name || g).join(', ')}`.trim().replace(/^·\s|·\s$/g, ''),
            image: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w92${m.poster_path}`) : undefined,
            slug: m.slug,
          }));
          setResults(apiResults);
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
    return parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-[#D4A853]/30 text-white rounded px-0.5">{part}</mark> : part);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) { case 'movie': return <Film className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />; case 'review': return <MessageSquare className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />; case 'news': return <Newspaper className="w-4 h-4 text-[#22c55e]" strokeWidth={1.5} />; }
  };

  const movieResults = results.filter((r) => r.type === 'movie');
  const reviewResults = results.filter((r) => r.type === 'review');
  const newsResults = results.filter((r) => r.type === 'news');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#050507]/90 backdrop-blur-md flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-2xl">
        {/* ─── Pill-shaped search input (matches /vibe, /browse, /search bars) ─── */}
        <div className="flex items-center gap-2 sm:gap-3 pl-5 pr-2 sm:pr-5 py-2 sm:py-3 bg-[#0c0c10] border border-[#1e1e28] rounded-full shadow-2xl focus-within:border-[#D4A853]/50 transition-colors">
          <Search className="w-5 h-5 text-[#D4A853] flex-shrink-0" strokeWidth={1.5} />
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies, anime, reviews, news..." className="flex-1 min-w-0 bg-transparent text-white placeholder:text-[#6b7280] focus:outline-none text-base sm:text-lg" />
          {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[#D4A853] flex-shrink-0" strokeWidth={1.5} />}
          {query && !isSearching && (
            <button onClick={() => setQuery('')} className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-[#6b7280] hover:text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Clear search">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
          <button onClick={onClose} className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-[#6b7280] hover:text-white hover:bg-white/10 rounded-full transition-colors" aria-label="Close search"><X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} /></button>
        </div>

        {/* ─── Results dropdown (separate panel below the pill) ─── */}
        {debouncedQuery && (
          <div className="mt-2 bg-[#0c0c10] border border-[#1e1e28] rounded-3xl shadow-2xl overflow-hidden">
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[#D4A853] hover:bg-[#D4A853]/10 transition-colors text-sm font-medium"
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
          </div>
        )}
      </div>
    </div>
  );
}
