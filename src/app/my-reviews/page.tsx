'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MessageSquare, Star, Edit, Trash2, Filter, ChevronDown, Search, SortAsc } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { userReviews, movies } from '@/lib/data';
import { Button } from '@/components/ui/button';

interface LocalReview {
  id: number;
  movie_id: number;
  rating: number;
  text: string;
  created_at: string;
}

type SortOption = 'recent' | 'highest' | 'lowest' | 'movie';

export default function MyReviewsPage() {
  const { user, isAuthenticated } = useAuth();
  const [localReviews, setLocalReviews] = useState<LocalReview[]>([]);
  const [sort, setSort] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0);
    const loadReviews = () => {
      try {
        const data = localStorage.getItem('typescribe_user_reviews');
        if (data) setLocalReviews(JSON.parse(data));
      } catch { /* ignore */ }
    };
    loadReviews();
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to view your reviews</p>
          <Link href="/login" className="text-[#d4a853] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  // Combine local reviews with demo reviews for this user
  const demoReviews = userReviews.filter((r) => r.user_id === 101);
  const allReviews = [
    ...localReviews.map((r) => ({ ...r, isLocal: true })),
    ...demoReviews.map((r) => ({
      id: r.id,
      movie_id: r.movie_id,
      rating: r.rating,
      text: r.text,
      created_at: r.created_at,
      isLocal: false,
    })),
  ];

  const filtered = useMemo(() => {
    let result = [...allReviews];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const movie = movies.find((m) => m.id === r.movie_id);
        return r.text.toLowerCase().includes(q) || (movie?.title.toLowerCase().includes(q) ?? false);
      });
    }
    switch (sort) {
      case 'recent': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'highest': result.sort((a, b) => b.rating - a.rating); break;
      case 'lowest': result.sort((a, b) => a.rating - b.rating); break;
      case 'movie': result.sort((a, b) => {
        const ma = movies.find((m) => m.id === a.movie_id);
        const mb = movies.find((m) => m.id === b.movie_id);
        return (ma?.title || '').localeCompare(mb?.title || '');
      }); break;
    }
    return result;
  }, [allReviews, sort, searchQuery]);

  // Stats
  const avgRating = allReviews.length > 0 ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1) : '0';
  const fiveStarCount = allReviews.filter(r => r.rating >= 8).length;

  const handleDelete = (reviewId: number) => {
    const updated = localReviews.filter((r) => r.id !== reviewId);
    setLocalReviews(updated);
    try { localStorage.setItem('typescribe_user_reviews', JSON.stringify(updated)); } catch { /* ignore */ }
    setDeleteConfirmId(null);
  };

  const handleEditSave = (reviewId: number) => {
    const updated = localReviews.map((r) =>
      r.id === reviewId ? { ...r, text: editText, rating: editRating } : r
    );
    setLocalReviews(updated);
    try { localStorage.setItem('typescribe_user_reviews', JSON.stringify(updated)); } catch { /* ignore */ }
    setEditingReviewId(null);
  };

  const startEdit = (review: typeof allReviews[0]) => {
    setEditingReviewId(review.id);
    setEditText(review.text);
    setEditRating(review.rating);
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
          <span>/</span>
          <span className="text-[#9ca3af]">My Reviews</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-[#d4a853]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">My Reviews</h1>
        </div>

        {/* Stats Row */}
        {allReviews.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <MessageSquare className="w-5 h-5 text-[#d4a853] mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{allReviews.length}</div>
              <div className="text-xs text-[#6b7280]">Reviews</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-[#f5c518] mx-auto mb-1" />
              <div className="text-xl font-bold text-[#f5c518]">{avgRating}</div>
              <div className="text-xs text-[#6b7280]">Avg Rating</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{fiveStarCount}</div>
              <div className="text-xs text-[#6b7280]">Highly Rated (8+)</div>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        {allReviews.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your reviews..."
                className="w-full bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] text-sm"
              />
            </div>
            <div className="flex gap-2">
              {([
                { value: 'recent', label: 'Recent' },
                { value: 'highest', label: 'Highest' },
                { value: 'lowest', label: 'Lowest' },
                { value: 'movie', label: 'By Movie' },
              ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sort === value ? 'bg-[#d4a853] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((review) => {
              const movie = movies.find((m) => m.id === review.movie_id);
              const isEditing = editingReviewId === review.id;

              return (
                <div key={review.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Movie Poster */}
                    {movie && (
                      <Link href={`/movie/${movie.slug}`} className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507] hidden sm:block">
                        <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Link href={movie ? `/movie/${movie.slug}` : '#'}>
                            <h3 className="text-sm font-semibold text-white hover:text-[#d4a853] transition-colors">
                              {movie?.title || 'Unknown Movie'}
                            </h3>
                          </Link>
                          <p className="text-xs text-[#6b7280] mt-0.5">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" />
                          <span className="text-sm font-semibold text-[#f5c518]">{review.rating}/10</span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-[#6b7280] mb-1 block">Rating</label>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 10 }, (_, i) => (
                                <button key={i + 1} type="button" onClick={() => setEditRating(i + 1)} className="p-0.5">
                                  <Star className={`w-5 h-5 transition-colors ${i + 1 <= editRating ? 'text-[#f5c518] fill-[#f5c518]' : 'text-[#2a2a35]'}`} />
                                </button>
                              ))}
                              <span className="ml-2 text-sm font-bold text-[#f5c518]">{editRating}/10</span>
                            </div>
                          </div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none text-sm"
                          />
                          <div className="flex items-center gap-3">
                            <Button onClick={() => handleEditSave(review.id)} className="bg-[#d4a853] hover:bg-[#b8922e] text-white text-sm gap-2">
                              Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => setEditingReviewId(null)} className="border-[#1e1e28] text-[#9ca3af] hover:text-white text-sm">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-[#9ca3af] leading-relaxed">{review.text}</p>
                          {'isLocal' in review && review.isLocal && (
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e1e28]">
                              <button onClick={() => startEdit(review)} className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors">
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              {deleteConfirmId === review.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-400">Delete this review?</span>
                                  <button onClick={() => handleDelete(review.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-[#6b7280] hover:text-white">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirmId(review.id)} className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24">
            <MessageSquare className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-lg text-[#9ca3af] mb-2">{searchQuery ? 'No reviews match your search' : 'No reviews yet'}</p>
            <p className="text-sm text-[#6b7280] mb-4">{searchQuery ? 'Try a different search term' : 'Share your thoughts about movies you\'ve watched'}</p>
            {!searchQuery && <Link href="/browse" className="text-[#d4a853] hover:underline">Browse Movies</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
