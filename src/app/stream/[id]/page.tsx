'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, Play, AlertCircle, Star } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link href="/stream" className="inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#D4A853] mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>

        <div className="rounded-2xl overflow-hidden border border-[#1e1e28] bg-black">
          <CinemaPlayer movie={cinemaMovie} />
        </div>

        {/* Movie info */}
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-start gap-4 mb-4">
              {movie.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={movie.poster} alt={movie.title} className="w-24 rounded-lg shadow-xl flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-1">{movie.title}</h1>
                <div className="flex items-center gap-3 text-sm text-[#9ca3af] mb-2">
                  {movie.year > 0 && <span>{movie.year}</span>}
                  {movie.duration && <span>· {movie.duration}</span>}
                  {movie.rating > 0 && (
                    <span className="flex items-center gap-1">
                      · <Star className="w-3.5 h-3.5 fill-[#D4A853] text-[#D4A853]" />
                      {movie.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.slice(0, 5).map(g => (
                    <span key={g} className="text-xs px-2 py-0.5 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[#9ca3af] text-sm leading-relaxed">{movie.description}</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#0c0c10] border border-[#1e1e28] rounded-lg">
              <div className="text-xs text-[#9ca3af] uppercase tracking-wide mb-3">Streaming Info</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#9ca3af]">Source</dt>
                  <dd className="font-medium capitalize">{movie.source.replace(/-/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#9ca3af]">Quality</dt>
                  <dd className="font-medium">{movie.quality}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#9ca3af]">License</dt>
                  <dd className="font-medium text-xs">{movie.sourceLicense}</dd>
                </div>
                {movie.languages?.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#9ca3af]">Audio</dt>
                    <dd className="font-medium text-xs text-right">{movie.languages.length} language(s)</dd>
                  </div>
                )}
              </dl>
              <a
                href={movie.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-lg text-xs font-medium hover:bg-[#D4A853]/20 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open on {movie.source.replace(/-/g, ' ')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
