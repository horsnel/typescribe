'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Star, Film, Tv, Wand2 } from 'lucide-react';
import gsap from 'gsap';
import { movies } from '@/lib/data';

type HeroFormat = 'movie' | 'tv' | 'anime';

const formatConfig: Record<HeroFormat, { label: string; cta: string; href: string; accent: string; heading: string }> = {
  movie: { label: 'Movies', cta: 'Browse Movies', href: '/browse', accent: '#e50914', heading: 'Favorite Movie' },
  tv: { label: 'Series', cta: 'Browse Series', href: '/browse?format=tv', accent: '#3b82f6', heading: 'Favorite Series' },
  anime: { label: 'Anime', cta: 'Browse Anime', href: '/browse?format=anime', accent: '#a855f7', heading: 'Favorite Anime' },
};

export default function HeroSection() {
  const [heroFormat, setHeroFormat] = useState<HeroFormat>('movie');
  const containerRef = useRef<HTMLDivElement>(null);

  // Pick 8 movies for the poster stack background
  const posterMovies = movies.slice(0, 8);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo('.hero-title', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
      .fromTo('.hero-subtitle', { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
      .fromTo('.hero-format-toggle', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
      .fromTo('.hero-cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .fromTo('.hero-movie-info', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .fromTo('.scroll-indicator', { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2');

    // Stagger the poster cards entrance
    gsap.fromTo(
      '.poster-card',
      { opacity: 0, y: 60, scale: 0.85, rotate: () => (Math.random() - 0.5) * 8 },
      { opacity: 1, y: 0, scale: 1, rotate: (i: number) => (i - 3.5) * 1.8, duration: 0.8, stagger: 0.06, ease: 'power3.out', delay: 0.1 },
    );

    return () => { tl.kill(); };
  }, []);

  const cfg = formatConfig[heroFormat];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* ─── Movie Poster Stack Background ─── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-[#0a0a0f]" />

        {/* Poster Row — fanned out, overlapping, slightly rotated */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1200px' }}>
          <div className="relative flex items-end justify-center" style={{ width: '140%', transform: 'translateY(8%)' }}>
            {posterMovies.map((movie, idx) => {
              // Calculate fan positions
              const centerIdx = (posterMovies.length - 1) / 2;
              const offset = idx - centerIdx;
              const rotation = offset * 2.2;
              const translateX = offset * 115;
              const translateY = Math.abs(offset) * 12;
              const zIndex = posterMovies.length - Math.abs(Math.round(offset));

              return (
                <div
                  key={movie.id}
                  className="poster-card absolute"
                  style={{
                    transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                    zIndex,
                    opacity: 0.55,
                  }}
                >
                  <div
                    className="w-[140px] sm:w-[160px] md:w-[185px] rounded-xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ aspectRatio: '2/3' }}
                  >
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dim overlay — multiple layers for beautiful dimming effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/60 via-[#0a0a0f]/75 to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-[#0a0a0f]/50 to-[#0a0a0f]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/70" />

        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,15,0.7) 100%)',
          }}
        />

        {/* Subtle ambient glow behind text area */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(229,9,20,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ─── Content ─── */}
      <div ref={containerRef} className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-32">
        <div className="max-w-3xl">
          <div className="hero-title opacity-0">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Discover Your Next{' '}
              <span
                className="inline-block bg-gradient-to-r from-[#e50914] to-[#ff6b6b] bg-clip-text text-transparent"
                style={{
                  transition: 'all 0.4s ease',
                }}
              >
                {cfg.heading}
              </span>
            </h1>
          </div>

          <div className="hero-subtitle opacity-0">
            <p className="text-lg text-[#a0a0b0] max-w-xl mb-6 leading-relaxed">
              AI-powered reviews, real ratings, and community insights
            </p>
          </div>

          {/* Format Toggle */}
          <div className="hero-format-toggle opacity-0 mb-8">
            <div className="inline-flex items-center border border-[#2a2a35] rounded-xl overflow-hidden bg-[#12121a]/60 backdrop-blur-sm">
              {([
                { key: 'movie' as HeroFormat, icon: Film, label: 'Movies' },
                { key: 'tv' as HeroFormat, icon: Tv, label: 'Series' },
                { key: 'anime' as HeroFormat, icon: Wand2, label: 'Anime' },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setHeroFormat(key)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                    heroFormat === key
                      ? 'bg-[#e50914] text-white'
                      : 'text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25]'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-cta flex items-center gap-4 opacity-0">
            <Link
              href={cfg.href}
              className="inline-flex items-center justify-center bg-[#e50914] hover:bg-[#b20710] text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors duration-200 shadow-lg shadow-[#e50914]/20"
            >
              {cfg.cta}
            </Link>
            <Link
              href="/top-rated"
              className="inline-flex items-center justify-center border border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl text-base transition-colors duration-200"
            >
              Top Rated
            </Link>
          </div>

          {/* Featured Movie Info Card */}
          <div className="hero-movie-info mt-12">
            <div className="flex items-center gap-4 bg-[#12121a]/80 backdrop-blur-sm border border-[#2a2a35] rounded-xl p-4 max-w-md">
              <div className="w-12 h-18 flex-shrink-0 rounded-lg overflow-hidden">
                <img src={posterMovies[0].poster_path} alt={posterMovies[0].title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{posterMovies[0].title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-3.5 h-3.5 text-[#f5c518] fill-[#f5c518]" />
                  <span className="text-sm font-semibold text-[#f5c518]">{posterMovies[0].vote_average.toFixed(1)}</span>
                  {posterMovies[0].release_date && (
                    <>
                      <span className="text-[#2a2a35]">·</span>
                      <span className="text-xs text-[#6b6b7b]">{posterMovies[0].release_date.split('-')[0]}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 z-20">
        <a href="#trending" className="block">
          <ChevronDown className="w-8 h-8 text-[#a0a0b0] animate-bounce" />
        </a>
      </div>
    </section>
  );
}
