'use client';
import { useState, useEffect, useRef } from 'react';
import { Calendar, Send, X, Search, Film, Loader2, Star, MapPin, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PickedMovie {
  id: number;
  title: string;
  poster_path?: string | null;
  release_date?: string | null;
  slug?: string;
  genres?: Array<{ id: number; name: string }> | string[];
}

interface DiaryEntryFormProps {
  /** If provided, hides the movie picker (used on movie detail pages). */
  presetMovie?: PickedMovie;
  onSubmitted?: (entry: any) => void;
  onCancel?: () => void;
}

const MAX_NOTES = 5000;

export default function DiaryEntryForm({ presetMovie, onSubmitted, onCancel }: DiaryEntryFormProps) {
  const [movie, setMovie] = useState<PickedMovie | null>(presetMovie ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PickedMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [watchedOn, setWatchedOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rewatch, setRewatch] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ movie?: string; watchedOn?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const displayRating = hoverRating || rating;
  const isValid = !!movie && !!watchedOn;

  // Movie search (debounced)
  useEffect(() => {
    if (presetMovie) return;
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

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { movie?: string; watchedOn?: string } = {};
    if (!movie) newErrors.movie = 'Please pick a movie first';
    if (!watchedOn) newErrors.watchedOn = 'Please select the date you watched it';
    if (Number.isNaN(Date.parse(watchedOn))) newErrors.watchedOn = 'Invalid date';

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

      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie!.id,
          movie_title: movie!.title,
          poster_path: movie!.poster_path ?? null,
          watched_on: watchedOn,
          rating: rating > 0 ? rating : null,
          rewatch,
          location: location.trim() || null,
          notes: notes.trim() || null,
          genres: genres.length > 0 ? genres : null,
          release_year: Number.isFinite(release_year) ? release_year : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to log entry');
      // Reset
      setRating(0); setNotes(''); setLocation(''); setRewatch(false);
      setErrors({});
      setWatchedOn(new Date().toISOString().slice(0, 10));
      if (!presetMovie) setMovie(null);
      onSubmitted?.(data.entry);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to log entry');
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
        <Calendar className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-white">Log a Watch</h3>
      </div>

      {/* Movie picker */}
      {!presetMovie && (
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

      {/* Watched-on date + rewatch toggle */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-white mb-2 block">Watched On</label>
          <input
            type="date"
            value={watchedOn}
            onChange={(e) => { setWatchedOn(e.target.value); setErrors((prev) => ({ ...prev, watchedOn: undefined })); }}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-sm"
          />
          {errors.watchedOn && <p className="text-xs text-red-400 mt-1">{errors.watchedOn}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-white mb-2 block">Rewatch?</label>
          <button
            type="button"
            onClick={() => setRewatch(!rewatch)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm transition-colors ${
              rewatch
                ? 'bg-[#D4A853]/10 border-[#D4A853]/30 text-[#D4A853]'
                : 'bg-[#050507] border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
            }`}
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            {rewatch ? 'Yes, rewatch' : 'First watch'}
          </button>
        </div>
      </div>

      {/* Rating (optional for diary) */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">
          Rating <span className="text-[#6b7280] font-normal">(optional)</span>
        </label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i + 1}
              type="button"
              onClick={() => setRating(rating === i + 1 ? 0 : i + 1)}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 transition-colors ${i + 1 <= displayRating ? 'text-[#D4A853] fill-[#D4A853]' : 'text-[#2a2a35]'}`}
                strokeWidth={1.5}
              />
            </button>
          ))}
          {displayRating > 0 && <span className="ml-2 text-sm font-bold text-[#D4A853]">{displayRating}/10</span>}
        </div>
      </div>

      {/* Location (optional) */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">
          Where did you watch? <span className="text-[#6b7280] font-normal">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" strokeWidth={1.5} />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 200))}
            placeholder="e.g. Cinema, Netflix, Home..."
            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 pl-10 pr-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] text-sm"
          />
        </div>
      </div>

      {/* Notes (optional) */}
      <div className="mb-4">
        <label className="text-sm font-medium text-white mb-2 block">
          Notes <span className="text-[#6b7280] font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
          placeholder="Quick thoughts, who you watched with, memorable moments..."
          className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] resize-none text-sm"
          maxLength={MAX_NOTES}
        />
        <div className="flex items-center justify-end mt-1">
          <p className={`text-xs ${notes.length > MAX_NOTES * 0.9 ? 'text-red-400' : 'text-[#6b7280]'}`}>{notes.length}/{MAX_NOTES}</p>
        </div>
      </div>

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
          {submitting ? 'Logging...' : 'Log Entry'}
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
