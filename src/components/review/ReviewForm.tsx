'use client';
import { useState } from 'react';
import { Star, Send, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { preSubmitCheck } from '@/lib/moderation';

interface ReviewFormProps { movieId: number; onSubmit: (review: { movieId: number; rating: number; text: string }) => void; onCancel?: () => void; }
const MIN_CHARS = 20; const MAX_CHARS = 2000;

export default function ReviewForm({ movieId, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({});
  const [moderationWarnings, setModerationWarnings] = useState<string[]>([]);
  const [moderationBlocked, setModerationBlocked] = useState('');
  const displayRating = hoverRating || rating;
  const isValid = rating > 0 && text.trim().length >= MIN_CHARS && text.trim().length <= MAX_CHARS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { rating?: string; text?: string } = {};
    if (rating === 0) newErrors.rating = 'Please select a rating';
    if (text.trim().length < MIN_CHARS) newErrors.text = `Review must be at least ${MIN_CHARS} characters`;
    if (text.trim().length > MAX_CHARS) newErrors.text = `Review must be under ${MAX_CHARS} characters`;

    // Run pre-submission moderation check
    const check = preSubmitCheck(text, rating);
    if (!check.canSubmit) {
      setModerationBlocked(check.blocked);
      setModerationWarnings([]);
      return;
    }
    if (check.warnings.length > 0) {
      setModerationWarnings(check.warnings);
      setModerationBlocked('');
      // Still allow submission with warnings (they'll be held for review server-side)
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSubmit({ movieId, rating, text: text.trim() });
    setRating(0); setText(''); setErrors({});
    setModerationWarnings([]);
    setModerationBlocked('');
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setErrors((prev) => ({ ...prev, text: undefined }));
    // Clear moderation warnings when user edits
    if (moderationWarnings.length > 0 || moderationBlocked) {
      setModerationWarnings([]);
      setModerationBlocked('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">Write a Review</h3>
        <div className="flex items-center gap-1 text-[10px] font-semibold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
          <ShieldCheck className="w-3 h-3" /> AI Moderated
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">Your Rating</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <button key={i + 1} type="button" onClick={() => { setRating(i + 1); setErrors((prev) => ({ ...prev, rating: undefined })); }} onMouseEnter={() => setHoverRating(i + 1)} onMouseLeave={() => setHoverRating(0)} className="p-0.5 transition-transform hover:scale-110">
              <Star className={`w-6 h-6 transition-colors ${i + 1 <= displayRating ? 'text-[#f5c518] fill-[#f5c518]' : 'text-[#2a2a35]'}`} />
            </button>
          ))}
          {displayRating > 0 && <span className="ml-2 text-lg font-bold text-[#f5c518]">{displayRating}/10</span>}
        </div>
        {errors.rating && <p className="text-xs text-red-400 mt-1">{errors.rating}</p>}
        {displayRating > 0 && (displayRating === 1 || displayRating === 10) && (
          <p className="text-xs text-yellow-400/80 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Extreme ratings work best with detailed explanations
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">Your Review</label>
        <textarea rows={5} value={text} onChange={(e) => handleTextChange(e.target.value)} placeholder="Share your thoughts about this movie..." className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none text-sm" maxLength={MAX_CHARS} />
        <div className="flex items-center justify-between mt-1">
          {errors.text ? <p className="text-xs text-red-400">{errors.text}</p> : <span />}
          <p className={`text-xs ${text.length > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-[#6b6b7b]'}`}>{text.length}/{MAX_CHARS}</p>
        </div>
      </div>

      {/* Moderation Warnings */}
      {moderationWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {moderationWarnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-yellow-300/80">{warning}</p>
                <p className="text-[10px] text-yellow-300/50 mt-1">Your review will be submitted but may be held for manual review.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Moderation Blocked */}
      {moderationBlocked && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-300">{moderationBlocked}</p>
            <p className="text-[10px] text-red-300/50 mt-1">Please revise your review to comply with community guidelines.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isValid} className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4" />Submit Review</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] gap-2"><X className="w-4 h-4" />Cancel</Button>}
      </div>
    </form>
  );
}
