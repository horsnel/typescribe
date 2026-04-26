'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Star, Film, Tv, Wand2 } from 'lucide-react';
import gsap from 'gsap';
import { movies } from '@/lib/data';

const featuredMovies = [movies[0], movies[2], movies[11]];

type HeroFormat = 'movie' | 'tv' | 'anime';

const formatConfig: Record<HeroFormat, { label: string; cta: string; href: string; accent: string; heading: string }> = {
  movie: { label: 'Movies', cta: 'Browse Movies', href: '/browse', accent: '#e50914', heading: 'Favorite Movie' },
  tv: { label: 'Series', cta: 'Browse Series', href: '/browse?format=tv', accent: '#3b82f6', heading: 'Favorite Series' },
  anime: { label: 'Anime', cta: 'Browse Anime', href: '/browse?format=anime', accent: '#a855f7', heading: 'Favorite Anime' },
};

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [heroFormat, setHeroFormat] = useState<HeroFormat>('movie');
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => { setCurrent((prev) => (prev + 1) % featuredMovies.length); }, []);

  useEffect(() => { const timer = setInterval(next, 5000); return () => clearInterval(timer); }, [next]);
  useEffect(() => { setIsTransitioning(true); const timer = setTimeout(() => setIsTransitioning(false), 700); return () => clearTimeout(timer); }, [current]);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo('.hero-title', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
      .fromTo('.hero-subtitle', { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5')
      .fromTo('.hero-format-toggle', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')
      .fromTo('.hero-cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .fromTo('.hero-movie-info', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .fromTo('.scroll-indicator', { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2');
    return () => { tl.kill(); };
  }, []);

  const movie = featuredMovies[current];
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const cfg = formatConfig[heroFormat];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {featuredMovies.map((fm, idx) => (
        <div key={fm.id} className="absolute inset-0 transition-opacity duration-1000 ease-in-out" style={{ opacity: idx === current ? 1 : 0 }}>
          <img src={fm.backdrop_path} alt={fm.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/70 to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-[#0a0a0f]/40 to-transparent" />
        </div>
      ))}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-32">
        <div className="max-w-3xl">
          <div className="hero-title opacity-0"><h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">Discover Your Next <span className="text-[#e50914]">{cfg.heading}</span></h1></div>
          <div className="hero-subtitle opacity-0"><p className="text-lg text-[#a0a0b0] max-w-xl mb-6 leading-relaxed">AI-powered reviews, real ratings, and community insights</p></div>

          {/* Format Toggle */}
          <div className="hero-format-toggle opacity-0 mb-8">
            <div className="inline-flex items-center border border-[#2a2a35] rounded-lg overflow-hidden bg-[#12121a]/60 backdrop-blur-sm">
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
            <Link href={cfg.href} className="inline-flex items-center justify-center bg-[#e50914] hover:bg-[#b20710] text-white font-semibold px-8 py-4 rounded-lg text-base transition-colors duration-200">{cfg.cta}</Link>
            <Link href="/top-rated" className="inline-flex items-center justify-center border border-white/30 bg-transparent text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-lg text-base transition-colors duration-200">Top Rated</Link>
          </div>
          <div className={`hero-movie-info mt-12 transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-3' : 'opacity-1 translate-y-0'}`}>
            <div className="flex items-center gap-4 bg-[#12121a]/80 backdrop-blur-sm border border-[#2a2a35] rounded-xl p-4 max-w-md">
              <div className="w-12 h-18 flex-shrink-0 rounded-lg overflow-hidden"><img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" /></div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{movie.title}</h3>
                <div className="flex items-center gap-2 mt-1"><Star className="w-3.5 h-3.5 text-[#f5c518] fill-[#f5c518]" /><span className="text-sm font-semibold text-[#f5c518]">{movie.vote_average.toFixed(1)}</span>{year && <><span className="text-[#2a2a35]">·</span><span className="text-xs text-[#6b6b7b]">{year}</span></>}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {featuredMovies.map((_, idx) => (<button key={idx} onClick={() => setCurrent(idx)} className={`transition-all duration-300 rounded-full ${idx === current ? 'w-8 h-2 bg-[#e50914]' : 'w-2 h-2 bg-white/30 hover:bg-white/50'}`} aria-label={`Go to slide ${idx + 1}`} />))}
      </div>
      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 z-20"><a href="#trending" className="block"><ChevronDown className="w-8 h-8 text-[#a0a0b0] animate-bounce" /></a></div>
    </section>
  );
}
