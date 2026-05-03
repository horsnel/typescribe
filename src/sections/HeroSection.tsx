'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Play, ChevronLeft, ChevronRight, Quote, Swords, TrendingUp, Award } from 'lucide-react';
import type { Movie } from '@/lib/types';

// ─── Review Quotes ───
const REVIEW_QUOTES = [
  { quote: 'A masterclass in atmospheric storytelling. Every frame is a painting.', reviewer: 'Sarah M.', rating: 9 },
  { quote: 'Keeps you guessing until the very end. I couldn\'t look away.', reviewer: 'David C.', rating: 8 },
  { quote: 'Simply devastating in its emotional honesty. Cinema at its most profoundly human.', reviewer: 'Marcus R.', rating: 10 },
  { quote: 'Thrilling and thought-provoking. The best sci-fi film in years.', reviewer: 'Sarah M.', rating: 9 },
  { quote: 'A sweeping epic that marries political thriller with grand romance.', reviewer: 'David C.', rating: 9 },
  { quote: 'Relentless, high-octane entertainment that never lets its foot off the gas.', reviewer: 'Marcus R.', rating: 8 },
];

// ─── Top Reviewers ───
const TOP_REVIEWERS = [
  { name: 'Sarah M.', avatar: '/images/avatar-1.jpg', reviews: 47 },
  { name: 'David C.', avatar: '/images/avatar-2.jpg', reviews: 35 },
  { name: 'Marcus R.', avatar: '/images/avatar-3.jpg', reviews: 62 },
  { name: 'Emma S.', avatar: '/images/avatar-1.jpg', reviews: 28 },
  { name: 'Leo K.', avatar: '/images/avatar-2.jpg', reviews: 41 },
  { name: 'Nina R.', avatar: '/images/avatar-3.jpg', reviews: 53 },
  { name: 'Astrid J.', avatar: '/images/avatar-1.jpg', reviews: 19 },
  { name: 'Carlos M.', avatar: '/images/avatar-2.jpg', reviews: 37 },
  { name: 'Yuki T.', avatar: '/images/avatar-3.jpg', reviews: 44 },
  { name: 'Ravi P.', avatar: '/images/avatar-1.jpg', reviews: 31 },
];

// ─── Battle of the Day ───
const BATTLES = [
  { movie1: 'Inception', movie2: 'Interstellar', votes1: 1247, votes2: 1089 },
  { movie1: 'The Dark Knight', movie2: 'Joker', votes1: 1532, votes2: 1201 },
  { movie1: 'Parasite', movie2: 'Memories of Murder', votes1: 987, votes2: 845 },
];

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
  'bg-violet-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-lime-600',
];

export default function HeroSection() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [battleVotes, setBattleVotes] = useState(BATTLES[0]);
  const [battleIndex, setBattleIndex] = useState(0);
  const [isBattleExpanded, setIsBattleExpanded] = useState(true);
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

  // ─── Battle vote handler ───
  const handleVote = useCallback(
    (side: '1' | '2') => {
      setBattleVotes((prev) => ({
        ...prev,
        votes1: side === '1' ? prev.votes1 + 1 : prev.votes1,
        votes2: side === '2' ? prev.votes2 + 1 : prev.votes2,
      }));
    },
    [],
  );

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
  const currentReview = REVIEW_QUOTES[currentSlide % REVIEW_QUOTES.length];

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
              <div className="w-10 h-10 border-2 border-[#d4a853]/30 border-t-[#d4a853] rounded-full animate-spin" />
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
                    {/* Review quote */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="mb-4"
                    >
                      <div className="flex items-start gap-2">
                        <Quote className="w-5 h-5 text-[#d4a853] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <p className="text-sm sm:text-base md:text-lg italic text-white/90 leading-relaxed line-clamp-3">
                          {currentReview.quote}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-7">
                        <span className="text-xs text-[#9ca3af]">— {currentReview.reviewer}</span>
                        <span className="text-[#9ca3af]/40">·</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#d4a853] fill-[#d4a853]" strokeWidth={0} />
                          <span className="text-xs font-semibold text-[#d4a853]">{currentReview.rating}/10</span>
                        </div>
                      </div>
                    </motion.div>

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
                          <Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" strokeWidth={0} />
                          <span className="text-sm font-semibold text-[#f5c518]">
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
                        className="inline-flex items-center justify-center bg-[#d4a853] hover:bg-[#b8922e] text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm transition-colors duration-200 shadow-lg shadow-[#d4a853]/20"
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
                className="inline-flex items-center justify-center bg-[#d4a853] hover:bg-[#b8922e] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors duration-200 shadow-lg shadow-[#d4a853]/20"
              >
                Browse Movies
              </Link>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            NAVIGATION ARROWS
        ═══════════════════════════════════════════════════════════ */}
        {movies.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 hover:border-white/20 transition-all duration-200"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 hover:border-white/20 transition-all duration-200"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2} />
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
                    ? 'w-6 h-2 bg-[#d4a853]'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            BATTLE OF THE DAY WIDGET (hidden on mobile)
        ═══════════════════════════════════════════════════════════ */}
        {!isLoading && movies.length > 0 && (
          <div className="hidden md:block absolute bottom-6 right-6 lg:right-12 z-20">
            {isBattleExpanded ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 w-[260px] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Battle of the Day
                    </span>
                  </div>
                  <button
                    onClick={() => setIsBattleExpanded(false)}
                    className="text-white/40 hover:text-white/70 transition-colors text-xs"
                    aria-label="Minimize battle widget"
                  >
                    ✕
                  </button>
                </div>

                {/* Battle options */}
                <div className="space-y-2">
                  {/* Option 1 */}
                  <button
                    onClick={() => handleVote('1')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-[#d4a853]/20 border border-white/5 hover:border-[#d4a853]/30 transition-all duration-200 group"
                  >
                    <span className="text-sm font-medium text-white group-hover:text-[#d4a853] transition-colors truncate">
                      {battleVotes.movie1}
                    </span>
                    <span className="text-xs font-bold text-[#d4a853] ml-2 tabular-nums">
                      {battleVotes.votes1.toLocaleString()}
                    </span>
                  </button>

                  {/* VS divider */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">VS</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Option 2 */}
                  <button
                    onClick={() => handleVote('2')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-[#d4a853]/20 border border-white/5 hover:border-[#d4a853]/30 transition-all duration-200 group"
                  >
                    <span className="text-sm font-medium text-white group-hover:text-[#d4a853] transition-colors truncate">
                      {battleVotes.movie2}
                    </span>
                    <span className="text-xs font-bold text-[#d4a853] ml-2 tabular-nums">
                      {battleVotes.votes2.toLocaleString()}
                    </span>
                  </button>
                </div>

                {/* Vote bar */}
                <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#d4a853] rounded-l-full transition-all duration-500"
                    style={{
                      width: `${(battleVotes.votes1 / (battleVotes.votes1 + battleVotes.votes2)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-white/20 rounded-r-full transition-all duration-500"
                    style={{
                      width: `${(battleVotes.votes2 / (battleVotes.votes1 + battleVotes.votes2)) * 100}%`,
                    }}
                  />
                </div>

                {/* Total votes */}
                <div className="flex items-center justify-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-[#9ca3af]" strokeWidth={1.5} />
                  <span className="text-[10px] text-[#9ca3af]">
                    {(battleVotes.votes1 + battleVotes.votes2).toLocaleString()} votes
                  </span>
                </div>
              </div>
            ) : (
              /* Collapsed state - small icon */
              <button
                onClick={() => setIsBattleExpanded(true)}
                className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl hover:bg-white/10 transition-all duration-200"
                aria-label="Expand battle widget"
              >
                <Swords className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                <span className="text-xs font-bold text-white">Battle</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TOP REVIEWERS ROW
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#050507] py-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Top Reviewers of the Week
            </span>
          </div>

          {/* Horizontal scroll row - Instagram Stories style */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {TOP_REVIEWERS.map((reviewer, idx) => (
              <button
                key={reviewer.name}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                aria-label={`View ${reviewer.name}'s profile`}
              >
                {/* Avatar with gradient ring */}
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-br from-[#d4a853] via-[#f0d78c] to-[#d4a853] group-hover:shadow-lg group-hover:shadow-[#d4a853]/20 transition-shadow duration-300">
                    <div className={`w-full h-full rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center border-2 border-[#050507]`}>
                      <span className="text-sm font-bold text-white">
                        {getInitials(reviewer.name)}
                      </span>
                    </div>
                  </div>
                  {/* Review count badge */}
                  <div className="absolute -bottom-1 -right-1 bg-[#d4a853] text-[10px] font-bold text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#050507]">
                    {reviewer.reviews}
                  </div>
                </div>
                {/* Name */}
                <span className="text-[11px] text-[#9ca3af] group-hover:text-white transition-colors truncate max-w-[60px] sm:max-w-[72px]">
                  {reviewer.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
