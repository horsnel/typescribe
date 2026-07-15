'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Sparkles, Film, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveImageUrl, handleImageError } from '@/lib/utils';

/**
 * RecommendedForYou — dashboard widget that drives /api/vibe-search from
 * the user's /api/taste-dna affinities.
 *
 * Pipeline (all API-driven, zero mock data):
 *   1. GET /api/taste-dna → fetch the user's top-2 genres by enthusiasm
 *   2. GET /api/vibe-search?q="top <genre1> <genre2> movies" → pgvector results
 *   3. Render up to 6 cards
 *
 * Handles: loading, needs_more (user has <5 ratings), error, empty results.
 * The vibe-search call degrades gracefully to fuzzy text search if the
 * Gemini embedding key isn't configured.
 */

interface GenreAffinity {
  genre: string;
  count: number;
  avgRating: number;
  enthusiasm: number;
}

interface TasteDnaResponse {
  needs_more?: true;
  message?: string;
  genreAffinity?: GenreAffinity[];
  totalRated?: number;
}

interface VibeResult {
  movie_id: number;
  movie_title: string;
  poster_path: string | null;
  overview: string | null;
  genres: string[] | null;
  release_date: string | null;
  similarity?: number;
}

function makeSlug(title: string, id: number): string {
  const namePart = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return namePart ? `${namePart}-${id}` : `${id}`;
}

export default function RecommendedForYou() {
  const [recs, setRecs] = useState<VibeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsMore, setNeedsMore] = useState(false);
  const [error, setError] = useState('');
  const [queryUsed, setQueryUsed] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount (React docs: legitimate)
    setLoading(true);
    setError('');
    setNeedsMore(false);

    (async () => {
      // ── Step 1: fetch the user's taste DNA ──
      let topGenres: string[] = [];
      try {
        const r = await fetch('/api/taste-dna', { cache: 'no-store' });
        if (!r.ok) throw new Error(`taste-dna HTTP ${r.status}`);
        const dna: TasteDnaResponse = await r.json();
        if (dna.needs_more) {
          if (!cancelled) setNeedsMore(true);
          return;
        }
        topGenres = (dna.genreAffinity ?? [])
          .filter((g) => g.enthusiasm > 40)
          .slice(0, 2)
          .map((g) => g.genre);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load taste DNA');
        return;
      }

      if (topGenres.length === 0) {
        // User has taste DNA but no strong affinities — fall back to a
        // broad recommendation query (still API-driven, no mock data).
        topGenres = ['drama'];
      }

      // ── Step 2: build a vibe-search query from the top genres ──
      const query = topGenres.length === 1
        ? `top ${topGenres[0]} movies`
        : `top ${topGenres[0]} and ${topGenres[1]} movies`;
      if (!cancelled) setQueryUsed(query);

      try {
        const r = await fetch(`/api/vibe-search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`vibe-search HTTP ${r.status}`);
        const data = await r.json();
        const results: VibeResult[] = data.results ?? [];
        if (!cancelled) setRecs(results.slice(0, 6));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load recommendations');
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">Recommended For You</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" strokeWidth={1.5} />
          <span className="ml-2 text-sm text-[#9ca3af]">Finding movies you&apos;ll love…</span>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">Recommended For You</h2>
        </div>
        <p className="text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  // ─── Needs-more state: user hasn't rated enough to compute taste DNA ───
  if (needsMore) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">Recommended For You</h2>
        </div>
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#9ca3af] mb-1">Personalized recommendations</p>
          <p className="text-sm text-[#6b7280] mb-4">
            Rate at least 5 movies to unlock recommendations tuned to your taste.
          </p>
          <Link href="/browse">
            <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white">Browse Movies</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Empty state: vibe-search returned nothing ───
  if (recs.length === 0) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">Recommended For You</h2>
        </div>
        <div className="text-center py-6">
          <Film className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#9ca3af]">No recommendations matched your taste profile.</p>
          <Link href="/browse" className="inline-block mt-4">
            <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white">Browse All Movies</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Loaded state ───
  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Heart className="w-5 h-5 text-[#D4A853] flex-shrink-0" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white truncate">Recommended For You</h2>
        </div>
        <Link
          href="/vibe"
          className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#D4A853] transition-colors flex-shrink-0"
        >
          Vibe Search
          <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>
      </div>

      {queryUsed && (
        <p className="text-xs text-[#6b7280] mb-4">
          Based on your taste: <span className="text-[#9ca3af]">&ldquo;{queryUsed}&rdquo;</span>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {recs.map((rec) => {
          const year = rec.release_date ? rec.release_date.split('-')[0] : '';
          const slug = makeSlug(rec.movie_title, rec.movie_id);
          const poster = resolveImageUrl(rec.poster_path, 'w342');
          return (
            <Link
              key={rec.movie_id}
              href={`/movie/${slug}`}
              className="group flex flex-col"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#050507] border border-[#1e1e28] group-hover:border-[#D4A853]/40 transition-colors">
                <img
                  src={poster}
                  alt={rec.movie_title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => handleImageError(e, 'poster')}
                />
                {/* Similarity badge if available */}
                {typeof rec.similarity === 'number' && rec.similarity > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-[9px] font-medium text-[#D4A853] px-1.5 py-0.5 rounded">
                    {Math.round(rec.similarity * 100)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-white mt-2 line-clamp-2 leading-tight group-hover:text-[#D4A853] transition-colors">
                {rec.movie_title}
              </p>
              {year && <p className="text-[10px] text-[#6b7280] mt-0.5">{year}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
