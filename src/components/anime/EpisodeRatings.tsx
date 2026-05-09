'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star, TrendingUp, TrendingDown, BarChart3,
  ChevronDown, ChevronUp, Award, AlertCircle, Zap,
} from 'lucide-react';

// ─── Types ───

interface EpisodeRatingsProps {
  animeId: number;
  episodeCount: number;
  title: string;
}

type EpisodeRatingsMap = Record<number, number>; // episodeNumber → rating (1-10)

// ─── Helpers ───

function getStorageKey(animeId: number): string {
  return `typescribe_episode_ratings_${animeId}`;
}

function loadRatings(animeId: number): EpisodeRatingsMap {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(getStorageKey(animeId));
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveRatings(animeId: number, ratings: EpisodeRatingsMap): void {
  try {
    localStorage.setItem(getStorageKey(animeId), JSON.stringify(ratings));
  } catch { /* ignore */ }
}

function getRatingColor(rating: number): string {
  if (rating >= 8) return 'text-[#22c55e]';
  if (rating >= 6) return 'text-[#D4A853]';
  if (rating >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function getBarColor(rating: number): string {
  if (rating >= 8) return 'bg-[#22c55e]';
  if (rating >= 6) return 'bg-[#D4A853]';
  if (rating >= 4) return 'bg-orange-400';
  return 'bg-red-400';
}

function getBarBg(rating: number): string {
  if (rating >= 8) return 'bg-[#22c55e]/20';
  if (rating >= 6) return 'bg-[#D4A853]/20';
  if (rating >= 4) return 'bg-orange-400/20';
  return 'bg-red-400/20';
}

// ─── Component ───

export default function EpisodeRatings({ animeId, episodeCount, title }: EpisodeRatingsProps) {
  const [ratings, setRatings] = useState<EpisodeRatingsMap>({});
  const [hoverRating, setHoverRating] = useState<{ ep: number; val: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  useEffect(() => {
    setRatings(loadRatings(animeId));
  }, [animeId]);

  const handleRate = useCallback((episode: number, rating: number) => {
    setRatings(prev => {
      const updated = { ...prev };
      if (updated[episode] === rating) {
        // Clicking same rating removes it
        delete updated[episode];
      } else {
        updated[episode] = rating;
      }
      saveRatings(animeId, updated);
      return updated;
    });
  }, [animeId]);

  // ─── Computed stats ───
  const ratedEpisodes = useMemo(() => {
    return Object.entries(ratings)
      .map(([ep, rating]) => ({ episode: Number(ep), rating }))
      .sort((a, b) => a.episode - b.episode);
  }, [ratings]);

  const totalRated = ratedEpisodes.length;

  const stats = useMemo(() => {
    if (totalRated === 0) return null;
    const allRatings = ratedEpisodes.map(r => r.rating);
    const avg = allRatings.reduce((s, r) => s + r, 0) / totalRated;
    const best = ratedEpisodes.reduce((a, b) => a.rating > b.rating ? a : b);
    const worst = ratedEpisodes.reduce((a, b) => a.rating < b.rating ? a : b);
    return { avg, best, worst };
  }, [ratedEpisodes, totalRated]);

  // ─── "When does it get good?" analysis ───
  const turningPoint = useMemo(() => {
    if (totalRated < 3) return null;

    // Find the biggest positive jump between consecutive episodes
    let maxJump = 0;
    let jumpEp = 0;

    for (let i = 1; i < ratedEpisodes.length; i++) {
      const diff = ratedEpisodes[i].rating - ratedEpisodes[i - 1].rating;
      if (diff > maxJump) {
        maxJump = diff;
        jumpEp = ratedEpisodes[i].episode;
      }
    }

    // Only consider it a turning point if jump >= 2
    if (maxJump >= 2) {
      return { episode: jumpEp, jump: maxJump };
    }

    return null;
  }, [ratedEpisodes, totalRated]);

  // ─── Episode range to display ───
  const displayCount = showAllEpisodes ? episodeCount : Math.min(episodeCount, 24);
  const episodeNumbers = Array.from({ length: displayCount }, (_, i) => i + 1);

  return (
    <section className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#111118] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-white">Episode Ratings</h2>
          {totalRated > 0 && (
            <span className="text-xs font-medium bg-[#D4A853]/15 text-[#D4A853] px-2.5 py-0.5 rounded-full border border-[#D4A853]/25">
              {totalRated} rated
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-[#6b7280]" strokeWidth={1.5} />
          : <ChevronDown className="w-5 h-5 text-[#6b7280]" strokeWidth={1.5} />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-6">
          {/* ─── When does it get good? Graph ─── */}
          {totalRated >= 2 && (
            <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                <h3 className="text-sm font-bold text-white">When Does It Get Good?</h3>
              </div>

              {/* Simple bar chart visualization */}
              <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-[10px] text-[#6b7280]">
                  <span>10</span>
                  <span>5</span>
                  <span>0</span>
                </div>

                {/* Chart area */}
                <div className="ml-8">
                  <div className="flex items-end gap-[2px] h-28 border-b border-l border-[#1e1e28]/50">
                    {ratedEpisodes.map(({ episode, rating }) => {
                      const isTurningPoint = turningPoint?.episode === episode;
                      const heightPercent = (rating / 10) * 100;
                      return (
                        <div
                          key={episode}
                          className="flex-1 relative group"
                          style={{ minWidth: '4px', maxWidth: '20px' }}
                        >
                          <div
                            className={`w-full rounded-t-sm transition-all ${
                              isTurningPoint ? 'bg-[#D4A853] ring-1 ring-[#D4A853]/50' : getBarColor(rating)
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-[#111118] border border-[#1e1e28] rounded px-2 py-1 text-[10px] whitespace-nowrap">
                              <span className="text-white">Ep {episode}</span>
                              <span className={`ml-1 font-bold ${getRatingColor(rating)}`}>{rating}/10</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels (show every 5th or based on count) */}
                  <div className="flex gap-[2px] mt-1">
                    {ratedEpisodes.map(({ episode }, idx) => {
                      const showLabel = ratedEpisodes.length <= 20 ||
                        idx === 0 ||
                        idx === ratedEpisodes.length - 1 ||
                        (episode % 5 === 0);
                      return (
                        <div key={episode} className="flex-1 text-center" style={{ minWidth: '4px', maxWidth: '20px' }}>
                          {showLabel && (
                            <span className="text-[9px] text-[#6b7280]">{episode}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Turning Point Callout */}
              {turningPoint && (
                <div className="mt-3 flex items-center gap-2 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-lg px-3 py-2">
                  <TrendingUp className="w-4 h-4 text-[#D4A853] flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-[#D4A853]">
                    <span className="font-bold">Turning point:</span> Episode {turningPoint.episode}
                    <span className="text-[#9ca3af]"> (+{turningPoint.jump} rating jump)</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── Summary Stats ─── */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-3 text-center">
                <Award className="w-4 h-4 text-[#22c55e] mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-lg font-bold text-[#22c55e]">{stats.best.rating}/10</p>
                <p className="text-[10px] text-[#6b7280]">Best (Ep {stats.best.episode})</p>
              </div>
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-3 text-center">
                <BarChart3 className="w-4 h-4 text-[#D4A853] mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-lg font-bold text-[#D4A853]">{stats.avg.toFixed(1)}/10</p>
                <p className="text-[10px] text-[#6b7280]">Average</p>
              </div>
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-3 text-center">
                <TrendingDown className="w-4 h-4 text-[#D4A853] mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-lg font-bold text-[#D4A853]">{stats.worst.rating}/10</p>
                <p className="text-[10px] text-[#6b7280]">Worst (Ep {stats.worst.episode})</p>
              </div>
            </div>
          )}

          {/* ─── Episode List with Ratings ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Rate Episodes</h3>
              {totalRated > 0 && (
                <button
                  onClick={() => {
                    setRatings({});
                    saveRatings(animeId, {});
                  }}
                  className="text-[10px] text-[#6b7280] hover:text-[#D4A853] transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {episodeNumbers.map((ep) => {
                const currentRating = ratings[ep] || 0;
                const isHovered = hoverRating?.ep === ep;
                const displayRating = isHovered ? hoverRating.val : currentRating;

                return (
                  <div
                    key={ep}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[#111118] transition-colors group"
                  >
                    {/* Episode number */}
                    <span className="text-xs font-medium text-[#6b7280] w-8 text-right flex-shrink-0">
                      {ep}
                    </span>

                    {/* Mini bar indicator */}
                    <div className="w-12 h-1.5 rounded-full bg-[#2a2a35] flex-shrink-0 overflow-hidden">
                      {currentRating > 0 && (
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(currentRating)}`}
                          style={{ width: `${(currentRating / 10) * 100}%` }}
                        />
                      )}
                    </div>

                    {/* Star Rating (1-10) */}
                    <div className="flex items-center gap-0.5 flex-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(ep, star)}
                          onMouseEnter={() => setHoverRating({ ep, val: star })}
                          onMouseLeave={() => setHoverRating(null)}
                          className="transition-transform hover:scale-125 flex-shrink-0"
                          type="button"
                          aria-label={`Rate episode ${ep} ${star} out of 10`}
                        >
                          <Star
                            className={`w-3 h-3 ${
                              star <= displayRating
                                ? 'text-[#D4A853] fill-[#D4A853]'
                                : 'text-[#2a2a35]'
                            }`}
                          strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>

                    {/* Rating display */}
                    {currentRating > 0 && (
                      <span className={`text-xs font-bold w-6 text-right flex-shrink-0 ${getRatingColor(currentRating)}`}>
                        {currentRating}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show More / Less */}
            {episodeCount > 24 && (
              <button
                onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                className="mt-2 w-full py-2 text-xs text-[#D4A853] hover:text-[#D4A853]/80 transition-colors flex items-center justify-center gap-1"
              >
                {showAllEpisodes
                  ? <>Show Less <ChevronUp className="w-3 h-3" strokeWidth={1.5} /></>
                  : <>Show All {episodeCount} Episodes <ChevronDown className="w-3 h-3" strokeWidth={1.5} /></>
                }
              </button>
            )}
          </div>

          {/* Empty state */}
          {totalRated === 0 && (
            <div className="flex flex-col items-center py-4 text-center">
              <AlertCircle className="w-8 h-8 text-[#2a2a35] mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#6b7280]">No episodes rated yet</p>
              <p className="text-xs text-[#2a2a35]">Click the stars above to rate each episode</p>
            </div>
          )}
        </div>
      )}

      {/* Custom scrollbar */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3a3a45; }
      `}</style>
    </section>
  );
}
