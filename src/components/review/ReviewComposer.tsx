'use client';
import { useState, useEffect, useRef } from 'react';
import { Star, Send, X, AlertTriangle, ShieldCheck, Search, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { preSubmitCheck } from '@/lib/moderation';

// ─── Types ───
interface PickedMovie {
  id: number;
  title: string;
  poster_path?: string | null;
  release_date?: string | null;
  slug?: string;
  genres?: Array<{ id: number; name: string }> | string[];
}

interface ReviewComposerProps {
  /** If provided, hides the movie picker (used on movie detail pages). */
  presetMovie?: PickedMovie;
  /**
   * If provided, switches the composer into "edit mode": pre-fills the form
   * with the existing review's fields and submits a PUT to /api/reviews/[id]
   * instead of a POST to /api/reviews. The movie picker is hidden (the movie
   * can't be changed post-creation).
   */
  initialReview?: {
    id: string;
    movie_id: number;
    movie_title: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    spoiler?: boolean;
    poster_path?: string | null;
    release_date?: string | null;
    genres?: string[] | Array<{ id: number; name: string }> | null;
  };
  /** Called after a successful POST /api/reviews — parent can refetch lists. */
  onSubmitted?: (review: any) => void;
  onCancel?: () => void;
}

const MIN_CHARS = 20;
const MAX_CHARS = 2000;

export default function ReviewComposer({ presetMovie, initialReview, onSubmitted, onCancel }: ReviewComposerProps) {
  const isEditMode = !!initialReview;

  // When editing, lock the movie to the review's existing movie.
  const [movie, setMovie] = useState<PickedMovie | null>(
    initialReview
      ? {
          id: initialReview.movie_id,
          title: initialReview.movie_title,
          poster_path: initialReview.poster_path ?? null,
          release_date: initialReview.release_date ?? null,
          genres: initialReview.genres ?? [],
        }
      : presetMovie ?? null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickedMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(initialReview?.title ?? '');
  const [text, setText] = useState(initialReview?.body ?? '');
  const [spoiler, setSpoiler] = useState(initialReview?.spoiler ?? false);
  const [errors, setErrors] = useState<{ movie?: string; rating?: string; text?: string }>({});
  const [moderationWarnings, setModerationWarnings] = useState<string[]>([]);
  const [moderationBlocked, setModerationBlocked] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const displayRating = hoverRating || rating;
  const isValid = !!movie && rating > 0 && text.trim().length >= MIN_CHARS && text.trim().length <= MAX_CHARS;

  // ─── Movie search (debounced) ───
  useEffect(() => {
    if (presetMovie) return; // no picker needed
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const t = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const movies = (data?.movies ?? []).slice(0, 8).map((m: any) => ({
            id: m.id ?? m.tmdb_id,
            title: m.title,
            poster_path: m.poster_path ?? null,
            release_date: m.release_date ?? null,
            slug: m.slug,
            genres: m.genres ?? [],
          }));
          setSearchResults(movies);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, presetMovie]);

  // ─── Click outside to close search dropdown ───
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleTextChange = (val: string) => {
    setText(val);
    setErrors((prev) => ({ ...prev, text: undefined }));
    if (moderationWarnings.length > 0 || moderationBlocked) {
      setModerationWarnings([]);
      setModerationBlocked('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { movie?: string; rating?: string; text?: string } = {};
    if (!movie) newErrors.movie = 'Please pick a movie first';
    if (rating === 0) newErrors.rating = 'Please select a rating';
    if (text.trim().length < MIN_CHARS) newErrors.text = `Review must be at least ${MIN_CHARS} characters`;
    if (text.trim().length > MAX_CHARS) newErrors.text = `Review must be under ${MAX_CHARS} characters`;

    const check = preSubmitCheck(text, rating);
    if (!check.canSubmit) {
      setModerationBlocked(check.blocked);
      setModerationWarnings([]);
      return;
    }
    if (check.warnings.length > 0) {
      setModerationWarnings(check.warnings);
      setModerationBlocked('');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const genres = Array.isArray(movie?.genres)
        ? movie!.genres.map((g: any) => (typeof g === 'string' ? g : g.name)).filter(Boolean)
        : [];
      const release_year = movie?.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;

      const payload = {
        rating,
        title: title.trim(),
        body: text.trim(),
        spoiler,
        genres: genres.length > 0 ? genres : null,
        release_year: Number.isFinite(release_year) ? release_year : null,
      };

      const res = isEditMode
        ? await fetch(`/api/reviews/${initialReview!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              movie_id: movie!.id,
              movie_title: movie!.title,
              ...payload,
            }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to submit review');
      // Reset (only for create mode — edit mode keeps the form so the user
      // can see what they saved, parent will typically close the composer)
      if (!isEditMode) {
        setRating(0); setText(''); setTitle(''); setSpoiler(false);
        setModerationWarnings([]); setModerationBlocked('');
        setErrors({});
        if (!presetMovie) setMovie(null);
      }
      onSubmitted?.(data.review);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const resolvePoster = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `https://image.tmdb.org/t/p/w92${path}`;
    return path;
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">{isEditMode ? 'Edit Review' : 'Write a Review'}</h3>
        <div className="flex items-center gap-1 text-[10px] font-semibold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
          <ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> AI Moderated
        </div>
      </div>

      {/* ─── Movie picker (only when no presetMovie and not in edit mode) ─── */}
      {!presetMovie && !isEditMode && (
        <div className="mb-4" ref={searchRef}>
          <label className="text-sm font-medium text-white mb-2 block">Movie / Show</label>
          {movie ? (
            <div className="flex items-center gap-3 bg-[#050507] border border-[#1e1e28] rounded-lg p-3">
              {movie.poster_path && (
                <img
                  src={resolvePoster(movie.poster_path)}
                  alt={movie.title}
                  className="w-10 h-14 object-cover rounded-md"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{movie.title}</p>
                <p className="text-xs text-[#6b7280]">
                  {movie.release_date ? movie.release_date.split('-')[0] : 'Release date unknown'}
                  {Array.isArray(movie.genres) && movie.genres.length > 0 && (
                    <> · {movie.genres.slice(0, 3).map((g: any) => typeof g === 'string' ? g : g.name).join(', ')}</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMovie(null); setSearchQuery(''); setSearchResults([]); }}
                className="p-1.5 text-[#6b7280] hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Change movie"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                placeholder="Search for a movie or show..."
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-full py-2.5 pl-10 pr-4 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#D4A853]" strokeWidth={1.5} />
              )}
              {showResults && !isSearching && searchResults.length > 0 && (
                <div className="absolute z-30 top-full mt-1 w-full bg-[#0c0c10] border border-[#1e1e28] rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMovie(m); setSearchQuery(''); setSearchResults([]); setShowResults(false); setErrors((prev) => ({ ...prev, movie: undefined })); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#111118] transition-colors text-left"
                    >
                      {m.poster_path ? (
                        <img src={resolvePoster(m.poster_path)} alt={m.title} className="w-8 h-12 object-cover rounded-md flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-12 bg-[#1a1a22] rounded-md flex-shrink-0 flex items-center justify-center">
                          <Film className="w-3 h-3 text-[#3a3a45]" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{m.title}</p>
                        <p className="text-xs text-[#6b7280]">{m.release_date ? m.release_date.split('-')[0] : '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.movie && <p className="text-xs text-red-400 mt-1">{errors.movie}</p>}
        </div>
      )}

      {/* ─── Rating ─── */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">Your Rating</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i + 1}
              type="button"
              onClick={() => { setRating(i + 1); setErrors((prev) => ({ ...prev, rating: undefined })); }}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 transition-colors ${i + 1 <= displayRating ? 'text-[#D4A853] fill-[#D4A853]' : 'text-[#2a2a35]'}`}
                strokeWidth={1.5}
              />
            </button>
          ))}
          {displayRating > 0 && <span className="ml-2 text-lg font-bold text-[#D4A853]">{displayRating}/10</span>}
        </div>
        {errors.rating && <p className="text-xs text-red-400 mt-1">{errors.rating}</p>}
        {displayRating > 0 && (displayRating === 1 || displayRating === 10) && (
          <p className="text-xs text-yellow-400/80 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
            Extreme ratings work best with detailed explanations
          </p>
        )}
      </div>

      {/* ─── Title (optional) ─── */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">Headline <span className="text-[#6b7280] font-normal">(optional)</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          placeholder="Summarize your take in a few words..."
          className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-sm"
        />
      </div>

      {/* ─── Body ─── */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">Your Review</label>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Share your thoughts about this movie..."
          className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] resize-none text-sm"
          maxLength={MAX_CHARS}
        />
        <div className="flex items-center justify-between mt-1">
          {errors.text ? <p className="text-xs text-red-400">{errors.text}</p> : <span />}
          <p className={`text-xs ${text.length > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-[#6b7280]'}`}>{text.length}/{MAX_CHARS}</p>
        </div>
      </div>

      {/* ─── Spoiler toggle ─── */}
      <div className="mb-4 flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(e) => setSpoiler(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#1e1e28] rounded-full peer peer-checked:bg-[#D4A853] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
        </label>
        <span className="text-sm text-[#9ca3af]">Contains spoilers</span>
      </div>

      {/* ─── Moderation warnings ─── */}
      {moderationWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {moderationWarnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-yellow-300/80">{warning}</p>
                <p className="text-[10px] text-yellow-300/50 mt-1">Your review will be submitted but may be held for manual review.</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {moderationBlocked && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-red-300">{moderationBlocked}</p>
            <p className="text-[10px] text-red-300/50 mt-1">Please revise your review to comply with community guidelines.</p>
          </div>
        </div>
      )}
      {submitError && (
        <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-xs text-red-300">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={!isValid || submitting}
          className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
          {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Review'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] gap-2"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
