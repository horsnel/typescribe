'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Star } from 'lucide-react';
import CinemaPlayer, { type CinemaMovieData } from '@/components/stream/CinemaPlayer';
import type { StreamableMovie } from '@/lib/streaming-pipeline/types';

export default function StreamWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [movie, setMovie] = useState<StreamableMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/streaming/detail?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        if (!data.movie) throw new Error('Movie not found');
        setMovie(data.movie);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const cinemaMovie: CinemaMovieData | null = movie ? {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    duration: movie.duration,
    genres: movie.genres,
    quality: movie.quality,
    poster: movie.poster,
    backdrop: movie.backdrop,
    description: movie.description,
    source: movie.source,
    videoUrl: movie.videoUrl,
    videoType: movie.videoType,
    embedUrl: movie.embedUrl,
    isEmbeddable: movie.isEmbeddable,
    sourceUrl: movie.sourceUrl,
    languages: movie.languages?.map(l => l.label) ?? [],
    subtitles: movie.subtitles?.map(s => s.label) ?? [],
    manifestUrl: movie.manifestUrl,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin mb-4" />
        <p className="text-[#9ca3af] text-sm">Loading player…</p>
      </div>
    );
  }

  if (error || !movie || !cinemaMovie) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center text-white px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Unable to load</h1>
        <p className="text-[#9ca3af] text-sm mb-6">{error ?? 'Movie not found in catalog.'}</p>
        <Link href="/stream" className="inline-flex items-center gap-2 text-[#D4A853] hover:text-[#B8922F]">
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>
      </div>
    );
  }

  const genres = Array.isArray(movie.genres) ? movie.genres : [];

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* ─── Full-bleed cinematic player (no card, no borders — edge to edge) ─── */}
      <div className="w-full bg-black">
        <CinemaPlayer movie={cinemaMovie} />
      </div>

      {/* ─── Spacious details below the player ─── */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <div className="grid md:grid-cols-[1fr_300px] gap-10 md:gap-14">
          {/* Main column */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{movie.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#9ca3af] mb-6">
              {movie.year > 0 && <span>{movie.year}</span>}
              {movie.duration && <span>{movie.duration}</span>}
              {movie.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#D4A853] text-[#D4A853]" />
                  <span className="text-[#D4A853] font-semibold">{movie.rating.toFixed(1)}</span>
                </span>
              )}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-white/20 text-white/70">
                {movie.quality}
              </span>
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {genres.slice(0, 6).map(g => (
                  <span key={g} className="text-xs px-3 py-1 bg-white/[0.04] text-[#c9c9d1] border border-white/10 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="text-[#b3b3b3] text-base md:text-lg leading-relaxed max-w-2xl">
              {movie.description}
            </p>
          </div>

          {/* Details column — internal metadata only, no outbound links */}
          <aside className="space-y-8">
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Details</h2>
              <dl className="space-y-3.5 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[#737373]">Quality</dt>
                  <dd className="font-medium text-right">{movie.quality}</dd>
                </div>
                {movie.duration && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#737373]">Runtime</dt>
                    <dd className="font-medium text-right">{movie.duration}</dd>
                  </div>
                )}
                {movie.languages?.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#737373]">Audio</dt>
                    <dd className="font-medium text-right">{movie.languages.length} {movie.languages.length === 1 ? 'language' : 'languages'}</dd>
                  </div>
                )}
                {movie.subtitles?.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#737373]">Subtitles</dt>
                    <dd className="font-medium text-right">{movie.subtitles.length} {movie.subtitles.length === 1 ? 'track' : 'tracks'}</dd>
                  </div>
                )}
                {genres.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[#737373]">Genres</dt>
                    <dd className="font-medium text-right">{genres.slice(0, 3).join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="pt-6 border-t border-white/[0.06]">
              <Link
                href="/stream"
                className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to catalog
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
