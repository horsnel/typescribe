'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Globe, Subtitles, Clock, Calendar, Film, Tag, Volume2, Languages, Loader2, ExternalLink } from 'lucide-react';
import PremiumVideoPlayer from '@/components/stream/PremiumVideoPlayer';
import type { StreamableMovie } from '@/lib/streaming-pipeline/types';

/* ─── Player-compatible movie type ─── */

interface PlayerMovieData {
  id: string;
  title: string;
  year: number;
  rating: number;
  duration: string;
  genres: string[];
  quality: string;
  poster: string;
  backdrop: string;
  description: string;
  source: string;
  videoUrl: string;
  videoType?: 'direct' | 'youtube' | 'vimeo' | 'embed';
  sourceUrl?: string;
  languages: string[];
  subtitles: string[];
}

/* ─── Convert StreamableMovie to PlayerMovieData ─── */

function toPlayerMovie(m: StreamableMovie): PlayerMovieData {
  return {
    id: m.id,
    title: m.title,
    year: m.year,
    rating: m.rating,
    duration: m.duration,
    genres: m.genres,
    quality: m.quality,
    poster: m.poster,
    backdrop: m.backdrop,
    description: m.description,
    source: `${m.source.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · ${m.sourceLicense}`,
    videoUrl: m.videoUrl,
    videoType: m.videoType,
    sourceUrl: m.sourceUrl,
    languages: m.languages.map(l =>
      l.isOriginal ? `${l.label}` : l.label
    ),
    subtitles: m.subtitles.map(s => s.label),
  };
}

/* ─── Page Component ─── */

export default function StreamWatchPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const [movie, setMovie] = useState<StreamableMovie | null>(null);
  const [similar, setSimilar] = useState<StreamableMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovie() {
      try {
        const res = await fetch(`/api/streaming/detail?id=${encodeURIComponent(id)}&similar=true`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Movie not found');
          } else {
            throw new Error('Failed to fetch movie');
          }
          return;
        }
        const data = await res.json();
        setMovie(data.movie);
        setSimilar(data.similar || []);
      } catch (err: any) {
        console.error('Failed to load movie:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchMovie();
  }, [id]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#8B5CF6] animate-spin mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-white/60 text-sm">Loading movie...</p>
        </div>
      </div>
    );
  }

  // Error / Not Found
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-[#9ca3af] mb-6">{error || "The movie you're looking for doesn't exist."}</p>
          <Link href="/stream" className="text-[#8B5CF6] hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Streaming
          </Link>
        </div>
      </div>
    );
  }

  const playerMovie = toPlayerMovie(movie);

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Video Player - Full Width, positioned below fixed navbar */}
      <div className="w-full pt-16">
        <PremiumVideoPlayer movie={playerMovie} />
      </div>

      {/* Movie Info Section */}
      <div className="px-4 md:px-12 lg:px-20 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            href="/stream"
            className="inline-flex items-center gap-2 text-[#8B5CF6] hover:text-[#A78BFA] transition-colors mb-6 font-bold text-sm min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            <span>Back to Streaming</span>
          </Link>

          {/* Title & Metadata */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
            {/* Poster */}
            <div className="flex-shrink-0 w-32 md:w-44">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/poster-1.jpg';
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{movie.title}</h1>

              <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${movie.quality === '4K' ? 'bg-[#8B5CF6] text-white' : movie.quality === '1080p' ? 'bg-[#8B5CF6]/70 text-white' : 'bg-white/10 text-white/70'}`}>
                  {movie.quality}
                </span>
                {movie.year > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {movie.year}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {movie.duration}
                </div>
                {movie.rating > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                    <Star className="w-3.5 h-3.5 text-[#8B5CF6] fill-[#8B5CF6]" strokeWidth={1.5} />
                    {movie.rating}/10
                  </div>
                )}
              </div>

              {/* Genres */}
              {movie.genres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Tag className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={1.5} />
                  {movie.genres.map((g) => (
                    <span key={g} className="text-xs text-[#9ca3af] bg-[#0c0c10] border border-[#1e1e28] px-2.5 py-1 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <p className="text-[#9ca3af] text-sm md:text-base leading-relaxed mb-6">
                {movie.description}
              </p>

              {/* Source & License */}
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-[#0c0c10] border border-[#1e1e28] rounded-lg inline-block">
                  <p className="text-[10px] text-[#6b7280]">
                    <Film className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                    Source: {movie.source.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {movie.sourceLicense}
                  </p>
                </div>
                {movie.sourceUrl && (
                  <a
                    href={movie.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-[#8B5CF6]/60 hover:text-[#8B5CF6] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    View original source
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Languages & Subtitles */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Available Languages */}
            <div className="p-5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.5} />
                <h3 className="text-white font-semibold text-sm">Available Languages</h3>
                <span className="text-[10px] text-white/30">{movie.languages.length} tracks</span>
              </div>
              <div className="space-y-2">
                {movie.languages.map((lang) => (
                  <div key={`${lang.code}-${lang.isOriginal}-${lang.isDubbed}`} className="flex items-center justify-between py-2 px-3 bg-[#050507] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={1.5} />
                      <span className="text-sm text-[#f1f1f4]">{lang.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {lang.isOriginal && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded font-medium">Original</span>
                      )}
                      {lang.isDubbed && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded font-medium">Dubbed</span>
                      )}
                      {lang.audioFormat && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-white/30 rounded font-medium">{lang.audioFormat}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Subtitles */}
            <div className="p-5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Subtitles className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.5} />
                <h3 className="text-white font-semibold text-sm">Available Subtitles</h3>
                <span className="text-[10px] text-white/30">{movie.subtitles.length} languages</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {movie.subtitles.map((sub) => (
                  <span
                    key={sub.code}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors cursor-default ${
                      sub.isDefault
                        ? 'text-[#8B5CF6] bg-[#8B5CF6]/10 border border-[#8B5CF6]/30'
                        : 'text-[#9ca3af] bg-[#050507] border border-[#1e1e28] hover:border-[#8B5CF6]/30 hover:text-[#f1f1f4]'
                    }`}
                  >
                    {sub.label}
                    {sub.isDefault && <span className="ml-1 text-[8px]">DEFAULT</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* More Like This */}
          {similar.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.5} />
                <h3 className="text-white font-semibold">More Like This</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {similar.map((m) => (
                  <Link key={m.id} href={`/stream/${encodeURIComponent(m.id)}`} className="group/card">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
                      <img
                        src={m.poster}
                        alt={m.title}
                        className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-75"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/poster-1.jpg';
                        }}
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.quality === '4K' ? 'bg-[#8B5CF6] text-black' : 'bg-white/20 text-white/90 backdrop-blur-sm'}`}>
                          {m.quality}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-[#8B5CF6]/90 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-black fill-black ml-0.5" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                        </div>
                      </div>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-[#f1f1f4] truncate group-hover/card:text-[#8B5CF6] transition-colors">
                      {m.title}
                    </h4>
                    <p className="text-[11px] text-[#9ca3af]">
                      {m.year > 0 ? `${m.year} · ` : ''}{m.duration}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
