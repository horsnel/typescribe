'use client';
import { Suspense } from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search as SearchIcon, TrendingUp, Clock, X, Film, MessageSquare, Newspaper, Star, ArrowRight, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { genres } from '@/lib/data';
import type { Movie, PersonSearchResult } from '@/lib/types';
import MovieCard from '@/components/movie/MovieCard';

import { resolveImageUrl, handleImageError, personSlug } from '@/lib/utils';

type Tab = 'movies' | 'people' | 'reviews' | 'news';

function SearchContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [tab, setTab] = useState<Tab>('movies');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // API integration
  const [apiMovies, setApiMovies] = useState<Movie[]>([]);
  const [apiPeople, setApiPeople] = useState<PersonSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fromAPI, setFromAPI] = useState(false);

  // Sync query from URL when arriving via SearchOverlay "View all results" link
  useEffect(() => {
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  // Load recent searches
  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_recent_searches');
      if (data) setRecentSearches(JSON.parse(data));
    } catch { /* ignore */ }
  }, []);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) { setApiMovies([]); setApiPeople([]); setFromAPI(false); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieRes, peopleRes] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' }),
          fetch(`/api/people/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' }),
        ]);
        if (movieRes.ok) {
          const data = await movieRes.json();
          setApiMovies(data.movies || []);
          setFromAPI(data.fromAPI || false);
        }
        if (peopleRes.ok) {
          const data = await peopleRes.json();
          setApiPeople(data.results || []);
        }
      } catch { setFromAPI(false); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem('typescribe_recent_searches', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const q = query.toLowerCase();
  // All search results come from the API (free-tier pipeline)
  const movieResults = apiMovies;
  const reviewResults: any[] = [];
  const newsResults: any[] = [];

  const totalResults = movieResults.length + apiPeople.length + reviewResults.length + newsResults.length;

  // Trending searches — popular anime/movie terms
  const trendingSearches = ['Attack on Titan', 'Jujutsu Kaisen', 'One Piece', 'Demon Slayer', 'Frieren', 'Solo Leveling'];

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">Search</h1>

        {/* Search Input */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280] z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) saveRecentSearch(query.trim()); }}
            placeholder="Search movies, reviews, news, actors, directors..."
            className="w-full bg-[#0c0c10] border border-[#1e1e28] rounded-full py-3.5 pl-12 pr-14 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full text-[#6b7280] hover:text-white hover:bg-white/10 transition-colors z-10"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* No query state - show suggestions */}
        {!q && (
          <div className="space-y-8 mt-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
                  <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider">Recent Searches</h3>
                  <button onClick={() => { setRecentSearches([]); try { localStorage.removeItem('typescribe_recent_searches'); } catch {} }} className="text-xs text-[#6b7280] hover:text-white ml-auto">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button key={search} onClick={() => handleSearch(search)} className="px-3 py-1.5 bg-[#0c0c10] border border-[#1e1e28] rounded-full text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider">Trending Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((search) => (
                  <button key={search} onClick={() => handleSearch(search)} className="px-3 py-1.5 bg-[#0c0c10] border border-[#1e1e28] rounded-full text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">
                    {search}
                  </button>
                ))}
              </div>
            </div>

            {/* Browse by Genre */}
            <div>
              <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Browse by Genre</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {genres.slice(0, 9).map((genre) => (
                  <Link key={genre.id} href={`/category/${genre.id}`} className="flex items-center justify-between bg-[#0c0c10] border border-[#1e1e28] rounded-lg p-3 hover:border-[#3a3a45] transition-colors group">
                    <span className="text-sm text-[#9ca3af] group-hover:text-white transition-colors">{genre.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#D4A853] transition-colors" strokeWidth={1.5} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {q && (
          <>
            {isSearching && (
              <div className="flex items-center gap-2 mb-4 text-sm text-[#6b7280]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> Searching for &ldquo;{query}&rdquo;...
              </div>
            )}

            <div className="flex gap-4 mb-6 border-b border-[#1e1e28]">
              {(['movies', 'people', 'reviews', 'news'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-3 text-sm font-medium transition-colors capitalize flex items-center gap-2 ${
                    tab === t ? 'text-white border-b-2 border-[#D4A853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
                  }`}
                >
                  {t === 'movies' && <Film className="w-4 h-4" strokeWidth={1.5} />}
                  {t === 'people' && <User className="w-4 h-4" strokeWidth={1.5} />}
                  {t === 'reviews' && <MessageSquare className="w-4 h-4" strokeWidth={1.5} />}
                  {t === 'news' && <Newspaper className="w-4 h-4" strokeWidth={1.5} />}
                  {t} ({t === 'movies' ? movieResults.length : t === 'people' ? apiPeople.length : t === 'reviews' ? reviewResults.length : newsResults.length})
                </button>
              ))}
            </div>

            {tab === 'movies' && (
              movieResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {movieResults.map((m) => <MovieCard key={m.id} movie={m} />)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[#9ca3af] mb-1">No movies found</p>
                  <p className="text-sm text-[#6b7280]">Try a different search term or browse by genre</p>
                </div>
              )
            )}

            {tab === 'people' && (
              apiPeople.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {apiPeople.map((person) => (
                    <Link
                      key={person.id}
                      href={`/person/${personSlug(person.name, person.id)}`}
                      className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-[#050507] border-2 border-[#1e1e28] flex-shrink-0 group-hover:border-[#D4A853]/50 transition-colors">
                        {person.profile_path ? (
                          <img
                            src={person.profile_path}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            loading="lazy"
                            onError={(e) => handleImageError(e, 'person')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
                            <User className="w-6 h-6 text-[#6b7280]" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#D4A853] transition-colors truncate">{person.name}</h3>
                        <span className="text-xs text-[#D4A853] font-medium">{person.known_for_department}</span>
                        {person.known_for.length > 0 && (
                          <p className="text-[10px] text-[#6b7280] mt-1 truncate">
                            Known for: {person.known_for.map((kf) => kf.title).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <User className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[#9ca3af] mb-1">No people found</p>
                  <p className="text-sm text-[#6b7280]">Try searching for an actor or director</p>
                </div>
              )
            )}

            {tab === 'reviews' && (
              reviewResults.length > 0 ? (
                <div className="space-y-4">
                  {reviewResults.map((r: any) => (
                    <div key={r.id} className="block bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{r.user_name}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-[#D4A853] fill-[#D4A853]" strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-[#D4A853]">{r.rating}/10</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#9ca3af] line-clamp-3">{r.text}</p>
                      <p className="text-xs text-[#6b7280] mt-2">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[#9ca3af]">No reviews found</p>
                </div>
              )
            )}

            {tab === 'news' && (
              newsResults.length > 0 ? (
                <div className="space-y-4">
                  {newsResults.map((n) => (
                    <a key={n.id} href={n.url !== '#' ? n.url : undefined} className="block bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
                      <h3 className="text-sm font-semibold text-white mb-2">{n.title}</h3>
                      <p className="text-sm text-[#9ca3af] line-clamp-2">{n.excerpt}</p>
                      <p className="text-xs text-[#6b7280] mt-2">{n.source} · {n.date}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Newspaper className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[#9ca3af]">No news found</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" strokeWidth={1.5} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
