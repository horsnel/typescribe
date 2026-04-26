'use client';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Wand2, Star, Play } from 'lucide-react';
import type { Movie } from '@/lib/types';

function AnimeCard({ anime }: { anime: Movie }) {
  const year = anime.release_date ? anime.release_date.split('-')[0] : '';
  const genreNames = anime.genres.slice(0, 2).map((g) => g.name);
  const seasonTag = anime.anime_season;

  return (
    <Link
      href={`/movie/${anime.slug}`}
      className="group relative flex-shrink-0 w-[180px] sm:w-[200px] cursor-pointer block"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10]">
        <img
          src={anime.poster_path}
          alt={anime.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {/* Anime badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          <Wand2 className="w-2.5 h-2.5" /> ANIME
        </div>
        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#f5c518] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
          <Star className="w-3 h-3 fill-black" />{anime.vote_average.toFixed(1)}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Play className="w-4 h-4 text-white fill-white" />
            <span className="text-sm font-medium text-white">View Details</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
          {anime.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {seasonTag && (
            <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              {seasonTag}
            </span>
          )}
          {year && !seasonTag && (
            <span className="text-xs text-[#9ca3af]">{year}</span>
          )}
          {genreNames.map((g) => (
            <span key={g} className="text-[10px] font-medium text-[#9ca3af] bg-[#0c0c10] border border-white/[0.06] px-2 py-0.5 rounded-full">
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function TrendingAnimeSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [animeList, setAnimeList] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' });
  };

  useEffect(() => {
    fetch('/api/anime/trending')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0) {
          setAnimeList(data.movies);
          setSources(data.sources || []);
        }
      })
      .catch(() => {
        // Silently fail — section just won't show
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && animeList.length === 0) return null;

  return (
    <section id="anime-trending" className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Trending Anime</h2>
            {sources.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {sources.join(' + ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-purple-500 hover:text-purple-400 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-purple-500 hover:text-purple-400 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Link
              href="/browse?format=anime"
              className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-purple-400 transition-colors"
            >
              Browse All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="ml-3 text-[#6b7280] text-sm">Loading anime...</span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-6 px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {animeList.map((anime) => (
              <div key={anime.id} className="snap-start flex-shrink-0">
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        )}
        <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </section>
  );
}
