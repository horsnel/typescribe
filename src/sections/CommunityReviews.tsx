'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import ReviewCard from '@/components/review/ReviewCard';

interface LocalReview {
  id: number;
  movie_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  rating: number;
  text: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  moderated: boolean;
  moderation_note: string;
  reports: any[];
  movieSlug?: string;
  movieTitle?: string;
}

export default function CommunityReviews() {
  const [reviews, setReviews] = useState<LocalReview[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('typescribe_user_reviews');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReviews(parsed.slice(0, 3));
        }
      }
    } catch { /* ignore */ }
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3"><MessageSquare className="w-6 h-6 text-[#8B5CF6]" strokeWidth={1.5} /><h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Community Reviews</h2></div>
          <Link href="/browse" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#8B5CF6] transition-colors">View All<ArrowRight className="w-4 h-4" strokeWidth={1.5} /></Link>
        </div>
        <div className="card-grid flex flex-col gap-4">
          {reviews.map((review) => (<div key={review.id} className="card-reveal"><ReviewCard review={review} variant="full" showMovieTitle movieSlug={review.movieSlug || ''} /></div>))}
        </div>
      </div>
    </section>
  );
}
