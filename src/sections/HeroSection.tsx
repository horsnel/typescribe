'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Play, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import type { Movie } from '@/lib/types';

// ─── Top Reviewers (fetched from /api/communities/leaderboard) ───
interface TopReviewer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  review_count: number;
}

// ─── Slide animation variants ───
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 1.05,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
  }),
};

// ─── Helper: resolve image URL ───
function resolveImageUrl(path: string | undefined | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280'): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `https://image.tmdb.org/t/p/${size}${path}`;
  return path;
}

// ─── Helper: get initials for avatar fallback ───
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Color palette for reviewer avatars ───
const AVATAR_COLORS = [
  'bg-amber-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-[#D4A853]',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-lime-600',
];

export default function HeroSection() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [topReviewers, setTopReviewers] = useState<TopReviewer[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchEndRef = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // ─── Fetch trending movies ───
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movies && data.movies.length > 0) {
          setMovies(data.movies.slice(0, 6));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // ─── Fetch top reviewers (real leaderboard data) ───
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/communities/leaderboard?limit=10', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.leaderboard && Array.isArray(data.leaderboard)) {
          setTopReviewers(data.leaderboard.slice(0, 10));
        } else if (Array.isArray(data)) {
          setTopReviewers(data.slice(0, 10));
        }
      })
      .catch(() => { /* leaderboard is non-critical */ });
    return () => controller.abort();
  }, []);

  // ─── Auto-advance timer ───
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % Math.max(movies.length, 1));
    }, 6000);
  }, [movies.length]);

  useEffect(() => {
    if (movies.length > 0) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [movies.length, resetTimer]);

  // ─── Navigation handlers ───
  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
      resetTimer();
    },
    [currentSlide, resetTimer],
  );

  const goNext = useCallback(() => {
    if (movies.length === 0) return;
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % movies.length);
    resetTimer();
  }, [movies.length, resetTimer]);

  const goPrev = useCallback(() => {
    if (movies.length === 0) return;
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + movies.length) % movies.length);
    resetTimer();
  }, [movies.length, resetTimer]);

  // ─── Touch handlers ───
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchStartRef.current - touchEndRef.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    touchStartRef.current = 0;
    touchEndRef.current = 0;
  }, [goNext, goPrev]);

  // ─── Keyboard navigation ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // ─── Current slide data ───
  const currentMovie = movies[currentSlide];

  return (
    <section className="relative">
      {/* ═══════════════════════════════════════════════════════════
          HERO CAROUSEL CONTAINER
      ═══════════════════════════════════════════════════════════ */}
      <div
        ref={carouselRef}
        className="relative w-full h-[350px] sm:h-[420px] md:h-[480px] lg:h-[500px] overflow-hidden bg-[#050507]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ─── Loading skeleton ─── */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#050507] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
              <span className="text-sm text-[#9ca3af]">Loading trending movies...</span>
            </div>
          </div>
        )}

        {/* ─── Slides ─── */}
        {!isLoading && movies.length > 0 && (
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              {/* Backdrop image */}
              <div className="absolute inset-0">
                <img
                  src={resolveImageUrl(currentMovie?.backdrop_path || currentMovie?.poster_path, 'w1280')}
                  alt={currentMovie?.title || 'Movie backdrop'}
                  className="w-full h-full object-cover object-center"
                  loading={currentSlide === 0 ? 'eager' : 'lazy'}
                />
              </div>

              {/* Gradient overlay: transparent top → solid #050507 bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
              {/* Side vignette for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/70 via-transparent to-[#050507]/40" />
              {/* Top subtle darkening */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/30 to-transparent" />

              {/* ─── Content overlay ─── */}
              <div className="absolute inset-0 flex items-end">
                <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 pb-16 md:pb-20">
                  <div className="max-w-2xl">
                    {/* Movie title & meta */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-2">
                        {currentMovie?.title}
                      </h2>
                      <div className="flex items-center gap-3 mb-5">
                        {currentMovie?.release_date && (
                          <span className="text-sm text-[#9ca3af]">
                            {currentMovie.release_date.split('-')[0]}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-[#D4A853] fill-[#D4A853]" strokeWidth={0} />
                          <span className="text-sm font-semibold text-[#D4A853]">
                            {currentMovie?.vote_average?.toFixed(1)}
                          </span>
                        </div>
                        {currentMovie?.genres && currentMovie.genres.length > 0 && (
                          <>
                            <span className="text-[#9ca3af]/40">·</span>
                            <span className="text-sm text-[#9ca3af]">
                              {currentMovie.genres.slice(0, 3).map((g) => g.name).join(' · ')}
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Action buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <Link
                        href={`/movie/${currentMovie?.slug}`}
                        className="inline-flex items-center justify-center bg-[#D4A853] hover:bg-[#B8922F] text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm transition-colors duration-200 shadow-lg shadow-[#D4A853]/20"
                      >
                        Read Full Review
                      </Link>
                      {currentMovie?.trailer_youtube_id && (
                        <a
                          href={`https://www.youtube.com/watch?v=${currentMovie.trailer_youtube_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm transition-colors duration-200"
                        >
                          <Play className="w-4 h-4 fill-white" strokeWidth={0} />
                          Watch Trailer
                        </a>
                      )}
                      {!currentMovie?.trailer_youtube_id && (
                        <Link
                          href={`/movie/${currentMovie?.slug}`}
                          className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm transition-colors duration-200"
                        >
                          <Play className="w-4 h-4 fill-white" strokeWidth={0} />
                          Watch Trailer
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ─── No movies state ─── */}
        {!isLoading && movies.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#050507] to-[#0a0a12] flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                Discover Your Next Favorite Movie
              </h2>
              <p className="text-[#9ca3af] mb-6">
                AI-powered reviews, real ratings, and community insights
              </p>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center bg-[#D4A853] hover:bg-[#B8922F] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors duration-200 shadow-lg shadow-[#D4A853]/20"
              >
                Browse Movies
              </Link>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            NAVIGATION ARROWS
            Sized small (28px on mobile, 32px on desktop) and anchored
            to the TOP corners so they never overlap the movie title,
            meta or action buttons at the bottom of the slide.
        ═══════════════════════════════════════════════════════════ */}
        {movies.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 sm:left-5 top-20 sm:top-24 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 hover:border-[#D4A853]/40 hover:text-[#D4A853] transition-all duration-200"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 sm:right-5 top-20 sm:top-24 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 hover:border-[#D4A853]/40 hover:text-[#D4A853] transition-all duration-200"
              aria-label="Next slide"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
            </button>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PAGINATION DOTS
        ═══════════════════════════════════════════════════════════ */}
        {movies.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {movies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentSlide
                    ? 'w-6 h-2 bg-[#D4A853]'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TOP REVIEWERS ROW (real data from /api/communities/leaderboard)
      ═══════════════════════════════════════════════════════════ */}
      {topReviewers.length > 0 && (
        <div className="bg-[#050507] py-4 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Top Reviewers of the Week
              </span>
            </div>

            {/* Horizontal scroll row - Instagram Stories style */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {topReviewers.map((reviewer, idx) => (
                <button
                  key={reviewer.user_id || idx}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  aria-label={`View ${reviewer.display_name}'s profile`}
                >
                  {/* Avatar with gradient ring */}
                  <div className="relative">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-br from-[#D4A853] via-[#C4B5FD] to-[#D4A853] group-hover:shadow-lg group-hover:shadow-[#D4A853]/20 transition-shadow duration-300">
                      <div className={`w-full h-full rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center border-2 border-[#050507] overflow-hidden`}>
                        {reviewer.avatar_url ? (
                           
                          <img
                            src={reviewer.avatar_url}
                            alt={reviewer.display_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {getInitials(reviewer.display_name || '?')}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Review count badge */}
                    <div className="absolute -bottom-1 -right-1 bg-[#D4A853] text-[10px] font-bold text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#050507]">
                      {reviewer.review_count}
                    </div>
                  </div>
                  {/* Name */}
                  <span className="text-[11px] text-[#9ca3af] group-hover:text-white transition-colors truncate max-w-[60px] sm:max-w-[72px]">
                    {reviewer.display_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAGLINE — "Discover Your Next Favourite Movie"
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#050507] py-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-tight">
            Discover Your Next <span className="text-[#D4A853]">Favourite</span> Movie
          </h2>
          <p className="text-sm text-[#AAAAAA] mt-2">
            AI-powered reviews, real ratings, and community insights
          </p>
        </div>
      </div>
    </section>
  );
}
