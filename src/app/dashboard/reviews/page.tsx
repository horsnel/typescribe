'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Star, Film, Trash2, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Review {
  id: number;
  movie_id: number;
  movie_title?: string;
  movie_slug?: string;
  rating: number;
  text: string;
  created_at: string;
  is_spoiler?: boolean;
}

export default function DashboardReviewsPage() {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('recent');
  const [spoilersRevealed, setSpoilersRevealed] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_reviews');
      if (data) {
        setReviews(JSON.parse(data));
      }
    } catch { /* ignore */ }
  }, []);

  const handleDelete = (id: number) => {
    const updated = reviews.filter(r => r.id !== id);
    setReviews(updated);
    localStorage.setItem('typescribe_reviews', JSON.stringify(updated));
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'movie') return true;
    if (filter === 'tv') return true;
    return true;
  });

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

  // Count genres
  const genreMap: Record<string, number> = {};
  reviews.forEach(r => { genreMap['Reviews'] = (genreMap['Reviews'] || 0) + 1; });

  const toggleSpoiler = (id: number) => {
    setSpoilersRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your reviews.</p><Link href="/login" className="text-[#d4a853] hover:underline text-sm">Sign In</Link></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Reviews</h1>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]">
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">Series</option>
            <option value="anime">Anime</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]">
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{reviews.length}</p>
          <p className="text-xs text-[#6b7280]">Total Reviews</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{avgRating ?? '--'}</p>
          <p className="text-xs text-[#6b7280]">Average Rating</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{reviews.filter(r => r.rating >= 8).length}</p>
          <p className="text-xs text-[#6b7280]">Highly Rated (8+)</p>
        </div>
      </div>

      {/* Reviews List or Empty State */}
      {sortedReviews.length === 0 ? (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <Star className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No reviews yet</h2>
          <p className="text-[#9ca3af] mb-6">Share your opinions and help others discover great movies.</p>
          <Link href="/browse"><Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2"><Film className="w-4 h-4" />Browse Movies to Review</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => {
            const ratingColor = review.rating >= 8 ? 'text-green-400 bg-green-500/10' : review.rating >= 5 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10';
            const isSpoiler = review.is_spoiler;
            const isRevealed = spoilersRevealed.has(review.id);
            return (
              <div key={review.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {review.movie_slug ? (
                        <Link href={`/movie/${review.movie_slug}`} className="text-base font-semibold text-white hover:text-[#d4a853] transition-colors truncate">
                          {review.movie_title || `Movie #${review.movie_id}`}
                        </Link>
                      ) : (
                        <span className="text-base font-semibold text-white truncate">{review.movie_title || `Movie #${review.movie_id}`}</span>
                      )}
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${ratingColor}`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-bold">{review.rating}/10</span>
                      </div>
                      {isSpoiler && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20">
                          <Eye className="w-3 h-3" /> SPOILER
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <p className="text-xs text-[#6b7280] mb-2">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {/* Review text */}
                    {isSpoiler && !isRevealed ? (
                      <div className="relative">
                        <p className="text-sm text-[#9ca3af] blur-sm select-none leading-relaxed">{review.text}</p>
                        <button
                          onClick={() => toggleSpoiler(review.id)}
                          className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/80 rounded-lg hover:bg-[#0c0c10]/60 transition-colors"
                        >
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full">Reveal Spoiler</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-[#9ca3af] leading-relaxed line-clamp-3">{review.text}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleDelete(review.id)} className="p-2 text-[#6b7280] hover:text-red-400 transition-colors rounded-lg hover:bg-[#111118]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
