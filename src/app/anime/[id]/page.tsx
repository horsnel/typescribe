'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Play, Star, Calendar, Clock, Film, Tv, Users, Heart,
  Share2, ChevronDown, ChevronRight, ExternalLink, Sparkles,
  Globe, Loader2,
} from 'lucide-react';
import type { JikanAnimeResult, JikanCharacterResult, JikanRecommendation } from '@/lib/pipeline/clients/jikan';
import EpisodeRatings from '@/components/anime/EpisodeRatings';

// ─── Types ───

interface AnimeData {
  anime: JikanAnimeResult;
  characters: JikanCharacterResult[];
}

// ─── Component ───

export default function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  // ─── State ───
  const [data, setData] = useState<AnimeData | null>(null);
  const [recommendations, setRecommendations] = useState<JikanRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [recLoading, setRecLoading] = useState(true);

  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ─── Scroll to top on mount ───
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // ─── Fetch anime data ───
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/anime/${id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Anime not found');
          throw new Error('Failed to fetch anime data');
        }
        return res.json();
      })
      .then((result: AnimeData) => {
        setData(result);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Fetch recommendations ───
  useEffect(() => {
    if (!id) return;
    setRecLoading(true);

    fetch(`/api/anime/${id}/recommendations`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result?.recommendations) {
          setRecommendations(result.recommendations);
        }
      })
      .catch(() => {
        // Silently fail for recommendations
      })
      .finally(() => setRecLoading(false));
  }, [id]);

  // ─── GSAP entrance animations ───
  useEffect(() => {
    if (!data) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-animate',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 },
      );
      gsap.fromTo(
        '.content-animate',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.5 },
      );
    }, heroRef);
    return () => ctx.revert();
  }, [data]);

  // ─── Share handler ───
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback — do nothing
    }
  }, []);

  // ─── Format helpers ───
  const formatNumber = (n: number | null): string => {
    if (n === null) return 'N/A';
    return new Intl.NumberFormat('en-US').format(n);
  };

  const capitalizeFirst = (s: string | null): string => {
    if (!s) return 'N/A';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4a853] mx-auto mb-4" />
          <p className="text-[#9ca3af]">Loading anime data…</p>
        </div>
      </div>
    );
  }

  // ─── Error / 404 state ───
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {error === 'Anime not found' ? 'Anime Not Found' : 'Something Went Wrong'}
          </h1>
          <p className="text-[#9ca3af] mb-6">
            {error || 'The anime you are looking for does not exist.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#d4a853] hover:bg-[#b8922e] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <ChevronRight className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { anime, characters } = data;

  // ─── Derived data ───
  const seasonYear = anime.season && anime.year
    ? `${capitalizeFirst(anime.season)} ${anime.year}`
    : anime.year
      ? String(anime.year)
      : 'TBA';

  const isSynopsisLong = (anime.synopsis?.length ?? 0) > 300;
  const displaySynopsis = isSynopsisLong && !synopsisExpanded
    ? anime.synopsis!.slice(0, 300) + '…'
    : anime.synopsis;

  const mainCharacters = characters.filter((c) => c.role === 'Main');
  const supportingCharacters = characters.filter((c) => c.role !== 'Main').slice(0, 12);

  // ─── Type badge color mapping ───
  const typeColorMap: Record<string, string> = {
    TV: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Movie: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    OVA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ONA: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    Special: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Music: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  const typeBadgeClass = typeColorMap[anime.type ?? ''] ?? 'bg-[#d4a853]/20 text-[#d4a853] border-[#d4a853]/30';

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* ═══ Hero Section ═══ */}
      <div ref={heroRef} className="relative h-[60vh] min-h-[480px]">
        {/* Backdrop */}
        <div className="absolute inset-0">
          {anime.imageUrl && (
            <img
              src={anime.imageUrl}
              alt={anime.title}
              className="w-full h-full object-cover opacity-20 blur-sm scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-[#0a0a0f]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full flex items-end pb-10 lg:pb-14">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-end w-full">
            {/* Cover Image */}
            {anime.imageUrl && (
              <div className="hero-animate flex-shrink-0 w-[200px] rounded-xl overflow-hidden shadow-2xl border border-[#1e1e28]/50 hidden md:block">
                <img
                  src={anime.imageUrl}
                  alt={anime.title}
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1 className="hero-animate text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-1 leading-tight">
                {anime.titleEnglish || anime.title}
              </h1>

              {/* Japanese title */}
              {(anime.titleJapanese || (anime.titleRomaji && anime.titleRomaji !== anime.title)) && (
                <p className="hero-animate text-sm text-[#6b7280] mb-3">
                  {anime.titleJapanese || anime.titleRomaji}
                </p>
              )}

              {/* Meta Row */}
              <div className="hero-animate flex items-center gap-3 mb-5 flex-wrap">
                {/* Type Badge */}
                {anime.type && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${typeBadgeClass}`}>
                    {anime.type}
                  </span>
                )}

                {/* Score Badge */}
                {anime.score !== null && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#d4a853]/15 text-[#d4a853] px-3 py-1 rounded-full border border-[#d4a853]/25">
                    <Star className="w-3.5 h-3.5 fill-[#d4a853]" />
                    {anime.score.toFixed(1)}
                  </span>
                )}

                {/* Episodes */}
                {anime.episodes !== null && (
                  <span className="text-sm text-[#9ca3af] flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" />
                    {anime.episodes} Episode{anime.episodes !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Separator */}
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />

                {/* Status */}
                <span className="text-sm text-[#9ca3af] flex items-center gap-1">
                  {anime.airing ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-pulse" />
                      Airing
                    </>
                  ) : (
                    capitalizeFirst(anime.status)
                  )}
                </span>

                {/* Separator */}
                <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />

                {/* Season/Year */}
                <span className="text-sm text-[#9ca3af] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {seasonYear}
                </span>
              </div>

              {/* Studio & Producers */}
              <div className="hero-animate flex items-center gap-2 mb-4 flex-wrap">
                {anime.studios.length > 0 && (
                  <span className="text-sm text-[#9ca3af] flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5" />
                    {anime.studios.join(', ')}
                  </span>
                )}
                {anime.producers.length > 0 && anime.studios.length > 0 && (
                  <span className="w-1 h-1 rounded-full bg-[#6b6b7b]" />
                )}
                {anime.producers.length > 0 && (
                  <span className="text-xs text-[#6b7280]">
                    {anime.producers.slice(0, 3).join(', ')}
                    {anime.producers.length > 3 && ` +${anime.producers.length - 3}`}
                  </span>
                )}
              </div>

              {/* Genre Tags */}
              <div className="hero-animate flex gap-2 flex-wrap mb-5">
                {anime.genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs font-medium text-[#9ca3af] bg-[#0c0c10] border border-[#1e1e28] px-2.5 py-1 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
                {anime.themes.map((theme) => (
                  <span
                    key={theme}
                    className="text-xs font-medium text-[#d4a853] bg-[#d4a853]/10 border border-[#d4a853]/20 px-2.5 py-1 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="hero-animate flex items-center gap-3 flex-wrap">
                {anime.trailerYoutubeId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${anime.trailerYoutubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#d4a853] hover:bg-[#b8922e] text-white transition-colors"
                  >
                    <Play className="w-4 h-4 fill-white" /> Watch Trailer
                  </a>
                )}

                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#111118] border border-[#1e1e28] text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <a
                  href={anime.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#111118] border border-[#1e1e28] text-white hover:bg-[#2a2a35] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> MAL Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-14">
          {/* ─── Left Column ─── */}
          <div className="space-y-10 min-w-0">
            {/* Synopsis */}
            <section className="content-animate">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#d4a853]" />
                <h2 className="text-xl font-bold text-white">Synopsis</h2>
              </div>
              <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                {anime.synopsis ? (
                  <>
                    <p className="text-[#9ca3af] leading-relaxed text-[15px]">{displaySynopsis}</p>
                    {isSynopsisLong && (
                      <button
                        onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                        className="inline-flex items-center gap-1 text-[#d4a853] hover:underline mt-3 text-sm font-medium"
                      >
                        {synopsisExpanded ? 'Show Less' : 'Read More'}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${synopsisExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-[#6b7280] italic">No synopsis available.</p>
                )}
              </div>
            </section>

            {/* Background */}
            {anime.background && (
              <section className="content-animate">
                <h2 className="text-xl font-bold text-white mb-4">Background</h2>
                <p className="text-[#9ca3af] leading-relaxed text-[15px] bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                  {anime.background}
                </p>
              </section>
            )}

            {/* Characters */}
            <section className="content-animate">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#d4a853]" />
                <h2 className="text-xl font-bold text-white">Characters & Voice Actors</h2>
              </div>

              {characters.length === 0 ? (
                <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-8 text-center">
                  <Users className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                  <p className="text-[#9ca3af]">No character data available</p>
                </div>
              ) : (
                <>
                  {/* Main Characters */}
                  {mainCharacters.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                        Main Characters
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mainCharacters.map((char) => (
                          <CharacterCard key={char.malId} character={char} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supporting Characters */}
                  {supportingCharacters.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                        Supporting Characters
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {supportingCharacters.map((char) => (
                          <CharacterCard key={char.malId} character={char} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Episode Ratings */}
            {anime.episodes !== null && anime.episodes > 0 && (
              <section className="content-animate">
                <EpisodeRatings
                  animeId={anime.malId}
                  episodeCount={anime.episodes}
                  title={anime.titleEnglish || anime.title}
                />
              </section>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <section className="content-animate">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-[#d4a853]" />
                  <h2 className="text-xl font-bold text-white">Recommendations</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {recommendations.slice(0, 10).map((rec) => (
                    <Link
                      key={rec.malId}
                      href={`/anime/${rec.malId}`}
                      className="group flex flex-col rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28] hover:border-[#d4a853]/40 transition-all hover:shadow-lg hover:shadow-[#d4a853]/5"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {rec.imageUrl ? (
                          <img
                            src={rec.imageUrl}
                            alt={rec.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#111118] flex items-center justify-center">
                            <Film className="w-8 h-8 text-[#2a2a35]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#d4a853] transition-colors">
                          {rec.title}
                        </h4>
                        {rec.recommendationCount > 0 && (
                          <p className="text-[10px] text-[#6b7280] mt-1">
                            {rec.recommendationCount} recommendation{rec.recommendationCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── Right Sidebar ─── */}
          <aside className="space-y-6">
            {/* Anime Details Card */}
            <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4a853]" />
                Anime Details
              </h3>

              <div className="space-y-4">
                {/* Episodes */}
                {anime.episodes !== null && (
                  <DetailRow icon={<Film className="w-4 h-4" />} label="Episodes" value={String(anime.episodes)} />
                )}

                {/* Duration */}
                {anime.duration && (
                  <DetailRow icon={<Clock className="w-4 h-4" />} label="Duration" value={anime.duration} />
                )}

                {/* Status */}
                <DetailRow
                  icon={<Tv className="w-4 h-4" />}
                  label="Status"
                  value={capitalizeFirst(anime.status)}
                />

                {/* Source */}
                {anime.source && (
                  <DetailRow icon={<Globe className="w-4 h-4" />} label="Source" value={anime.source} />
                )}

                {/* Rating */}
                {anime.rating && (
                  <DetailRow icon={<Star className="w-4 h-4" />} label="Rating" value={anime.rating} />
                )}

                {/* Broadcast */}
                {anime.broadcast && (
                  <DetailRow icon={<Calendar className="w-4 h-4" />} label="Broadcast" value={anime.broadcast} />
                )}

                {/* Season */}
                {anime.season && (
                  <DetailRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Season"
                    value={`${capitalizeFirst(anime.season)} ${anime.year ?? ''}`}
                  />
                )}

                <div className="border-t border-[#1e1e28] pt-4 mt-4" />

                {/* Rank */}
                {anime.rank !== null && (
                  <DetailRow icon={<ChevronRight className="w-4 h-4" />} label="Rank" value={formatNumber(anime.rank)} />
                )}

                {/* Popularity */}
                {anime.popularity !== null && (
                  <DetailRow icon={<Users className="w-4 h-4" />} label="Popularity" value={formatNumber(anime.popularity)} />
                )}

                {/* Members */}
                {anime.members !== null && (
                  <DetailRow icon={<Users className="w-4 h-4" />} label="Members" value={formatNumber(anime.members)} />
                )}

                {/* Favorites */}
                {anime.favorites !== null && (
                  <DetailRow icon={<Heart className="w-4 h-4" />} label="Favorites" value={formatNumber(anime.favorites)} />
                )}

                {/* Scored By */}
                {anime.scoredBy !== null && (
                  <DetailRow icon={<Star className="w-4 h-4" />} label="Scored By" value={formatNumber(anime.scoredBy)} />
                )}
              </div>
            </div>

            {/* External Links Card */}
            <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-[#d4a853]" />
                External Links
              </h3>
              <div className="space-y-2">
                <a
                  href={anime.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-[#9ca3af] hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-[#111118]"
                >
                  <Globe className="w-4 h-4 text-[#d4a853]" />
                  MyAnimeList Page
                  <ExternalLink className="w-3 h-3 ml-auto text-[#6b7280]" />
                </a>
                {anime.trailerYoutubeId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${anime.trailerYoutubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-[#9ca3af] hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-[#111118]"
                  >
                    <Play className="w-4 h-4 text-[#d4a853]" />
                    YouTube Trailer
                    <ExternalLink className="w-3 h-3 ml-auto text-[#6b7280]" />
                  </a>
                )}
              </div>
            </div>

            {/* Studios & Producers Card */}
            {(anime.studios.length > 0 || anime.producers.length > 0) && (
              <div className="content-animate bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#d4a853]" />
                  Studios & Producers
                </h3>
                <div className="space-y-3">
                  {anime.studios.length > 0 && (
                    <div>
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">Studios</p>
                      <div className="flex flex-wrap gap-2">
                        {anime.studios.map((studio) => (
                          <span
                            key={studio}
                            className="text-xs font-medium text-[#9ca3af] bg-[#111118] border border-[#1e1e28] px-3 py-1.5 rounded-lg"
                          >
                            {studio}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {anime.producers.length > 0 && (
                    <div>
                      <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">Producers</p>
                      <div className="flex flex-wrap gap-2">
                        {anime.producers.map((producer) => (
                          <span
                            key={producer}
                            className="text-xs font-medium text-[#6b7280] bg-[#111118] border border-[#1e1e28] px-2.5 py-1 rounded-lg"
                          >
                            {producer}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ───

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-[#6b7280]">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function CharacterCard({ character }: { character: JikanCharacterResult }) {
  const primaryVA = character.voiceActors.find((va) => va.language === 'Japanese')
    ?? character.voiceActors[0];

  return (
    <div className="flex items-center gap-3 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-3 hover:border-[#1e1e28]/80 transition-colors group">
      {/* Character Image */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#111118] border border-[#1e1e28]/50">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="w-5 h-5 text-[#2a2a35]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate group-hover:text-[#d4a853] transition-colors">
          {character.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            character.role === 'Main'
              ? 'bg-[#d4a853]/10 text-[#d4a853]'
              : 'bg-[#2a2a35]/50 text-[#6b7280]'
          }`}>
            {character.role}
          </span>
          {primaryVA && (
            <span className="text-[10px] text-[#6b7280] truncate">
              {primaryVA.name}
            </span>
          )}
        </div>
      </div>

      {/* VA Image */}
      {primaryVA?.imageUrl && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#111118] border border-[#1e1e28]/50">
          <img
            src={primaryVA.imageUrl}
            alt={primaryVA.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
