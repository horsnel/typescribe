'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Star, Film, Trash2, Eye, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ReviewComposer from '@/components/review/ReviewComposer';

interface Review {
  id: string;
  movie_id: number;
  movie_title: string;
  movie_slug?: string | null;
  poster_path?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  text?: string | null; // backwards-compat with localStorage shape
  spoiler?: boolean;
  created_at: string;
}

export default function DashboardReviewsPage() {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('recent');
  const [spoilersRevealed, setSpoilersRevealed] = useState<Set<string>>(new Set());
  const [showComposer, setShowComposer] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', { cache: 'no-store' });
      if (!res.ok) {
        setReviews([]);
        return;
      }
      const data = await res.json();
      setReviews((data?.reviews ?? []).map((r: any) => ({
        ...r,
        // Normalize the body field so the legacy UI can render either shape
        text: r.body ?? r.text ?? '',
      })));
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchReviews();
  }, [isAuthenticated, fetchReviews]);

  const handleDelete = async (id: string) => {
    // Optimistic delete from local state — the row disappears immediately
    // even if the network call is slow.
    setReviews(prev => prev.filter(r => r.id !== id));
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Restore the review if the delete failed (e.g. 404/401)
        const data = await res.json().catch(() => ({}));
        console.error('[dashboard/reviews] delete failed:', data?.error ?? res.status);
        fetchReviews(); // re-sync from server
      }
    } catch (err) {
      console.error('[dashboard/reviews] delete error:', err);
      fetchReviews(); // re-sync from server
    }
  };

  const filteredReviews = reviews; // filter dropdown is currently a no-op (kept for future format filtering)
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sort) {
      case 'highest': return b.rating - a.rating;
      case 'lowest': return a.rating - b.rating;
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  const toggleSpoiler = (id: string) => {
    setSpoilersRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
        <p className="text-[#9ca3af]">Please sign in to view your reviews.</p>
        <Link href="/login" className="text-[#D4A853] hover:underline text-sm mt-2 inline-block">Sign In</Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Reviews</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#D4A853]">
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">Series</option>
            <option value="anime">Anime</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#D4A853]">
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
          <Button
            onClick={() => setShowComposer(s => !s)}
            className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Write a Review
          </Button>
        </div>
      </div>

      {/* Inline composer */}
      {showComposer && (
        <div className="mb-8">
          <ReviewComposer
            onSubmitted={() => {
              setShowComposer(false);
              fetchReviews();
            }}
            onCancel={() => setShowComposer(false)}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{loading ? '—' : reviews.length}</p>
          <p className="text-xs text-[#6b7280]">Total Reviews</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{loading ? '—' : (avgRating ?? '--')}</p>
          <p className="text-xs text-[#6b7280]">Average Rating</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{loading ? '—' : reviews.filter(r => r.rating >= 8).length}</p>
          <p className="text-xs text-[#6b7280]">Highly Rated (8+)</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
          <span className="ml-3 text-[#6b7280]">Loading your reviews...</span>
        </div>
      )}

      {/* Reviews List or Empty State */}
      {!loading && sortedReviews.length === 0 ? (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <Star className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">No reviews yet</h2>
          <p className="text-[#9ca3af] mb-6">Share your opinions and help others discover great movies.</p>
          <Button
            onClick={() => setShowComposer(true)}
            className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Write Your First Review
          </Button>
        </div>
      ) : (
        !loading && (
          <div className="space-y-4">
            {sortedReviews.map((review) => {
              const ratingColor = review.rating >= 8 ? 'text-green-400 bg-green-500/10' : review.rating >= 5 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10';
              const isSpoiler = review.spoiler;
              const isRevealed = spoilersRevealed.has(review.id);
              const reviewText = review.body ?? review.text ?? '';
              return (
                <div key={review.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Poster (denormalized via Supabase trigger) */}
                      {review.poster_path ? (
                        <img
                          src={review.poster_path.startsWith('http')
                            ? review.poster_path
                            : `https://image.tmdb.org/t/p/w185${review.poster_path}`}
                          alt={review.movie_title}
                          className="w-12 h-18 object-cover rounded-md flex-shrink-0 bg-[#1a1a22]"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-18 bg-[#1a1a22] rounded-md flex-shrink-0 flex items-center justify-center">
                          <Film className="w-4 h-4 text-[#3a3a45]" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Link
                            href={`/movie/${encodeURIComponent(review.movie_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}-${review.movie_id}`}
                            className="text-base font-semibold text-white truncate hover:text-[#D4A853] transition-colors"
                          >
                            {review.movie_title || `Movie #${review.movie_id}`}
                          </Link>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${ratingColor}`}>
                            <Star className="w-3 h-3 fill-current" strokeWidth={1.5} />
                            <span className="text-xs font-bold">{review.rating}/10</span>
                          </div>
                          {isSpoiler && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              <Eye className="w-3 h-3" strokeWidth={1.5} /> SPOILER
                            </span>
                          )}
                        </div>
                        {/* Date + title */}
                        <p className="text-xs text-[#6b7280] mb-2">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {review.title ? <> · <span className="text-[#9ca3af] italic">{review.title}</span></> : null}
                        </p>
                        {/* Review text */}
                        {isSpoiler && !isRevealed ? (
                          <div className="relative">
                            <p className="text-sm text-[#9ca3af] blur-sm select-none leading-relaxed line-clamp-3">{reviewText}</p>
                            <button
                              onClick={() => toggleSpoiler(review.id)}
                              className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/80 rounded-lg hover:bg-[#0c0c10]/60 transition-colors"
                            >
                              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full">Reveal Spoiler</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[#9ca3af] leading-relaxed line-clamp-3">{reviewText}</p>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleDelete(review.id)} className="p-2 text-[#6b7280] hover:text-red-400 transition-colors rounded-lg hover:bg-[#111118]" aria-label="Delete review">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
}
