'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Swords, Plus, ThumbsUp, ThumbsDown, Send, Loader2,
  ArrowLeft, MessageSquare, X, Shield,
} from 'lucide-react';
import { getMovieBySlug } from '@/lib/data';
import type { Movie } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { addDebateToCommunity, getCommunitiesForGenres } from '@/lib/community-storage';

// ─── Types ───
interface Argument {
  id: number;
  side: 'defending' | 'challenging';
  text: string;
  author: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  userVoted: 'up' | 'down' | null;
}

interface Debate {
  id: number;
  movieSlug: string;
  proposition: string;
  author: string;
  createdAt: string;
  arguments: Argument[];
}

interface DebatesData {
  debates: Debate[];
}

// Note: previously this file generated fake mock debates (FilmBuff42,
// CinemaLover, CriticalEye, etc.) when no real debates existed in
// localStorage. That code was removed because it produced misleading
// fake activity on every movie page. Debates now start empty — users
// see a "no debates yet" empty state until they create their own.

// ─── Time ago helper ───
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Main Component ───
export default function DebatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { user, isAuthenticated } = useAuth();

  const [movie, setMovie] = useState<Movie | undefined>(undefined);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [showNewDebateForm, setShowNewDebateForm] = useState(false);
  const [newProposition, setNewProposition] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Argument form state
  const [argFormDebateId, setArgFormDebateId] = useState<number | null>(null);
  const [argFormSide, setArgFormSide] = useState<'defending' | 'challenging'>('defending');
  const [argFormText, setArgFormText] = useState('');
  const [argSubmitting, setArgSubmitting] = useState(false);

  // Load movie data
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/movies/slug/${slug}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movie) {
          setMovie(data.movie);
        } else {
          setMovie(getMovieBySlug(slug));
        }
      })
      .catch(() => setMovie(getMovieBySlug(slug)));
  }, [slug]);

  // Load debates from localStorage (real user-created debates only — no mock fallback)
  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_debates');
      if (data) {
        const parsed: DebatesData = JSON.parse(data);
        const movieDebates = parsed.debates.filter(d => d.movieSlug === slug);
        setDebates(movieDebates);
      } else {
        // No debates yet — start empty. Users see the empty state and can
        // create their own.
        setDebates([]);
      }
    } catch {
      setDebates([]);
    }
  }, [slug, movie]);

  const saveDebates = (updated: Debate[]) => {
    setDebates(updated);
    try {
      const existing = localStorage.getItem('typescribe_debates');
      const allDebates: DebatesData = existing ? JSON.parse(existing) : { debates: [] };
      // Replace debates for this movie, keep others
      const otherDebates = allDebates.debates.filter(d => d.movieSlug !== slug);
      const newData: DebatesData = { debates: [...otherDebates, ...updated] };
      localStorage.setItem('typescribe_debates', JSON.stringify(newData));
    } catch { /* ignore */ }
  };

  const handleCreateDebate = () => {
    if (!newProposition.trim() || !user) return;
    setSubmitting(true);
    const debate: Debate = {
      id: Date.now(),
      movieSlug: slug,
      proposition: newProposition.trim(),
      author: user.display_name,
      createdAt: new Date().toISOString(),
      arguments: [],
    };
    saveDebates([debate, ...debates]);
    setNewProposition('');
    setShowNewDebateForm(false);
    setSubmitting(false);

    // Auto-link this debate to relevant communities based on movie genres
    if (movie?.genres) {
      const relevantCommunityIds = getCommunitiesForGenres(movie.genres);
      for (const communityId of relevantCommunityIds) {
        addDebateToCommunity({
          communityId,
          movieSlug: slug,
          movieTitle: movieTitle,
          proposition: debate.proposition,
          author: user.display_name,
          defending: 0,
          challenging: 0,
          createdAt: debate.createdAt,
        });
      }
    }
  };

  const handleSubmitArgument = (debateId: number) => {
    if (!argFormText.trim() || !user) return;
    setArgSubmitting(true);
    const argument: Argument = {
      id: Date.now(),
      side: argFormSide,
      text: argFormText.trim(),
      author: user.display_name,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString(),
      userVoted: null,
    };
    const updated = debates.map(d => {
      if (d.id === debateId) {
        return { ...d, arguments: [...d.arguments, argument] };
      }
      return d;
    });
    saveDebates(updated);
    setArgFormText('');
    setArgFormDebateId(null);
    setArgSubmitting(false);
  };

  const handleVote = (debateId: number, argId: number, voteType: 'up' | 'down') => {
    const updated = debates.map(d => {
      if (d.id === debateId) {
        return {
          ...d,
          arguments: d.arguments.map(a => {
            if (a.id === argId) {
              // If already voted the same way, remove vote
              if (a.userVoted === voteType) {
                return {
                  ...a,
                  upvotes: voteType === 'up' ? a.upvotes - 1 : a.upvotes,
                  downvotes: voteType === 'down' ? a.downvotes - 1 : a.downvotes,
                  userVoted: null,
                };
              }
              // If voted opposite, switch vote
              if (a.userVoted !== null) {
                return {
                  ...a,
                  upvotes: voteType === 'up' ? a.upvotes + 1 : a.upvotes - 1,
                  downvotes: voteType === 'down' ? a.downvotes + 1 : a.downvotes - 1,
                  userVoted: voteType,
                };
              }
              // Fresh vote
              return {
                ...a,
                upvotes: voteType === 'up' ? a.upvotes + 1 : a.upvotes,
                downvotes: voteType === 'down' ? a.downvotes + 1 : a.downvotes,
                userVoted: voteType,
              };
            }
            return a;
          }),
        };
      }
      return d;
    });
    saveDebates(updated);
  };

  const movieTitle = movie?.title || slug.replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Header */}
      <div className="bg-[#0c0c10] border-b border-[#1e1e28]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-4 text-sm text-[#6b7280]">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            <Link href={`/movie/${slug}`} className="hover:text-white transition-colors">{movieTitle}</Link>
            <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            <span className="text-[#9ca3af]">Debates</span>
          </nav>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Change My View
                </h1>
                <p className="text-sm text-[#6b7280]">
                  Structured debates about {movieTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/movie/${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#111118] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#2a2a35] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Movie
              </Link>
              {isAuthenticated ? (
                <Button
                  onClick={() => setShowNewDebateForm(!showNewDebateForm)}
                  className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} /> Start a Debate
                </Button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D4A853] hover:bg-[#B8922F] text-white transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} /> Start a Debate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* New Debate Form */}
        {showNewDebateForm && (
          <div className="bg-[#0c0c10] border border-[#D4A853]/30 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Swords className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-white">Start a New Debate</h3>
            </div>
            <p className="text-sm text-[#6b7280] mb-4">
              Frame your debate as a proposition that people can either defend or challenge. Be specific and opinionated!
            </p>
            <textarea
              value={newProposition}
              onChange={(e) => setNewProposition(e.target.value)}
              placeholder="e.g., The ending was the perfect conclusion to the story"
              rows={3}
              className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-3 px-4 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] resize-none text-sm mb-4"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreateDebate}
                disabled={!newProposition.trim() || submitting}
                className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
                Create Debate
              </Button>
              <Button
                onClick={() => { setShowNewDebateForm(false); setNewProposition(''); }}
                variant="outline"
                className="border-[#1e1e28] text-[#9ca3af] hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Debates List */}
        {debates.length === 0 ? (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
            <Swords className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-bold text-white mb-2">No Debates Yet</h3>
            <p className="text-sm text-[#6b7280] mb-4">Be the first to start a debate about {movieTitle}!</p>
            {isAuthenticated && (
              <Button
                onClick={() => setShowNewDebateForm(true)}
                className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} /> Start a Debate
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {debates.map((debate) => {
              const defendingArgs = debate.arguments.filter(a => a.side === 'defending');
              const challengingArgs = debate.arguments.filter(a => a.side === 'challenging');
              const totalArgs = debate.arguments.length;

              return (
                <div key={debate.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
                  {/* Debate Header */}
                  <div className="p-5 border-b border-[#1e1e28]/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white leading-snug mb-1">
                          &ldquo;{debate.proposition}&rdquo;
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-[#6b7280]">
                          <span>Started by {debate.author}</span>
                          <span>·</span>
                          <span>{timeAgo(debate.createdAt)}</span>
                          <span>·</span>
                          <span>{totalArgs} argument{totalArgs !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-medium text-green-400">{defendingArgs.length} Defending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-medium text-red-400">{challengingArgs.length} Challenging</span>
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Debate Area */}
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Defending Column */}
                    <div className="p-5 border-r border-[#1e1e28]/50 border-b md:border-b-0">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Defending</h4>
                      </div>

                      {defendingArgs.length === 0 ? (
                        <p className="text-xs text-[#6b7280] italic mb-3">No arguments yet. Be the first to defend!</p>
                      ) : (
                        <div className="space-y-3 mb-3">
                          {defendingArgs.map((arg) => (
                            <div key={arg.id} className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-bold text-green-400">
                                  {arg.author.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-white">{arg.author}</span>
                                <span className="text-[10px] text-[#6b7280] ml-auto">{timeAgo(arg.createdAt)}</span>
                              </div>
                              <p className="text-sm text-[#9ca3af] leading-relaxed mb-2">{arg.text}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleVote(debate.id, arg.id, 'up')}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                    arg.userVoted === 'up'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'text-[#6b7280] hover:text-green-400 hover:bg-green-500/10'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" strokeWidth={1.5} /> {arg.upvotes}
                                </button>
                                <button
                                  onClick={() => handleVote(debate.id, arg.id, 'down')}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                    arg.userVoted === 'down'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'text-[#6b7280] hover:text-red-400 hover:bg-red-500/10'
                                  }`}
                                >
                                  <ThumbsDown className="w-3 h-3" strokeWidth={1.5} /> {arg.downvotes}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add argument (defending) */}
                      {isAuthenticated && argFormDebateId === debate.id && argFormSide === 'defending' ? (
                        <div className="bg-[#050507]/60 border border-green-500/20 rounded-lg p-3">
                          <textarea
                            value={argFormText}
                            onChange={(e) => setArgFormText(e.target.value)}
                            placeholder="Make your case for the defense..."
                            rows={3}
                            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-green-500 resize-none text-sm mb-2"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSubmitArgument(debate.id)}
                              disabled={!argFormText.trim() || argSubmitting}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs disabled:opacity-50"
                            >
                              {argSubmitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Send className="w-3 h-3" strokeWidth={1.5} />}
                              Submit
                            </Button>
                            <Button
                              onClick={() => { setArgFormDebateId(null); setArgFormText(''); }}
                              size="sm"
                              variant="ghost"
                              className="text-[#6b7280] hover:text-white text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : isAuthenticated ? (
                        <button
                          onClick={() => { setArgFormDebateId(debate.id); setArgFormSide('defending'); setArgFormText(''); }}
                          className="w-full text-xs text-green-400 hover:text-green-300 border border-dashed border-green-500/20 hover:border-green-500/40 rounded-lg py-2 transition-colors"
                        >
                          + Add defending argument
                        </button>
                      ) : null}
                    </div>

                    {/* Challenging Column */}
                    <div className="p-5 border-b md:border-b-0">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Challenging</h4>
                      </div>

                      {challengingArgs.length === 0 ? (
                        <p className="text-xs text-[#6b7280] italic mb-3">No arguments yet. Be the first to challenge!</p>
                      ) : (
                        <div className="space-y-3 mb-3">
                          {challengingArgs.map((arg) => (
                            <div key={arg.id} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                                  {arg.author.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold text-white">{arg.author}</span>
                                <span className="text-[10px] text-[#6b7280] ml-auto">{timeAgo(arg.createdAt)}</span>
                              </div>
                              <p className="text-sm text-[#9ca3af] leading-relaxed mb-2">{arg.text}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleVote(debate.id, arg.id, 'up')}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                    arg.userVoted === 'up'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'text-[#6b7280] hover:text-green-400 hover:bg-green-500/10'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" strokeWidth={1.5} /> {arg.upvotes}
                                </button>
                                <button
                                  onClick={() => handleVote(debate.id, arg.id, 'down')}
                                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                    arg.userVoted === 'down'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'text-[#6b7280] hover:text-red-400 hover:bg-red-500/10'
                                  }`}
                                >
                                  <ThumbsDown className="w-3 h-3" strokeWidth={1.5} /> {arg.downvotes}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add argument (challenging) */}
                      {isAuthenticated && argFormDebateId === debate.id && argFormSide === 'challenging' ? (
                        <div className="bg-[#050507]/60 border border-red-500/20 rounded-lg p-3">
                          <textarea
                            value={argFormText}
                            onChange={(e) => setArgFormText(e.target.value)}
                            placeholder="Make your case for the challenge..."
                            rows={3}
                            className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-red-500 resize-none text-sm mb-2"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSubmitArgument(debate.id)}
                              disabled={!argFormText.trim() || argSubmitting}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white gap-1 text-xs disabled:opacity-50"
                            >
                              {argSubmitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Send className="w-3 h-3" strokeWidth={1.5} />}
                              Submit
                            </Button>
                            <Button
                              onClick={() => { setArgFormDebateId(null); setArgFormText(''); }}
                              size="sm"
                              variant="ghost"
                              className="text-[#6b7280] hover:text-white text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : isAuthenticated ? (
                        <button
                          onClick={() => { setArgFormDebateId(debate.id); setArgFormSide('challenging'); setArgFormText(''); }}
                          className="w-full text-xs text-red-400 hover:text-red-300 border border-dashed border-red-500/20 hover:border-red-500/40 rounded-lg py-2 transition-colors"
                        >
                          + Add challenging argument
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
