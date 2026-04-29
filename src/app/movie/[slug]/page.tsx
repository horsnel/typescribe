'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Heart, Share2, Play, Sparkles, Clock,
  Calendar, Globe, Building2, Film, AlertTriangle,
  ExternalLink, ChevronDown, MessageSquare, Star, Tv,
  PenSquare, ThumbsUp, Flag, Reply, MoreHorizontal, Send, Loader2, Shield,
  DollarSign, Eye, MonitorPlay, Swords,
} from 'lucide-react';
import { userReviews, getMovieBySlug } from '@/lib/data';
import type { Movie } from '@/lib/types';
import { useAuth, isInWatchlist, toggleWatchlist } from '@/lib/auth';
import RatingBadge from '@/components/movie/RatingBadge';
import TasteMatch from '@/components/movie/TasteMatch';
import GenreAdjustedRating from '@/components/movie/GenreAdjustedRating';
import WhyTheDivide from '@/components/movie/WhyTheDivide';
import ParentalGuidance from '@/components/movie/ParentalGuidance';
import CriticTrustScore from '@/components/movie/CriticTrustScore';
import LiveSentimentTracker from '@/components/movie/LiveSentimentTracker';
import CommunityRatings from '@/components/movie/CommunityRatings';
import MovieCard from '@/components/movie/MovieCard';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewForm from '@/components/review/ReviewForm';
import ReportModal from '@/components/review/ReportModal';
import { moderateContent, preSubmitCheck } from '@/lib/moderation';
import type { ReportReason } from '@/lib/types';
import { Button } from '@/components/ui/button';
import MovieDetailSkeleton from '@/components/skeletons/MovieDetailSkeleton';

type CommentTab = 'reviews' | 'discussion';

interface Dispute {
  id: number;
  movie_id: number;
  user_name: string;
  user_id: number;
  rating: number;
  text: string;
  contains_spoilers: boolean;
  helpful_count: number;
  created_at: string;
};

interface WatchProvider {
  id: number;
  name: string;
  logoUrl: string;
  flatrate: boolean;
  rent: boolean;
  buy: boolean;
  free: boolean;
};

interface WatchProvidersData {
  tmdbId: number;
  link: string;
  providers: WatchProvider[];
  countries: Record<string, WatchProvider[]>;
};

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
  const [enriching, setEnriching] = React.useState(false);
  const [enriched, setEnriched] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setEnriched(false);

    const controller = new AbortController();
    const enrichmentTimeout = setTimeout(() => {
      // Auto-dismiss enrichment after 10s — don't let the banner spin forever
      controller.abort();
      setEnriching(false);
    }, 10_000);

    // Phase 1: Fast fetch — returns TMDb data immediately (~2-3s)
    fetch(`/api/movies/slug/${slug}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movie) {
          setMovie(data.movie);
          setPipelineSources(data.sources || []);
          setCompleteness(data.completeness || 0);
          setLoading(false);

          // Phase 2: If not enriched, fetch enriched data in background
          if (!data.enriched && data.completeness < 50) {
            setEnriching(true);
            fetch(`/api/movies/slug/${slug}?enriched=true`, { signal: controller.signal })
              .then(res => res.ok ? res.json() : null)
              .then(enrichedData => {
                if (enrichedData?.movie) {
                  setMovie(enrichedData.movie);
                  setPipelineSources(enrichedData.sources || []);
                  setCompleteness(enrichedData.completeness || 0);
                  setEnriched(true);
                }
              })
              .catch(() => { /* enrichment failed, keep fast data */ })
              .finally(() => {
                clearTimeout(enrichmentTimeout);
                setEnriching(false);
              });
          } else {
            clearTimeout(enrichmentTimeout);
            setEnriched(true);
          }
        } else {
          // Fallback to mock data
          const mock = getMovieBySlug(slug);
          setMovie(mock);
          setPipelineSources(mock ? ['mock'] : []);
          setLoading(false);
        }
      })
      .catch(() => {
        const mock = getMovieBySlug(slug);
        setMovie(mock);
        setPipelineSources(mock ? ['mock'] : []);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(enrichmentTimeout);
    };
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
  const hasAnimated = useRef(false);

  // ─── Dispute the AI State ───
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeRating, setDisputeRating] = useState(0);
  const [disputeText, setDisputeText] = useState('');
  const [disputeSpoilers, setDisputeSpoilers] = useState(false);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [helpedDisputes, setHelpedDisputes] = useState<Set<number>>(new Set());
  const [spoilersRevealed, setSpoilersRevealed] = useState<Set<number>>(new Set());

  // ─── Where to Watch State ───
  const [watchProviders, setWatchProviders] = useState<WatchProvidersData | null>(null);
  const [watchLoading, setWatchLoading] = useState(true);
  const [watchCountry, setWatchCountry] = useState('US');

  // ─── Related Movies State ───
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [recSources, setRecSources] = useState<string[]>([]);

  // Scroll to top on mount / slug change
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0);
    setReviewsVisible(3);
    setOverviewExpanded(false);
    setTrailerOpen(false);
    hasAnimated.current = false; // Reset animation flag for new movie
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

  // Load disputes from localStorage
  useEffect(() => {
    if (!movie) return;
    try {
      const data = localStorage.getItem(`typescribe_disputes_${movie.id}`);
      if (data) setDisputes(JSON.parse(data));
    } catch { /* ignore */ }
  }, [movie]);

  // Fetch watch providers — TMDb via API route first, then TVMaze client-side fallback
  useEffect(() => {
    if (!movie) return;
    setWatchLoading(true);
    const tmdbId = movie.tmdb_id || movie.id;

    // Step 1: Try TMDb via API route (server-side)
    fetch(`/api/movies/${tmdbId}/watch-providers`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.providers && data.providers.length > 0) {
          setWatchProviders(data);
          try {
            const geoCountry = localStorage.getItem('typescribe_geo_country');
            if (geoCountry && data.countries?.[geoCountry]) {
              setWatchCountry(geoCountry);
            }
          } catch { /* ignore */ }
          setWatchLoading(false);
          return null; // signal: done
        }
        // Step 2: TMDb returned nothing — try TVMaze client-side
        return import('@/lib/api/tvmaze').then(({ getWhereToWatch }) =>
          getWhereToWatch(movie.title)
        );
      })
      .then(tvmazeResult => {
        if (!tvmazeResult) return; // either done or null
        // Convert TVMaze result to watch providers format
        const providers = tvmazeResult.streamingOptions.map(opt => ({
          id: -(opt.platform.charCodeAt(0) * 1000 + tvmazeResult.showId),
          name: opt.platform,
          logoUrl: '',
          flatrate: opt.type === 'streaming',
          rent: false,
          buy: false,
          free: opt.type === 'network',
        }));
        setWatchProviders({
          tmdbId,
          link: tvmazeResult.showUrl,
          providers,
          countries: {},
        });
      })
      .catch(() => { /* ignore */ })
      .finally(() => setWatchLoading(false));
  }, [movie]);

  // Fetch related movies — multi-source recommendation pipeline
  // Phase 1: Fast TMDb recs (~2s), Phase 2: Enriched with Letterboxd/RT/AniList (~10s)
  // NOTE: This MUST be before any conditional returns (React Rules of Hooks)
  useEffect(() => {
    if (!movie) return;
    const tmdbId = movie.tmdb_id || movie.id;
    const mediaType = movie.media_type === 'tv' || movie.media_type === 'anime' ? 'tv' : 'movie';

    // Phase 1: Fast TMDb recommendations
    fetch(`/api/movies/${tmdbId}/recommendations?type=${mediaType}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.recommendations && data.recommendations.length > 0) {
          setRelatedMovies(data.recommendations);
          if (data.sources) setRecSources(data.sources);
        }

        // Phase 2: Enrich with Letterboxd, RT, AniList, Jikan in background
        fetch(`/api/movies/${tmdbId}/recommendations?type=${mediaType}&enriched=true`)
          .then(res => res.ok ? res.json() : null)
          .then(enrichedData => {
            if (enrichedData?.recommendations && enrichedData.recommendations.length > 0) {
              setRelatedMovies(enrichedData.recommendations);
              if (enrichedData.sources) setRecSources(enrichedData.sources);
            }
          })
          .catch(() => { /* enrichment failed, keep fast data */ });
      })
      .catch(() => { /* ignore — section simply won't show */ });
  }, [movie]);

  const saveComments = (updated: LocalComment[]) => {
    setComments(updated);
    try {
      localStorage.setItem(`typescribe_comments_${movie!.id}`, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const saveDisputes = (updated: Dispute[]) => {
    setDisputes(updated);
    try {
      localStorage.setItem(`typescribe_disputes_${movie!.id}`, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleSubmitDispute = () => {
    if (!disputeText.trim() || !user || disputeRating === 0) return;
    setDisputeSubmitting(true);
    const dispute: Dispute = {
      id: Date.now(),
      movie_id: movie!.id,
      user_name: user.display_name,
      user_id: user.id,
      rating: disputeRating,
      text: disputeText.trim(),
      contains_spoilers: disputeSpoilers,
      helpful_count: 0,
      created_at: new Date().toISOString(),
    };
    saveDisputes([dispute, ...disputes]);
    setDisputeRating(0);
    setDisputeText('');
    setDisputeSpoilers(false);
    setShowDisputeForm(false);
    setDisputeSubmitting(false);
  };

  const handleToggleDisputeHelpful = (disputeId: number) => {
    const updated = disputes.map((d) => {
      if (d.id === disputeId) {
        const isHelped = helpedDisputes.has(disputeId);
        return { ...d, helpful_count: d.helpful_count + (isHelped ? -1 : 1) };
      }
      return d;
    });
    const newSet = new Set(helpedDisputes);
    if (newSet.has(disputeId)) newSet.delete(disputeId); else newSet.add(disputeId);
    setHelpedDisputes(newSet);
    saveDisputes(updated);
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

  // GSAP entrance — only animate on initial render, not on data updates
  useEffect(() => {
    if (!movie || hasAnimated.current) return;
    hasAnimated.current = true;
    // Hero animations scoped to heroRef
    const heroCtx = gsap.context(() => {
      gsap.fromTo(
        '.hero-animate',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
    }, heroRef);
    // Content animations scoped to contentRef (heroRef doesn't contain .content-animate elements)
    const contentCtx = gsap.context(() => {
      gsap.fromTo(
        '.content-animate',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.5 }
      );
    }, contentRef);
    return () => { heroCtx.revert(); contentCtx.revert(); };
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
    return <MovieDetailSkeleton />;
  }

  // 404 state
  if (!movie) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-extrabold text-[#d4a853]/20 mb-4">404</div>
          <h1 className="text-3xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-[#9ca3af] mb-6">We couldn't find the movie you're looking for. It may have been removed or the link might be broken.</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-[#d4a853] hover:bg-[#b8922e] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse Movies
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#111118] border border-[#1e1e28] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1a1a22] transition-colors"
            >
              Go Home
            </Link>
          </div>
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

  const isOverviewLong = movie.overview.length > 300;
  const displayOverview = isOverviewLong && !overviewExpanded
    ? movie.overview.slice(0, 300) + '...'
    : movie.overview;

  const languageNames: Record<string, string> = {
    en: 'English', ja: 'Japanese', it: 'Italian', fr: 'French',
    de: 'German', es: 'Spanish', ko: 'Korean', zh: 'Chinese',
  };

  const formatCurrency = (value: number | undefined | null): string | null => {
    if (!value || value === 0) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const countryNames: Record<string, string> = {
    US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
    DE: 'Germany', FR: 'France', JP: 'Japan', KR: 'South Korea',
    IN: 'India', BR: 'Brazil', MX: 'Mexico', IT: 'Italy', ES: 'Spain',
  };

  const currentCountryProviders = watchProviders?.countries?.[watchCountry] || watchProviders?.providers || [];
  const streamProviders = currentCountryProviders.filter(p => p.flatrate);
  const rentProviders = currentCountryProviders.filter(p => p.rent);
  const buyProviders = currentCountryProviders.filter(p => p.buy);
  const freeProviders = currentCountryProviders.filter(p => p.free);

  // Dispute calculations
  const avgUserRating = disputes.length > 0
    ? disputes.reduce((sum, d) => sum + d.rating, 0) / disputes.length
    : null;
  const aiRating = movie.vote_average;

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Subtle enrichment indicator — small pulse dot in hero instead of full banner */}
      {/* ─── Hero Section ─── */}
      <div ref={heroRef} className="relative h-auto min-h-[65vh] md:h-[65vh] md:min-h-[520px]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <img
            src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : movie.backdrop_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : movie.backdrop_path || ''}
            alt={movie.title}
            className="w-full h-full object-cover opacity-30"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-[#0a0a0f]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full flex items-center md:items-end pb-10 lg:pb-14 pt-20 md:pt-0">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-end w-full">
            {/* Mobile poster - small inline */}
            <div className="md:hidden hero-animate flex-shrink-0 w-[120px] rounded-xl overflow-hidden shadow-2xl border border-white/[0.06]">
              <img src={movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.poster_path || ''} alt={movie.title} className="w-full aspect-[2/3] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            {/* Poster – hidden on mobile */}
            <div className="hidden md:block hero-animate flex-shrink-0 w-[220px] rounded-xl overflow-hidden shadow-2xl border border-[#1e1e28]/50">
              <img
                src={movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.poster_path || ''}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">

              {/* Title */}
              <h1 className="hero-animate text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2 leading-tight">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="hero-animate text-sm italic text-[#6b7280] mb-4">{movie.tagline}</p>
              )}

              {/* Meta Row */}
              <div className="hero-animate flex items-center gap-3 mb-5 flex-wrap">
                <span className="text-sm text-[#9ca3af]">{year}</span>
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />
                <span className="text-sm text-[#9ca3af] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {runtimeStr}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />
                <div className="flex gap-2">
                  {movie.genres.map((g) => (
                    <span
                      key={g.id}
                      className="text-xs font-medium text-[#9ca3af] bg-[#0c0c10] border border-[#1e1e28] px-2.5 py-1 rounded-full"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating Badges */}
              <div className="hero-animate mb-6">
                <RatingBadge movie={movie} variant="all" enriching={enriching} />
              </div>

              {/* Taste Match & Genre Adjusted Rating */}
              <div className="hero-animate mb-6 flex flex-wrap gap-3">
                <TasteMatch movie={movie} />
                <GenreAdjustedRating movie={movie} />
              </div>

              {/* Action Buttons */}
              <div className="hero-animate flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleToggleWatchlist}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                    inWatchlist
                      ? 'bg-[#d4a853] text-white'
                      : 'bg-[#111118] border border-[#1e1e28] text-white hover:bg-[#d4a853] hover:border-[#d4a853]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inWatchlist ? 'fill-white' : ''}`} />
                  {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                </button>

                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#111118] border border-[#1e1e28] text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#111118] border border-[#1e1e28] text-white hover:bg-[#2a2a35] transition-colors"
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
            {/* AI Review — Dispute It! */}
            <section className="content-animate">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#d4a853]" />
                <h2 className="text-xl font-bold text-white">AI Review — Dispute It!</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#d4a853]/10 text-[#d4a853] px-2.5 py-0.5 rounded-full border border-[#d4a853]/20">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              </div>
              <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                <p className="text-[#9ca3af] leading-relaxed text-[15px]">{movie.ai_review}</p>
                <div className="flex items-start gap-2 mt-5 pt-4 border-t border-[#1e1e28]/50">
                  <AlertTriangle className="w-4 h-4 text-[#6b7280] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#6b7280] italic flex-1">
                    This review was generated by AI based on available data and should not replace professional
                    criticism. AI-generated content may contain inaccuracies.
                  </p>
                </div>

                {/* Dispute This Review Button */}
                <div className="mt-4">
                  {isAuthenticated ? (
                    <Button
                      onClick={() => setShowDisputeForm(!showDisputeForm)}
                      variant="outline"
                      className="w-full border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10 hover:border-[#d4a853] gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {showDisputeForm ? 'Cancel Dispute' : 'Dispute This Review'}
                    </Button>
                  ) : (
                    <div className="text-center text-sm text-[#6b7280]">
                      <Link href="/login" className="text-[#d4a853] hover:underline font-medium">Sign in</Link> to dispute this review
                    </div>
                  )}
                </div>

                {/* Dispute Form */}
                {showDisputeForm && (
                  <div className="mt-4 pt-4 border-t border-[#1e1e28]/50 bg-[#050507]/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Your Take</h4>

                    {/* Star Rating */}
                    <div className="mb-3">
                      <label className="text-xs text-[#6b7280] mb-1.5 block">Your Rating (1-10)</label>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                          <button
                            key={star}
                            onClick={() => setDisputeRating(star)}
                            className="transition-transform hover:scale-110"
                            type="button"
                          >
                            <Star
                              className={`w-5 h-5 ${star <= disputeRating ? 'text-[#d4a853] fill-[#d4a853]' : 'text-[#2a2a35]'}`}
                            />
                          </button>
                        ))}
                        {disputeRating > 0 && (
                          <span className="text-sm font-semibold text-white ml-2">{disputeRating}/10</span>
                        )}
                      </div>
                    </div>

                    {/* Text Area */}
                    <textarea
                      value={disputeText}
                      onChange={(e) => setDisputeText(e.target.value)}
                      placeholder="What do you think the AI got wrong? Share your counter-argument..."
                      rows={4}
                      className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none text-sm mb-3"
                    />

                    {/* Spoilers Checkbox */}
                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${disputeSpoilers ? 'bg-[#d4a853] border-[#d4a853]' : 'border-[#1e1e28]'}`}>
                        {disputeSpoilers && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <Eye className="w-3.5 h-3.5 text-[#6b7280]" />
                      <span className="text-xs text-[#9ca3af]">Contains spoilers</span>
                    </label>

                    {/* Submit */}
                    <Button
                      onClick={handleSubmitDispute}
                      disabled={!disputeText.trim() || disputeRating === 0 || disputeSubmitting}
                      className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 text-sm disabled:opacity-50"
                    >
                      {disputeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit Dispute
                    </Button>
                  </div>
                )}
              </div>

              {/* Community Verdict Summary */}
              {disputes.length > 0 && (
                <div className="mt-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-[#d4a853]" />
                    <h3 className="text-sm font-semibold text-white">Community Verdict</h3>
                    <span className="text-[10px] bg-[#d4a853]/10 text-[#d4a853] px-2 py-0.5 rounded-full">{disputes.length} dispute{disputes.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#d4a853]">{aiRating.toFixed(1)}</p>
                      <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">AI Rating</p>
                    </div>
                    <div className="text-[#2a2a35] text-xl font-light">vs</div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{avgUserRating!.toFixed(1)}</p>
                      <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">Community Avg</p>
                    </div>
                    <div className="text-center ml-auto">
                      <p className="text-2xl font-bold text-white">
                        {avgUserRating !== null && Math.abs(avgUserRating - aiRating) < 1 ? '👍' : avgUserRating !== null && avgUserRating > aiRating ? '📈' : '📉'}
                      </p>
                      <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">
                        {avgUserRating !== null && Math.abs(avgUserRating - aiRating) < 1 ? 'Agrees' : avgUserRating !== null && avgUserRating > aiRating ? 'Higher' : 'Lower'}
                      </p>
                    </div>
                  </div>

                  {/* Individual Disputes */}
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                    {disputes.map((dispute) => {
                      const avatarFallback = dispute.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div key={dispute.id} className="bg-[#050507]/60 border border-[#1e1e28]/50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {avatarFallback}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white">{dispute.user_name}</span>
                                <div className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-[#d4a853] fill-[#d4a853]" />
                                  <span className="text-xs font-semibold text-[#d4a853]">{dispute.rating}/10</span>
                                </div>
                                {dispute.contains_spoilers && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                    <Eye className="w-2.5 h-2.5" /> Spoiler
                                  </span>
                                )}
                                <span className="text-[10px] text-[#6b7280] ml-auto">
                                  {new Date(dispute.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              {dispute.contains_spoilers && !spoilersRevealed.has(dispute.id) ? (
                                <button
                                  onClick={() => setSpoilersRevealed(prev => new Set([...prev, dispute.id]))}
                                  className="text-sm text-[#6b7280] italic hover:text-[#9ca3af] transition-colors"
                                >
                                  This contains spoilers — click to reveal
                                </button>
                              ) : (
                                <p className="text-sm text-[#9ca3af] leading-relaxed">{dispute.text}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => handleToggleDisputeHelpful(dispute.id)}
                                  className={`flex items-center gap-1 text-xs transition-colors ${
                                    helpedDisputes.has(dispute.id) ? 'text-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" /> Helpful ({dispute.helpful_count})
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Synopsis */}
            <section className="content-animate">
              <h2 className="text-xl font-bold text-white mb-4">Synopsis</h2>
              <p className="text-[#9ca3af] leading-relaxed text-[15px]">{displayOverview}</p>
              {isOverviewLong && (
                <button
                  onClick={() => setOverviewExpanded(!overviewExpanded)}
                  className="inline-flex items-center gap-1 text-[#d4a853] hover:underline mt-2 text-sm font-medium"
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
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#0c0c10] border-2 border-[#1e1e28] mb-2">
                      <img
                        src={person.profile_path?.startsWith('http') ? person.profile_path : person.profile_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : person.profile_path || ''}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">
                      {person.name}
                    </span>
                    <span className="text-[10px] text-[#6b7280] text-center leading-tight truncate w-full">
                      {person.character}
                    </span>
                  </div>
                ))}
                {/* Director card */}
                <div className="flex flex-col items-center flex-shrink-0 w-[90px]">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center mb-2 border-2 border-[#d4a853]/30">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white text-center leading-tight truncate w-full">
                    {movie.director}
                  </span>
                  <span className="text-[10px] text-[#6b7280] text-center">Director</span>
                </div>
              </div>
            </section>

            {/* Reviews & Discussion Section */}
            <section className="content-animate">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Tab Switcher */}
                  <div className="flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCommentTab('reviews')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        commentTab === 'reviews' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                      }`}
                    >
                      <Star className="w-4 h-4" /> Reviews ({movieReviews.length})
                    </button>
                    <button
                      onClick={() => setCommentTab('discussion')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        commentTab === 'discussion' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white hover:bg-[#111118]'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" /> Discussion ({comments.filter(c => c.parent_id === null).length})
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/movie/${slug}/debates`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/30 transition-colors"
                  >
                    <Swords className="w-4 h-4" /> Debate
                  </Link>
                  {commentTab === 'reviews' && (
                    <>
                      {isAuthenticated && (
                        <Button
                          onClick={() => setShowReviewForm(!showReviewForm)}
                          className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 text-sm"
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
                        className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
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
                    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-8 text-center">
                      <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                      <p className="text-[#9ca3af] mb-1">No reviews yet</p>
                      <p className="text-sm text-[#6b7280]">Be the first to share your rating and review about this movie.</p>
                      {isAuthenticated && (
                        <Button
                          onClick={() => setShowReviewForm(true)}
                          className="mt-4 bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2"
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
                          className="mt-6 w-full py-3 rounded-lg border border-[#1e1e28] text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-[#111118] transition-colors"
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
                    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newComment}
                            onChange={(e) => { setNewComment(e.target.value); if (commentModerationWarning) setCommentModerationWarning(''); }}
                            placeholder="Share your thoughts about this movie..."
                            rows={3}
                            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none text-sm"
                          />
                          {commentModerationWarning && (
                            <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-2 mt-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-300">{commentModerationWarning}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#6b7280]">{newComment.length > 0 ? `${newComment.length} characters` : 'Be respectful and constructive'}</span>
                              <div className="flex items-center gap-1 text-[10px] text-green-400/70">
                                <Shield className="w-3 h-3" /> AI Moderated
                              </div>
                            </div>
                            <Button
                              onClick={handleSubmitComment}
                              disabled={!newComment.trim() || commentSubmitting}
                              className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 text-sm disabled:opacity-50"
                            >
                              {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mb-6 text-center">
                      <MessageSquare className="w-8 h-8 text-[#2a2a35] mx-auto mb-2" />
                      <p className="text-[#9ca3af] mb-2">Sign in to join the discussion</p>
                      <Link href="/login" className="text-[#d4a853] hover:underline text-sm font-medium">Sign In</Link>
                    </div>
                  )}

                  {/* Comments List */}
                  {comments.filter(c => c.parent_id === null).length === 0 ? (
                    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-8 text-center">
                      <MessageSquare className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                      <p className="text-[#9ca3af] mb-1">No comments yet</p>
                      <p className="text-sm text-[#6b7280]">Start the conversation about this movie.</p>
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
                            <div key={comment.id} className={`bg-[#0c0c10] border rounded-xl p-5 ${comment.moderated ? 'border-yellow-500/30' : 'border-[#1e1e28]'}`}>
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
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {avatarFallback}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-white">{comment.user_name}</span>
                                    <span className="text-xs text-[#6b7280]">
                                      {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#9ca3af] leading-relaxed">{comment.text}</p>
                                  <div className="flex items-center gap-4 mt-3">
                                    <button
                                      onClick={() => handleToggleCommentHelpful(comment.id)}
                                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                                        helpedComments.has(comment.id) ? 'text-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
                                      }`}
                                    >
                                      <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({comment.helpful_count})
                                    </button>
                                    {isAuthenticated && (
                                      <button
                                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                                        className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                                      >
                                        <Reply className="w-3.5 h-3.5" /> Reply
                                      </button>
                                    )}
                                    {isAuthenticated && user?.id !== comment.user_id && (
                                      <button
                                        onClick={() => setReportingCommentId(comment.id)}
                                        className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
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
                                        className="flex-1 bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none text-sm"
                                      />
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          onClick={() => handleSubmitReply(comment.id)}
                                          disabled={!replyText.trim()}
                                          className="bg-[#d4a853] hover:bg-[#b8922e] text-white text-xs px-3 py-1.5 disabled:opacity-50"
                                        >
                                          Reply
                                        </Button>
                                        <button
                                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                          className="text-xs text-[#6b7280] hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Replies */}
                                  {replies.length > 0 && (
                                    <div className="mt-3 ml-2 pl-4 border-l-2 border-[#1e1e28] space-y-3">
                                      {replies.map((reply) => {
                                        const replyAvatar = reply.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        return (
                                          <div key={reply.id} className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853]/80 to-[#b8922e]/80 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                              {replyAvatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white">{reply.user_name}</span>
                                                <span className="text-[10px] text-[#6b7280]">{new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                              </div>
                                              <p className="text-xs text-[#9ca3af] leading-relaxed mt-0.5">{reply.text}</p>
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

            {/* Why the Divide? */}
            {(() => {
              const allReviews = [...movieReviews, ...disputes.map(d => ({ rating: d.rating, text: d.text }))];
              return allReviews.length >= 3 ? (
                <section className="content-animate">
                  <WhyTheDivide reviews={allReviews} genres={movie.genres} />
                </section>
              ) : null;
            })()}

            {/* Related Movies */}
            {relatedMovies.length > 0 && (
              <section className="content-animate">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-xl font-bold text-white">You Might Also Like</h2>
                  {recSources.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {recSources.map((src) => {
                        // Map internal source names to consumer-friendly labels
                        const label: Record<string, string> = {
                          'TMDb Recommendations': 'Based on Taste',
                          'TMDb Similar': 'Similar Films',
                          'Letterboxd': 'Film Lovers',
                          'Rotten Tomatoes': 'Critics',
                          'AniList': 'Anime Community',
                          'Jikan/MAL': 'Anime Fans',
                        };
                        return (
                          <span key={src} className="text-[10px] font-medium text-[#9ca3af] bg-[#0c0c10] border border-[#1e1e28] px-2 py-0.5 rounded-full">
                            {label[src] || src}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {relatedMovies.map((m) => (
                    <div key={m.id}>
                      <MovieCard movie={m} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── Right Sidebar ─── */}
          <div className="space-y-6">
            {/* Movie Info Card */}
            <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Movie Info</h3>

              <div className="w-full aspect-video rounded-lg overflow-hidden mb-5 border border-[#1e1e28]/50">
                <img src={movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.poster_path || ''} alt={movie.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Release Date</span>
                    <p className="text-sm text-white">
                      {new Date(movie.release_date).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Runtime</span>
                    <p className="text-sm text-white">{runtimeStr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Language</span>
                    <p className="text-sm text-white">{languageNames[movie.original_language] || movie.original_language.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Film className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Director</span>
                    <p className="text-sm text-white">{movie.director}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Production</span>
                    <p className="text-sm text-white">{movie.production_companies.join(', ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#6b7280]">Status</span>
                    <p className="text-sm text-white">{movie.status}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget / Revenue / Box Office */}
            {(() => {
              const budgetFormatted = formatCurrency(movie.budget);
              const revenueFormatted = formatCurrency(movie.revenue);
              const domesticFormatted = formatCurrency(movie.box_office_domestic);
              const internationalFormatted = formatCurrency(movie.box_office_international);
              const worldwideFormatted = formatCurrency(movie.box_office_worldwide);
              const reportedFormatted = formatCurrency(movie.budget_reported);
              const hasAnyFinancialData = budgetFormatted || revenueFormatted || domesticFormatted || internationalFormatted || worldwideFormatted || reportedFormatted;

              return hasAnyFinancialData ? (
                <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> Financials
                  </h3>
                  <div className="space-y-3">
                    {budgetFormatted && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Budget</span>
                          <p className="text-sm text-white font-medium">{budgetFormatted}</p>
                        </div>
                      </div>
                    )}
                    {reportedFormatted && (
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Budget (Reported)</span>
                          <p className="text-sm text-white font-medium">{reportedFormatted}</p>
                        </div>
                      </div>
                    )}
                    {revenueFormatted && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Revenue</span>
                          <p className="text-sm text-white font-medium">{revenueFormatted}</p>
                        </div>
                      </div>
                    )}
                    {domesticFormatted && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Box Office Domestic</span>
                          <p className="text-sm text-white font-medium">{domesticFormatted}</p>
                        </div>
                      </div>
                    )}
                    {internationalFormatted && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Box Office International</span>
                          <p className="text-sm text-white font-medium">{internationalFormatted}</p>
                        </div>
                      </div>
                    )}
                    {worldwideFormatted && (
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <span className="text-xs text-[#6b7280]">Box Office Worldwide</span>
                          <p className="text-sm text-green-400 font-semibold">{worldwideFormatted}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> Financials
                  </h3>
                  <p className="text-sm text-[#2a2a35] italic">Financial data not available</p>
                </div>
              );
            })()}

            {/* Trailer — Priority: TMDb YouTube > iTunes Preview > YouTube Embed */}
            <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Trailer</h3>
              {(() => {
                const hasYouTubeId = !!movie.trailer_youtube_id;
                const hasITunesPreview = !!movie.itunes_preview_url;

                if (!hasYouTubeId && !hasITunesPreview) {
                  return (
                    <div className="w-full aspect-video bg-[#050507] rounded-lg flex items-center justify-center border border-[#1e1e28]">
                      <div className="text-center">
                        <Play className="w-8 h-8 text-[#2a2a35] mx-auto mb-2" />
                        <span className="text-xs text-[#6b7280]">No trailer available</span>
                      </div>
                    </div>
                  );
                }

                if (trailerOpen) {
                  // Prefer YouTube embed (from TMDb Videos or YouTube Data API)
                  if (hasYouTubeId) {
                    return (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${movie.trailer_youtube_id}?autoplay=1`}
                          title={`${movie.title} Trailer`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    );
                  }
                  // Fallback: iTunes preview (30-sec m4v)
                  if (hasITunesPreview) {
                    return (
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <video
                          src={movie.itunes_preview_url}
                          autoPlay
                          controls
                          className="w-full h-full object-contain"
                          poster={movie.itunes_artwork_url || undefined}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    );
                  }
                }

                // Show play button with source indicator
                const sourceLabel = hasYouTubeId
                  ? 'YouTube Trailer'
                  : 'iTunes Preview';

                return (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="w-full aspect-video bg-[#050507] rounded-lg flex items-center justify-center border border-[#1e1e28] hover:border-[#d4a853]/40 transition-colors group relative overflow-hidden"
                  >
                    {movie.itunes_artwork_url && !hasYouTubeId && (
                      <img
                        src={movie.itunes_artwork_url}
                        alt={movie.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                      />
                    )}
                    <div className="text-center relative z-10">
                      <div className="w-14 h-14 rounded-full bg-[#d4a853]/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#d4a853]/30 transition-colors">
                        <Play className="w-6 h-6 text-[#d4a853] fill-[#d4a853]" />
                      </div>
                      <span className="text-sm text-[#6b7280]">{sourceLabel}</span>
                      {!hasYouTubeId && hasITunesPreview && (
                        <span className="block text-[10px] text-[#4b5563] mt-1">30-sec preview</span>
                      )}
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* News Headlines */}
            {movie.news_headlines.length > 0 && (
              <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Latest News</h3>
                <div className="space-y-3">
                  {movie.news_headlines.slice(0, 3).map((headline, idx) => (
                    <a
                      key={idx}
                      href={headline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <p className="text-sm font-medium text-white group-hover:text-[#d4a853] transition-colors leading-snug mb-1">
                        {headline.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#6b7280]">
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
            <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider flex items-center gap-2">
                  <MonitorPlay className="w-3.5 h-3.5" /> Where to Watch
                </h3>
                {watchProviders && Object.keys(watchProviders.countries).length > 1 && (
                  <select
                    value={watchCountry}
                    onChange={(e) => setWatchCountry(e.target.value)}
                    className="bg-[#050507] border border-[#1e1e28] rounded-md py-1 px-2 text-xs text-[#9ca3af] focus:outline-none focus:border-[#d4a853]"
                  >
                    {Object.keys(watchProviders.countries).map(code => (
                      <option key={code} value={code}>
                        {countryNames[code] || code}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {watchLoading ? (
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#d4a853] mb-2" />
                  <p className="text-xs text-[#6b7280]">Loading providers...</p>
                </div>
              ) : currentCountryProviders.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <Tv className="w-8 h-8 text-[#2a2a35] mb-2" />
                  <p className="text-sm text-[#6b7280]">Not available for streaming</p>
                  <p className="text-xs text-[#2a2a35]">No providers found in {countryNames[watchCountry] || watchCountry}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stream */}
                  {streamProviders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Stream</p>
                      <div className="space-y-2">
                        {streamProviders.map(provider => (
                          <div key={`stream-${provider.id}`} className="flex items-center gap-2.5">
                            {provider.logoUrl ? (
                              <img src={provider.logoUrl} alt={provider.name} className="w-7 h-7 rounded-md object-cover bg-[#050507]" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-[#050507] flex items-center justify-center">
                                <Tv className="w-3.5 h-3.5 text-[#6b7280]" />
                              </div>
                            )}
                            <span className="text-sm text-white flex-1 truncate">{provider.name}</span>
                            <span className="text-[9px] font-semibold bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">STREAM</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rent */}
                  {rentProviders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Rent</p>
                      <div className="space-y-2">
                        {rentProviders.map(provider => (
                          <div key={`rent-${provider.id}`} className="flex items-center gap-2.5">
                            {provider.logoUrl ? (
                              <img src={provider.logoUrl} alt={provider.name} className="w-7 h-7 rounded-md object-cover bg-[#050507]" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-[#050507] flex items-center justify-center">
                                <Tv className="w-3.5 h-3.5 text-[#6b7280]" />
                              </div>
                            )}
                            <span className="text-sm text-white flex-1 truncate">{provider.name}</span>
                            <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">RENT</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buy */}
                  {buyProviders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Buy</p>
                      <div className="space-y-2">
                        {buyProviders.map(provider => (
                          <div key={`buy-${provider.id}`} className="flex items-center gap-2.5">
                            {provider.logoUrl ? (
                              <img src={provider.logoUrl} alt={provider.name} className="w-7 h-7 rounded-md object-cover bg-[#050507]" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-[#050507] flex items-center justify-center">
                                <Tv className="w-3.5 h-3.5 text-[#6b7280]" />
                              </div>
                            )}
                            <span className="text-sm text-white flex-1 truncate">{provider.name}</span>
                            <span className="text-[9px] font-semibold bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">BUY</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Free */}
                  {freeProviders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Free</p>
                      <div className="space-y-2">
                        {freeProviders.map(provider => (
                          <div key={`free-${provider.id}`} className="flex items-center gap-2.5">
                            {provider.logoUrl ? (
                              <img src={provider.logoUrl} alt={provider.name} className="w-7 h-7 rounded-md object-cover bg-[#050507]" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-[#050507] flex items-center justify-center">
                                <Tv className="w-3.5 h-3.5 text-[#6b7280]" />
                              </div>
                            )}
                            <span className="text-sm text-white flex-1 truncate">{provider.name}</span>
                            <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">FREE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source links */}
                  {watchProviders?.link && (
                    <a
                      href={watchProviders.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-[10px] text-[#6b7280] hover:text-[#9ca3af] pt-2 border-t border-[#1e1e28]/50 transition-colors"
                    >
                      Data from JustWatch & TVMaze <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Parental Guidance */}
            <div className="content-animate">
              <ParentalGuidance
                movieTitle={movie.title}
                movieId={movie.id}
                genres={movie.genres}
              />
            </div>

            {/* Critic Trust Score */}
            <div className="content-animate">
              <CriticTrustScore
                movieId={movie.id}
                movieTitle={movie.title}
                userReviewCount={disputes.length + movieReviews.length}
              />
            </div>

            {/* Live Sentiment Tracker */}
            <LiveSentimentTracker
              movieTitle={movie.title}
              movieId={movie.id}
              isNowPlaying={movie.status === 'Now Playing' || movie.status === 'Released'}
            />

            {/* Community Ratings */}
            <div className="content-animate">
              <CommunityRatings
                movieId={movie.id}
                movieSlug={movie.slug}
                genres={movie.genres}
                generalRating={movie.vote_average}
              />
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
