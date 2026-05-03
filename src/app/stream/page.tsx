'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Play, Star, ChevronLeft, ChevronRight, Crown, Sparkles, Award, Swords, Palette, Wand2, Info } from 'lucide-react';

/* ─── Demo Movie Data ─── */

const DEMO_MOVIES = [
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    year: 2008,
    rating: 7.2,
    duration: '9m 56s',
    genres: ['Animation', 'Comedy'],
    quality: '4K' as const,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
    backdrop: 'https://peach.blender.org/wp-content/uploads/bbb-splash.png',
    description: 'A large and lovable bunny deals with three tiny bullies, led by a flying squirrel, who are determined to squelch his happiness.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.2160p.vp9.webm',
    languages: ['English (Original)', 'Spanish (Dubbed)', 'French (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'],
  },
  {
    id: 'sintel',
    title: 'Sintel',
    year: 2010,
    rating: 7.5,
    duration: '14m 48s',
    genres: ['Animation', 'Fantasy', 'Drama'],
    quality: '4K' as const,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sintel_poster.jpg/800px-Sintel_poster.jpg',
    backdrop: 'https://durian.blender.org/wp-content/uploads/2010/06/screenshot-sintel-tunnel.jpg',
    description: 'A lonely young woman, Sintel, helps and befriends a dragon, which she calls Scales. But when Scales is taken from her, she embarks on a dangerous quest to find her friend.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8a/Sintel_Duration_Test.webm/Sintel_Duration_Test.webm.1080p.vp9.webm',
    languages: ['English (Original)', 'Japanese (Dubbed)', 'Korean (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)', 'Korean'],
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel',
    year: 2012,
    rating: 6.8,
    duration: '12m 14s',
    genres: ['Sci-Fi', 'Drama', 'Action'],
    quality: '4K' as const,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg',
    backdrop: 'https://mango.blender.org/wp-content/gallery/4k-renders/06_bartos_background.jpg',
    description: 'In an apocalyptic future, a group of soldiers and scientists takes refuge in Amsterdam to try to stop an army of robots from destroying the remnants of humanity.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tears_of_Steel_4K.webm/Tears_of_Steel_4K.webm.1080p.vp9.webm',
    languages: ['English (Original)', 'German (Dubbed)', 'Spanish (Dubbed)', 'Hindi (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)', 'Arabic', 'Hindi'],
  },
  {
    id: 'elephants-dream',
    title: "Elephant's Dream",
    year: 2006,
    rating: 6.5,
    duration: '10m 54s',
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    quality: 'HD' as const,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Elephants_Dream_s1_proog.jpg/800px-Elephants_Dream_s1_proog.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_s3_both.jpg/1280px-Elephants_Dream_s3_both.jpg',
    description: 'Two strange characters explore a cavernous and seemingly infinite machine. The older one, Proog, acts as a guide and protector while the younger one, Emo, is a skeptical observer.',
    source: 'Blender Foundation • CC BY 2.5',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e8/Elephants_Dream.ogg/Elephants_Dream.ogg.1080p.webm',
    languages: ['English (Original)', 'Dutch (Dubbed)', 'French (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Dutch'],
  },
];

/* ─── Categories ─── */

const CATEGORIES = [
  { label: 'Trending Now', icon: Sparkles, ids: ['big-buck-bunny', 'sintel', 'tears-of-steel', 'elephants-dream'] },
  { label: '4K Ultra HD', icon: Crown, ids: ['big-buck-bunny', 'sintel', 'tears-of-steel'] },
  { label: 'Award Winners', icon: Award, ids: ['sintel', 'big-buck-bunny', 'tears-of-steel'] },
  { label: 'Action & Adventure', icon: Swords, ids: ['tears-of-steel', 'sintel'] },
  { label: 'Animation', icon: Palette, ids: ['big-buck-bunny', 'sintel', 'elephants-dream'] },
  { label: 'Sci-Fi & Fantasy', icon: Wand2, ids: ['tears-of-steel', 'elephants-dream', 'sintel'] },
];

/* ─── Movie Row Component ─── */

function MovieRow({ title, icon: Icon, movies }: { title: string; icon: React.ComponentType<{ className?: string }>; movies: typeof DEMO_MOVIES }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="mb-8 md:mb-12">
      <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
        <Icon className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
        <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="relative group/row">
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-2"
        >
          {movies.map((movie) => (
            <Link
              key={movie.id}
              href={`/stream/${movie.id}`}
              className="flex-shrink-0 w-[160px] md:w-[200px] group/card"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-75"
                  loading="lazy"
                />
                {/* Quality badge */}
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    movie.quality === '4K'
                      ? 'bg-[#d4a853] text-black'
                      : 'bg-white/20 text-white/90 backdrop-blur-sm'
                  }`}>
                    {movie.quality}
                  </span>
                </div>
                {/* Rating badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 text-[#d4a853] fill-[#d4a853]" strokeWidth={1.5} />
                  {movie.rating}
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 bg-[#d4a853]/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" strokeWidth={2} />
                  </div>
                </div>
              </div>
              <div className="mt-2.5">
                <h3 className="text-sm font-medium text-[#f1f1f4] truncate group-hover/card:text-[#d4a853] transition-colors">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#9ca3af]">{movie.year}</span>
                  <span className="text-[#1e1e28]">·</span>
                  <span className="text-[11px] text-[#9ca3af]">{movie.duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {showRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── Main Page ─── */

export default function StreamPage() {
  const featured = DEMO_MOVIES[0]; // Big Buck Bunny

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Hero Banner */}
      <section className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
        {/* Backdrop image */}
        <div className="absolute inset-0">
          <img
            src={featured.backdrop}
            alt={featured.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/90 via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-12 md:pb-16">
          <div className="max-w-2xl">
            {/* StreamFlix badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#d4a853] text-xs font-bold tracking-widest uppercase">StreamFlix</span>
              <span className="w-1 h-1 rounded-full bg-[#d4a853]" />
              <span className="text-white/40 text-xs">Free Legal Movies</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
              {featured.title}
            </h1>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-[#d4a853] text-sm font-bold">4K Ultra HD</span>
              <span className="text-white/30">·</span>
              <span className="text-white/70 text-sm">{featured.year}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/70 text-sm">{featured.duration}</span>
              <span className="text-white/30">·</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#d4a853] fill-[#d4a853]" strokeWidth={1.5} />
                <span className="text-white/70 text-sm">{featured.rating}</span>
              </div>
              {featured.genres.map((g) => (
                <span key={g} className="text-[10px] font-medium text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
              {featured.description}
            </p>

            <div className="flex items-center gap-3">
              <Link
                href={`/stream/${featured.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-[#d4a853] hover:bg-[#b8922e] text-black font-bold rounded-xl transition-colors shadow-lg shadow-[#d4a853]/20"
              >
                <Play className="w-5 h-5 fill-black" strokeWidth={2} />
                Play Now
              </Link>
              <Link
                href={`/stream/${featured.id}`}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors backdrop-blur-sm border border-white/10"
              >
                <Info className="w-4 h-4" strokeWidth={1.5} />
                More Info
              </Link>
            </div>

            <p className="text-white/20 text-[10px] mt-4">Source: {featured.source}</p>
          </div>
        </div>
      </section>

      {/* Page Header */}
      <div className="px-4 md:px-12 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-[#d4a853] fill-[#d4a853]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">StreamFlix</h2>
            <p className="text-[#9ca3af] text-xs md:text-sm">Free Legal Movies in Stunning 4K</p>
          </div>
        </div>
      </div>

      {/* Movie Rows */}
      {CATEGORIES.map((cat) => {
        const catMovies = cat.ids
          .map((id) => DEMO_MOVIES.find((m) => m.id === id))
          .filter(Boolean) as typeof DEMO_MOVIES;
        return (
          <MovieRow
            key={cat.label}
            title={cat.label}
            icon={cat.icon}
            movies={catMovies}
          />
        );
      })}

      {/* Footer spacer */}
      <div className="h-12" />
    </div>
  );
}
