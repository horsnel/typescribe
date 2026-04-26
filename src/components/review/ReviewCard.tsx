'use client';
import { useState } from 'react';
import { Star, ThumbsUp, Flag, Edit, Trash2, Shield, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import type { UserReview, ReportReason } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { getModerationBadge } from '@/lib/moderation';
import ReportModal from './ReportModal';

interface ReviewCardProps {
  review: UserReview;
  variant?: 'full' | 'compact';
  onHelpful?: (id: number) => void;
  onReport?: (id: number, reason: ReportReason, details: string) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  showMovieTitle?: boolean;
  movieSlug?: string;
}

export default function ReviewCard({
  review,
  variant = 'full',
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  showMovieTitle = false,
  movieSlug,
}: ReviewCardProps) {
  const [helped, setHelped] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [reported, setReported] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const isOwnReview = isAuthenticated && user?.id === review.user_id;
  const isLong = review.text.length > 300;
  const displayText = isLong && !expanded ? review.text.slice(0, 300) + '...' : review.text;

  const handleHelpful = () => {
    if (helped) setHelpfulCount(helpfulCount - 1);
    else setHelpfulCount(helpfulCount + 1);
    setHelped(!helped);
    onHelpful?.(review.id);
  };

  const handleReportSubmit = (reason: ReportReason, details: string) => {
    setReported(true);
    onReport?.(review.id, reason, details);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const avatarFallback = review.user_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // Get moderation badge info
  const badge = getModerationBadge(
    review.moderated || false,
    review.moderation_note || '',
    review.reports || []
  );

  // Rating color based on score
  const ratingColor = review.rating >= 8 ? 'text-green-400 bg-green-500/10' : review.rating >= 5 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10';

  if (variant === 'compact') {
    return (
      <div className="bg-[#050507] border border-[#1e1e28] rounded-xl p-4 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
          {review.user_avatar ? <img src={review.user_avatar} alt={review.user_name} className="w-full h-full object-cover" /> : avatarFallback}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">{review.user_name}</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${ratingColor}`}>
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-bold">{review.rating}/10</span>
            </div>
          </div>
          {showMovieTitle && movieSlug && <Link href={`/movie/${movieSlug}`} className="text-xs text-[#6b7280] hover:text-[#9ca3af] mb-1 block">Review of {movieSlug}</Link>}
          <p className="text-sm text-[#9ca3af] line-clamp-2">{review.text}</p>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={handleHelpful} className={cn('flex items-center gap-1 text-xs transition-colors', helped ? 'text-[#e50914]' : 'text-[#6b7280] hover:text-[#9ca3af]')}><ThumbsUp className="w-3 h-3" /><span>{helpfulCount}</span></button>
            <span className="text-xs text-[#6b7280]">{formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-[#050507] border rounded-xl p-6 ${badge ? 'border-yellow-500/30' : 'border-[#1e1e28]'}`}>
        {/* Moderation Badge */}
        {badge && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-4 ${badge.bgColor}`}>
            {badge.type === 'pending' ? (
              <Clock className={`w-4 h-4 ${badge.color}`} />
            ) : badge.type === 'flagged' ? (
              <AlertTriangle className={`w-4 h-4 ${badge.color}`} />
            ) : (
              <Shield className={`w-4 h-4 ${badge.color}`} />
            )}
            <span className={`text-xs font-medium ${badge.color}`}>{badge.label}</span>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
            {review.user_avatar ? <img src={review.user_avatar} alt={review.user_name} className="w-full h-full object-cover" /> : avatarFallback}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{review.user_name}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${ratingColor}`}>
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold">{review.rating}/10</span>
                </div>
              </div>
              <span className="text-xs text-[#6b7280]">{formatDate(review.created_at)}</span>
            </div>

            {showMovieTitle && movieSlug && (
              <p className="text-sm text-[#6b7280] mb-2">
                Review of{' '}
                <Link href={`/movie/${movieSlug}`} className="text-[#9ca3af] font-medium hover:text-white transition-colors">
                  {movieSlug.replace(/-/g, ' ')}
                </Link>
              </p>
            )}

            {/* Rating Bar Visualization */}
            <div className="mb-3">
              <div className="w-full h-1.5 bg-[#2a2a35] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    review.rating >= 8 ? 'bg-green-400' : review.rating >= 5 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${review.rating * 10}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
              {displayText}
              {isLong && !expanded && <button onClick={() => setExpanded(true)} className="text-[#e50914] hover:underline ml-1">Read more</button>}
              {isLong && expanded && <button onClick={() => setExpanded(false)} className="text-[#e50914] hover:underline ml-1">Show less</button>}
            </p>

            {/* Action Bar */}
            <div className="flex items-center gap-6">
              <button onClick={handleHelpful} className={cn('flex items-center gap-1.5 text-xs transition-colors', helped ? 'text-[#e50914]' : 'text-[#6b7280] hover:text-[#9ca3af]')}>
                <ThumbsUp className="w-3.5 h-3.5" /><span>Helpful ({helpfulCount})</span>
              </button>

              {!isOwnReview && !reported && (
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" /><span>Report</span>
                </button>
              )}
              {!isOwnReview && reported && (
                <span className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <Shield className="w-3.5 h-3.5" />Reported
                </span>
              )}

              {isOwnReview && (
                <>
                  {onEdit && (
                    <button onClick={() => onEdit(review.id)} className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors">
                      <Edit className="w-3.5 h-3.5" /><span>Edit</span>
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(review.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        contentType="review"
        contentPreview={review.text.slice(0, 150)}
      />
    </>
  );
}
