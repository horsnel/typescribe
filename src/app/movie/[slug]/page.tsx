'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Heart, Share2, Play, ChevronRight, Sparkles, Clock,
  Calendar, Globe, Building2, Film, AlertTriangle,
  ExternalLink, ChevronDown, MessageSquare, Star, Tv,
  PenSquare, ThumbsUp, Flag, Reply, MoreHorizontal, Send, Loader2, Shield,
} from 'lucide-react';
import { movies, userReviews, getMovieBySlug } from '@/lib/data';
import type { Movie } from '@/lib/types';
import { useAuth, isInWatchlist, toggleWatchlist } from '@/lib/auth';
import RatingBadge from '@/components/movie/RatingBadge';
import MovieCard from '@/components/movie/MovieCard';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewForm from '@/components/review/ReviewForm';
import ReportModal from '@/components/review/ReportModal';
import { moderateContent, preSubmitCheck } from '@/lib/moderation';
import type { ReportReason } from '@/lib/types';
import { Button } from '@/components/ui/button';

type CommentTab = 'reviews' | 'discussion';

interface LocalComment {
  id: number;
  movie_id: number;
  user_name: string;
  user_id: number;
  text: string;
  parent_id: number | null;
  helpful_count: number;
  created_at: string;
  moderated: boolean;
  moderation_note: string;
  reports: Array<{ id: number; reason: string; details: string; created_at: string }>;
};

export default function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { user, isAuthenticated } = useAuth();

  // ─── Pipeline API Integration ───
  const [movie, setMovie] = React.useState<Movie | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [pipelineSources, setPipelineSources] = React.useState<string[]>([]);
  const [completeness, setCompleteness] = React.useState(0);

  React.useEffect(() => {
    if (!slug) return;
    setLoading(true);
    // Try pipeline API first, fall back to mock data
    fetch(`/api/movies/slug/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movie) {
          setMovie(data.movie);
          setPipelineSources(data.sources || []);
          setCompleteness(data.completeness || 0);
        } else {
          // Fallback to mock data
          const mock = getMovieBySlug(slug);
          setMovie(mock);
          setPipelineSources(mock ? ['mock'] : []);
        }
      })
      .catch(() => {
        const mock = getMovieBySlug(slug);
        setMovie(mock);
        setPipelineSources(mock ? ['mock'] : []);
      })
      .finally(() => setLoading(false));
  }, [slug]);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [reviewsVisible, setReviewsVisible] = useState(3);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [commentTab, setCommentTab] = useState<CommentTab>('reviews');
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [helpedComments, setHelpedComments] = useState<Set<number>>(new Set());
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [commentModerationWarning, setCommentModerationWarning] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount / slug change
  useEffect(() => {
    window.scrollTo(0, 0);
    setReviewsVisible(3);
    setOverviewExpanded(false);
    setTrailerOpen(false);
  }, [slug]);

  // Watchlist state
  useEffect(() => {
    if (movie) {
      setInWatchlist(isInWatchlist(movie.tmdb_id || movie.id));
    }
  }, [movie]);

  // Load comments from localStorage
  useEffect(() => {
    if (!movie) return;
    try {
      const data = localStorage.getItem(`typescribe_comments_${movie.id}`);
      if (data) setComments(JSON.parse(data));
    } catch { /* ignore */ }
  }, [movie]);

  const saveComments = (updated: LocalComment[]) => {
    setComments(updated);
    try {
      localStorage.setItem(`typescribe_comments_${movie!.id}`, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() || !user) return;
    // AI Auto-Moderation check
    const check = preSubmitCheck(newComment);
    if (!check.canSubmit) {
      setCommentModerationWarning(check.blocked);
      return;
    }
    if (check.warnings.length > 0) {
      setCommentModerationWarning(check.warnings[0]);
    } else {
      setCommentModerationWarning('');
    }
    setCommentSubmitting(true);
    const moderation = moderateContent(newComment);
    const comment: LocalComment = {
      id: Date.now(),
      movie_id: movie!.id,
      user_name: user.display_name,
      user_id: user.id,
      text: newComment.trim(),
      parent_id: null,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      moderated: moderation.flagged,
      moderation_note: moderation.reason || '',
      reports: [],
    };
    saveComments([comment, ...comments]);
    setNewComment('');
    setCommentSubmitting(false);
    setCommentModerationWarning('');
  };

  const handleSubmitReply = (parentId: number) => {
    if (!replyText.trim() || !user) return;
    // AI Auto-Moderation check
    const check = preSubmitCheck(replyText);
    if (!check.canSubmit) return; // Silently block for replies
    const moderation = moderateContent(replyText);
    const reply: LocalComment = {
      id: Date.now(),
      movie_id: movie!.id,
      user_name: user.display_name,
      user_id: user.id,
      text: replyText.trim(),
      parent_id: parentId,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      moderated: moderation.flagged,
      moderation_note: moderation.reason || '',
      reports: [],
    };
    saveComments([reply, ...comments]);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleToggleCommentHelpful = (commentId: number) => {
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        const isHelped = helpedComments.has(commentId);
        return { ...c, helpful_count: c.helpful_count + (isHelped ? -1 : 1) };
      }
      return c;
    });
    const newSet = new Set(helpedComments);
    if (newSet.has(commentId)) newSet.delete(commentId); else newSet.add(commentId);
    setHelpedComments(newSet);
    saveComments(updated);
  };

  const handleReviewSubmit = ({ movieId, rating, text }: { movieId: number; rating: number; text: string }) => {
    if (!user) return;
    const moderation = moderateContent(text, rating);
    const review = {
      id: Date.now(),
      movie_id: movieId,
      user_id: user.id,
      user_name: user.display_name,
      user_avatar: user.avatar || '',
      rating,
      text,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      moderated: moderation.flagged,
      moderation_note: moderation.reason || '',
      reports: [],
    };
    try {
      const existing = localStorage.getItem('typescribe_user_reviews');
      const reviews = existing ? JSON.parse(existing) : [];
      reviews.unshift(review);
      localStorage.setItem('typescribe_user_reviews', JSON.stringify(reviews));
    } catch { /* ignore */ }
    setShowReviewForm(false);
    window.location.reload();
  };

  // GSAP entrance
  useEffect(() => {
    if (!movie) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-animate',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo(
        '.content-animate',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.5 }
      );
    }, heroRef);
    return () => ctx.revert();
  }, [movie]);

  const handleToggleWatchlist = useCallback(() => {
    if (!movie) return;
    const added = toggleWatchlist(movie.id);
    setInWatchlist(added);
  }, [movie]);

  const handleReportComment = (commentId: number, reason: ReportReason, details: string) => {
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          reports: [...(c.reports || []), { id: Date.now(), reason, details, created_at: new Date().toISOString() }],
        };
      }
      return c;
    });
    saveComments(updated);
    setReportingCommentId(null);
  };

  const handleReviewReport = (reviewId: number, reason: ReportReason, details: string) => {
    try {
      const existing = localStorage.getItem('typescribe_user_reviews');
      const reviews = existing ? JSON.parse(existing) : [];
      const idx = reviews.findIndex((r: any) => r.id === reviewId);
      if (idx >= 0) {
        if (!reviews[idx].reports) reviews[idx].reports = [];
        reviews[idx].reports.push({ id: Date.now(), reason, details, created_at: new Date().toISOString() });
        localStorage.setItem('typescribe_user_reviews', JSON.stringify(reviews));
      }
    } catch { /* ignore */ }
  };

  const handleShare = useCallback(async () => {
    if (!movie) return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback – do nothing
    }
  }, [movie]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#e50914] mx-auto mb-4" />
          <p className="text-[#a0a0b0]">Loading movie data from pipeline…</p>
        </div>
      </div>
    );
  }

  // 404 state
  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-[#a0a0b0] mb-6">The movie you are looking for does not exist.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 bg-[#e50914] hover:bg-[#b20710] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Movies
          </Link>
        </div>
      </div>
    );
  }

  // Derived data
  const year = movie.release_date.split('-')[0];
  const runtimeHours = Math.floor(movie.runtime / 60);
  const runtimeMins = movie.runtime % 60;
  const runtimeStr = `${runtimeHours}h ${runtimeMins}m`;
  const movieReviews = userReviews.filter((r) => r.movie_id === movie.id);

  const sortedReviews = [...movieReviews].sort((a, b) => {
    switch (reviewSort) {
      case 'highest': return b.rating - a.rating;
      case 'lowest': return a.rating - b.rating;
      case 'helpful': return b.helpful_count - a.helpful_count;
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const visibleReviews = sortedReviews.slice(0, reviewsVisible);
  const hasMoreReviews = sortedReviews.length > reviewsVisible;

  const relatedMovies = movies
    .filter((m) => m.id !== movie.id && m.genres.some((g) => movie.genres.some((mg) => mg.id === g.id)))
    .slice(0, 4);

  const isOverviewLong = movie.overview.length > 300;
  const displayOverview = isOverviewLong && !overviewExpanded
    ? movie.overview.slice(0, 300) + '...'
    : movie.overview;

  const languageNames: Record<string, string> = {
    en: 'English', ja: 'Japanese', it: 'Italian', fr: 'French',
    de: 'German', es: 'Spanish', ko: 'Korean', zh: 'Chinese',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ─── Hero Section ─── */}
      <div ref={heroRef} className="relative h-[65vh] min-h-[520px]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <img
            src={movie.backdrop_path}
            alt={movie.title}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-[#0a0a0f]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full flex items-end pb-10 lg:pb-14">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-end w-full">
            {/* Poster – hidden on mobile */}
            <div className="hidden md:block hero-animate flex-shrink-0 w-[220px] rounded-xl overflow-hidden shadow-2xl border border-[#2a2a35]/50">
              <img
                src={movie.poster_path}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <nav className="hero-animate flex items-center gap-2 mb-4 text-sm text-[#6b6b7b]">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <Link href="/browse" className="hover:text-white transition-colors">Browse</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#a0a0b0] truncate max-w-[200px]">{movie.title}</span>
              </nav>

              {/* Title */}
              <h1 className="hero-animate text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2 leading-tight">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="hero-animate text-sm italic text-[#6b6b7b] mb-4">{movie.tagline}</p>
              )}

              {/* Meta Row */}
              <div className="hero-animate flex items-center gap-3 mb-5 flex-wrap">
                <span className="text-sm text-[#a0a0b0]">{year}</span>
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />
                <span className="text-sm text-[#a0a0b0] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {runtimeStr}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />
                <div className="flex gap-2">
                  {movie.genres.map((g) => (
                    <span
                      key={g.id}
                      className="text-xs font-medium text-[#a0a0b0] bg-[#12121a] border border-[#2a2a35] px-2.5 py-1 rounded-full"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating Badges */}
              <div className="hero-animate mb-6">
                <RatingBadge movie={movie} variant="all" />
              </div>

              {/* Action Buttons */}
              <div className="hero-animate flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleToggleWatchlist}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                    inWatchlist
                      ? 'bg-[#e50914] text-white'
                      : 'bg-[#1a1a25] border border-[#2a2a35] text-white hover:bg-[#e50914] hover:border-[#e50914]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inWatchlist ? 'fill-white' : ''}`} />
                  {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                </button>

                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#1a1a25] border border-[#2a2a35] text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#1a1a25] border border-[#2a2a35] text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <Play className="w-4 h-4 fill-white" /> Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-14">
          {/* ─── Left Column ─── */}
          <div className="space-y-10 min-w-0">
            {/* AI Review */}
            <section className="content-animate">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#e50914]" />
                <h2 className="text-xl font-bold text-white">AI-Generated Review</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#e50914]/10 text-[#e50914] px-2.5 py-0.5 rounded-full border border-[#e50914]/20">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              </div>
              <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
                <p className="text-[#a0a0b0] leading-relaxed text-[15px]">{movie.ai_review}</p>
                <div className="flex items-start gap-2 mt-5 pt-4 border-t border-[#2a2a35]/50">
                  <AlertTriangle className="w-4 h-4 text-[#6b6b7b] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6b6b7b] italic">
                    This review was generated by AI based on available data and should not replace professional
                    criticism. AI-generated content may contain inaccuracies.
                  </p>
                </div>
              </div>
            </section>

            {/* Synopsis */}
            <section className="content-animate">
              <h2 className="text-xl font-bold text-white mb-4">Synopsis</h2>
              <p className="text-[#a0a0b0] leading-relaxed text-[15px]">{displayOverview}</p>
              {isOverviewLong && (
                <button
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                  className="inline-flex items-center gap-1 text-[#e50914] hover:underline mt-2 text-sm font-medium"
                >
                  {overviewExpanded ? 'Show Less' : 'Read More'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${overviewExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </section>

            {/* Cast & Crew */}
            <section className="content-animate">
              <h2 className="text-xl font-bold text-white mb-4">Cast & Crew</h2>
              <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
                {movie.cast.map((person) => (
                  <div key={person.name} className="flex flex-col items-center flex-shrink-0 w-[90px]">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#12121a] border-2 border-[#2a2a35] mb-2">
                      <img
                        src={person.profile_path}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">
                      {person.name}
                    </span>
                    <span className="text-[10px] text-[#6b6b7b] text-center leading-tight truncate w-full">
                      {person.character}
                    </span>
                  </div>
                ))}
                {/* Director card */}
                <div className="flex flex-col items-center flex-shrink-0 w-[90px]">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center mb-2 border-2 border-[#e50914]/30">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">
                    {movie.director}
                  </span>
                  <span className="text-[10px] text-[#6b6b7b] text-center">Director</span>
                </div>
              </div>
            </section>

            {/* Reviews & Discussion Section */}
            <section className="content-animate">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Tab Switcher */}
                  <div className="flex items-center border border-[#2a2a35] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCommentTab('reviews')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        commentTab === 'reviews' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white hover:bg-[#1a1a25]'
                      }`}
                    >
                      <Star className="w-4 h-4" /> Reviews ({movieReviews.length})
                    </button>
                    <button
                      onClick={() => setCommentTab('discussion')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        commentTab === 'discussion' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white hover:bg-[#1a1a25]'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" /> Discussion ({comments.filter(c => c.parent_id === null).length})
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {commentTab === 'reviews' && (
                    <>
                      {isAuthenticated && (
                        <Button
                          onClick={() => setShowReviewForm(!showReviewForm)}
                          className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2 text-sm"
                        >
                          <PenSquare className="w-4 h-4" /> Write a Review
                        </Button>
                      )}
                      <select
                        value={reviewSort}
                        onChange={(e) => {
                          setReviewSort(e.target.value as typeof reviewSort);
                          setReviewsVisible(3);
                        }}
                        className="bg-[#12121a] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#e50914]"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="helpful">Most Helpful</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm
                    movieId={movie.id}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </div>
              )}

              {/* Reviews Tab */}
              {commentTab === 'reviews' && (
                <>
                  {movieReviews.length === 0 ? (
                    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-8 text-center">
                      <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                      <p className="text-[#a0a0b0] mb-1">No reviews yet</p>
                      <p className="text-sm text-[#6b6b7b]">Be the first to share your rating and review about this movie.</p>
                      {isAuthenticated && (
                        <Button
                          onClick={() => setShowReviewForm(true)}
                          className="mt-4 bg-[#e50914] hover:bg-[#b20710] text-white gap-2"
                        >
                          <PenSquare className="w-4 h-4" /> Write a Review
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {visibleReviews.map((review) => (
                          <ReviewCard key={review.id} review={review} variant="full" onReport={handleReviewReport} />
                        ))}
                      </div>
                      {hasMoreReviews && (
                        <button
                          onClick={() => setReviewsVisible((v) => v + 3)}
                          className="mt-6 w-full py-3 rounded-lg border border-[#2a2a35] text-sm font-medium text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] transition-colors"
                        >
                          Load More Reviews
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Discussion Tab */}
              {commentTab === 'discussion' && (
                <>
                  {/* Comment Input */}
                  {isAuthenticated ? (
                    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => { setNewComment(e.target.value); if (commentModerationWarning) setCommentModerationWarning(''); }}
                            placeholder="Share your thoughts about this movie..."
                            rows={3}
                            className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none text-sm"
                          />
                          {commentModerationWarning && (
                            <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-2 mt-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-300">{commentModerationWarning}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#6b6b7b]">{newComment.length > 0 ? `${newComment.length} characters` : 'Be respectful and constructive'}</span>
                              <div className="flex items-center gap-1 text-[10px] text-green-400/70">
                                <Shield className="w-3 h-3" /> AI Moderated
                              </div>
                            </div>
                            <Button
                              onClick={handleSubmitComment}
                              disabled={!newComment.trim() || commentSubmitting}
                              className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2 text-sm disabled:opacity-50"
                            >
                              {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 mb-6 text-center">
                      <MessageSquare className="w-8 h-8 text-[#2a2a35] mx-auto mb-2" />
                      <p className="text-[#a0a0b0] mb-2">Sign in to join the discussion</p>
                      <Link href="/login" className="text-[#e50914] hover:underline text-sm font-medium">Sign In</Link>
                    </div>
                  )}

                  {/* Comments List */}
                  {comments.filter(c => c.parent_id === null).length === 0 ? (
                    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-8 text-center">
                      <MessageSquare className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                      <p className="text-[#a0a0b0] mb-1">No comments yet</p>
                      <p className="text-sm text-[#6b6b7b]">Start the conversation about this movie.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments
                        .filter(c => c.parent_id === null)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((comment) => {
                          const replies = comments.filter(c => c.parent_id === comment.id)
                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                          const avatarFallback = comment.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                          return (
                            <div key={comment.id} className={`bg-[#12121a] border rounded-xl p-5 ${comment.moderated ? 'border-yellow-500/30' : 'border-[#2a2a35]'}`}>
                              {/* Moderation badge */}
                              {comment.moderated && comment.moderation_note && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                                  <span className="text-xs text-yellow-300">{comment.moderation_note}</span>
                                </div>
                              )}
                              {comment.reports && comment.reports.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-3">
                                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                                  <span className="text-xs text-orange-300">Under review ({comment.reports.length} report{comment.reports.length > 1 ? 's' : ''})</span>
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {avatarFallback}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white">{comment.user_name}</span>
                                    <span className="text-xs text-[#6b6b7b]">
                                      {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#a0a0b0] leading-relaxed">{comment.text}</p>
                                  <div className="flex items-center gap-4 mt-3">
                                    <button
                                      onClick={() => handleToggleCommentHelpful(comment.id)}
                                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                                        helpedComments.has(comment.id) ? 'text-[#e50914]' : 'text-[#6b6b7b] hover:text-[#a0a0b0]'
                                      }`}
                                    >
                                      <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({comment.helpful_count})
                                    </button>
                                    {isAuthenticated && (
                                      <button
                                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                                        className="flex items-center gap-1.5 text-xs text-[#6b6b7b] hover:text-[#a0a0b0] transition-colors"
                                      >
                                        <Reply className="w-3.5 h-3.5" /> Reply
                                      </button>
                                    )}
                                    {isAuthenticated && user?.id !== comment.user_id && (
                                      <button
                                        onClick={() => setReportingCommentId(comment.id)}
                                        className="flex items-center gap-1.5 text-xs text-[#6b6b7b] hover:text-[#a0a0b0] transition-colors"
                                      >
                                        <Flag className="w-3.5 h-3.5" /> Report
                                      </button>
                                    )}
                                  </div>

                                  {/* Reply Input */}
                                  {replyingTo === comment.id && (
                                    <div className="mt-3 flex items-start gap-2">
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        rows={2}
                                        className="flex-1 bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none text-sm"
                                      />
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          onClick={() => handleSubmitReply(comment.id)}
                                          disabled={!replyText.trim()}
                                          className="bg-[#e50914] hover:bg-[#b20710] text-white text-xs px-3 py-1.5 disabled:opacity-50"
                                        >
                                          Reply
                                        </Button>
                                        <button
                                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                          className="text-xs text-[#6b6b7b] hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Replies */}
                                  {replies.length > 0 && (
                                    <div className="mt-3 ml-2 pl-4 border-l-2 border-[#2a2a35] space-y-3">
                                      {replies.map((reply) => {
                                        const replyAvatar = reply.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        return (
                                          <div key={reply.id} className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e50914]/80 to-[#b20710]/80 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                              {replyAvatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white">{reply.user_name}</span>
                                                <span className="text-[10px] text-[#6b6b7b]">{new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                              </div>
                                              <p className="text-xs text-[#a0a0b0] leading-relaxed mt-0.5">{reply.text}</p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Related Movies */}
            {relatedMovies.length > 0 && (
              <section className="content-animate">
                <h2 className="text-xl font-bold text-white mb-5">You Might Also Like</h2>
                <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
                  {relatedMovies.map((m) => (
                    <MovieCard key={m.id} movie={m} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── Right Sidebar ─── */}
          <div className="space-y-6">
            {/* Movie Info Card */}
            <div className="content-animate bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Movie Info</h3>

              <div className="w-full aspect-video rounded-lg overflow-hidden mb-5 border border-[#2a2a35]/50">
                <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Release Date</span>
                    <p className="text-sm text-white">
                      {new Date(movie.release_date).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Runtime</span>
                    <p className="text-sm text-white">{runtimeStr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Language</span>
                    <p className="text-sm text-white">{languageNames[movie.original_language] || movie.original_language.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Film className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Director</span>
                    <p className="text-sm text-white">{movie.director}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Production</span>
                    <p className="text-sm text-white">{movie.production_companies.join(', ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-[#6b6b7b] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b6b7b]">Status</span>
                    <p className="text-sm text-white">{movie.status}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trailer Embed */}
            <div className="content-animate bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Trailer</h3>
              {trailerOpen ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${movie.trailer_youtube_id}?autoplay=1`}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="w-full aspect-video bg-[#0a0a0f] rounded-lg flex items-center justify-center border border-[#2a2a35] hover:border-[#e50914]/40 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-[#e50914]/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#e50914]/30 transition-colors">
                      <Play className="w-6 h-6 text-[#e50914] fill-[#e50914]" />
                    </div>
                    <span className="text-sm text-[#6b6b7b]">Watch Trailer</span>
                  </div>
                </button>
              )}
            </div>

            {/* News Headlines */}
            {movie.news_headlines.length > 0 && (
              <div className="content-animate bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
                <h3 className="text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Latest News</h3>
                <div className="space-y-3">
                  {movie.news_headlines.slice(0, 3).map((headline, idx) => (
                    <a
                      key={idx}
                      href={headline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <p className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors leading-snug mb-1">
                        {headline.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#6b6b7b]">
                        <span>{headline.source}</span>
                        <span>·</span>
                        <span>{new Date(headline.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Where to Watch */}
            <div className="content-animate bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Where to Watch</h3>
              <div className="flex flex-col items-center py-4 text-center">
                <Tv className="w-8 h-8 text-[#2a2a35] mb-2" />
                <p className="text-sm text-[#6b6b7b]">Coming soon</p>
                <p className="text-xs text-[#2a2a35]">Streaming availability data will be available here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #0a0a0f; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3a3a45; }
      `}</style>

      {/* Report Comment Modal */}
      <ReportModal
        isOpen={reportingCommentId !== null}
        onClose={() => setReportingCommentId(null)}
        onSubmit={(reason, details) => {
          if (reportingCommentId !== null) {
            handleReportComment(reportingCommentId, reason, details);
          }
        }}
        contentType="comment"
        contentPreview={comments.find(c => c.id === reportingCommentId)?.text.slice(0, 150)}
      />
    </div>
  );
}
