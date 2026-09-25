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
          // Normalize legacy mirror entries: older write shapes may be missing
          // fields that ReviewCard assumes (user_name, text, rating...). Fill
          // safe defaults so one bad entry can never crash the homepage.
          const normalized = parsed
            .filter((r): r is Record<string, unknown> => r && typeof r === 'object')
            .map((r) => ({
              ...r,
              id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : 0,
              user_name: typeof r.user_name === 'string' && r.user_name ? r.user_name : 'Anonymous',
              user_avatar: typeof r.user_avatar === 'string' ? r.user_avatar : '',
              user_id: typeof r.user_id === 'number' || typeof r.user_id === 'string' ? r.user_id : 0,
              rating: typeof r.rating === 'number' ? r.rating : 0,
              text: typeof r.text === 'string' ? r.text : '',
              helpful_count: typeof r.helpful_count === 'number' ? r.helpful_count : 0,
              created_at: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
              updated_at: typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString(),
              moderated: Boolean(r.moderated),
              moderation_note: typeof r.moderation_note === 'string' ? r.moderation_note : '',
              reports: Array.isArray(r.reports) ? r.reports : [],
            })) as LocalReview[];
          if (normalized.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- load initial state from localStorage on mount (SSR-safe via 'use client')
            setReviews(normalized.slice(0, 3));
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10 flex-wrap gap-3">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm"><MessageSquare className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} /><h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Community Reviews</h2></div>
          <Link href="/browse" aria-label="View all community reviews" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"><ArrowRight className="w-4 h-4" strokeWidth={1.5} /></Link>
        </div>
        <div className="card-grid flex flex-col gap-4">
          {reviews.map((review) => (<div key={review.id} className="card-reveal"><ReviewCard review={review} variant="full" showMovieTitle movieSlug={review.movieSlug || ''} /></div>))}
        </div>
      </div>
    </section>
  );
}
