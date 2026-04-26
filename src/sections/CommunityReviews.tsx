'use client';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { userReviews, movies } from '@/lib/data';
import ReviewCard from '@/components/review/ReviewCard';

export default function CommunityReviews() {
  const displayReviews = userReviews.slice(0, 3).map((review) => {
    const movie = movies.find((m) => m.id === review.movie_id);
    return { review, movieSlug: movie?.slug || '', movieTitle: movie?.title || '' };
  });
  return (
    <section className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3"><MessageSquare className="w-6 h-6 text-[#e50914]" /><h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Community Reviews</h2></div>
          <Link href="/browse" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#e50914] transition-colors">View All<ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className="card-grid flex flex-col gap-4">
          {displayReviews.map(({ review, movieSlug }) => (<div key={review.id} className="card-reveal"><ReviewCard review={review} variant="full" showMovieTitle movieSlug={movieSlug} /></div>))}
        </div>
      </div>
    </section>
  );
}
