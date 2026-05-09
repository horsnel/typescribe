'use client';
import { Star } from 'lucide-react';

interface StarRatingProps { rating: number; size?: 'sm' | 'md' | 'lg'; showValue?: boolean; }

export default function StarRating({ rating, size = 'md', showValue = true }: StarRatingProps) {
  const starRating = rating / 2;
  const sizeMap = { sm: { star: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' }, md: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-0.5' }, lg: { star: 'w-5 h-5', text: 'text-base', gap: 'gap-1' } };
  const s = sizeMap[size];
  return (
    <div className={`flex items-center ${s.gap}`}>
      <div className="flex items-center gap-px">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = starRating >= i + 1; const half = !filled && starRating >= i + 0.5;
          return (<div key={i} className="relative"><Star className={`${s.star} text-[#2a2a35]`} strokeWidth={1.5} />{(filled || half) && <div className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : half ? '50%' : '0%' }}><Star className={`${s.star} text-[#D4A853] fill-[#D4A853]`} strokeWidth={1.5} /></div>}</div>);
        })}
      </div>
      {showValue && <span className={`font-semibold text-[#D4A853] ml-1 ${s.text}`}>{rating.toFixed(1)}</span>}
    </div>
  );
}
