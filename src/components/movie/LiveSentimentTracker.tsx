'use client';
import { Activity, Users, TrendingUp, Heart, Frown, Meh, Smile } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LiveSentimentTrackerProps {
  movieTitle: string;
  movieId: number;
  isNowPlaying: boolean;
}

export default function LiveSentimentTracker({ movieTitle, movieId, isNowPlaying }: LiveSentimentTrackerProps) {
  const [sentiment, setSentiment] = useState({
    positive: 72,
    mixed: 18,
    negative: 10,
    talkingAbout: 1247,
    openingScore: 84,
  });
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isNowPlaying) return;

    // Simulate live updates every 5 seconds
    const interval = setInterval(() => {
      setSentiment(prev => {
        const drift = () => Math.round((Math.random() - 0.5) * 4);
        const pos = Math.max(30, Math.min(90, prev.positive + drift()));
        const neg = Math.max(2, Math.min(40, prev.negative + drift()));
        const mixed = 100 - pos - neg;
        return {
          positive: pos,
          mixed: Math.max(0, mixed),
          negative: neg,
          talkingAbout: prev.talkingAbout + Math.floor(Math.random() * 12),
          openingScore: Math.max(40, Math.min(98, prev.openingScore + Math.round((Math.random() - 0.5) * 2))),
        };
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [isNowPlaying]);

  if (!isNowPlaying) return null;

  const { positive, mixed, negative, talkingAbout, openingScore } = sentiment;

  return (
    <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Live Sentiment</h4>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">LIVE</span>
        </div>
        <div className={`flex items-center gap-1 ${pulse ? 'opacity-100' : 'opacity-60'} transition-opacity`}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400">Updating</span>
        </div>
      </div>

      {/* Opening Night Score */}
      <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[#a0a0b0]">Opening Night Score</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-2xl font-bold ${openingScore >= 70 ? 'text-emerald-400' : openingScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {openingScore}
            </span>
            <span className="text-xs text-[#6b6b7b]">/100</span>
          </div>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <Smile className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] text-[#6b6b7b] w-14">Positive</span>
          <div className="flex-1 h-2 bg-[#1a1a25] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${positive}%` }} />
          </div>
          <span className="text-xs font-bold text-emerald-400 w-8 text-right">{positive}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Meh className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] text-[#6b6b7b] w-14">Mixed</span>
          <div className="flex-1 h-2 bg-[#1a1a25] rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${mixed}%` }} />
          </div>
          <span className="text-xs font-bold text-amber-400 w-8 text-right">{mixed}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Frown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-[#6b6b7b] w-14">Negative</span>
          <div className="flex-1 h-2 bg-[#1a1a25] rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${negative}%` }} />
          </div>
          <span className="text-xs font-bold text-red-400 w-8 text-right">{negative}%</span>
        </div>
      </div>

      {/* Talking About Counter */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#2a2a35]">
        <Users className="w-3.5 h-3.5 text-purple-400" />
        <p className="text-[10px] text-[#6b6b7b]">
          <span className="text-purple-400 font-bold">{talkingAbout.toLocaleString()}</span> people are talking about this right now
        </p>
      </div>
    </div>
  );
}
