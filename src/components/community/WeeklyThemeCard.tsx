'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Sparkles, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getWeeklyTheme,
  generateWeeklyTheme,
  type WeeklyTheme,
} from '@/lib/community-storage';

interface WeeklyThemeCardProps {
  communityId: string;
  onDiscuss?: () => void;
}

export default function WeeklyThemeCard({ communityId, onDiscuss }: WeeklyThemeCardProps) {
  const [theme, setTheme] = useState<WeeklyTheme | null>(null);
  const router = useRouter();

  useEffect(() => {
    let current = getWeeklyTheme(communityId);
    if (!current) {
      current = generateWeeklyTheme(communityId);
    }
    setTheme(current);
  }, [communityId]);

  if (!theme) return null;

  // Calculate days remaining in the week
  const now = new Date();
  const weekStart = new Date(theme.weekStart);
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const daysLeft = Math.max(0, Math.ceil((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const handleDiscuss = () => {
    if (onDiscuss) {
      onDiscuss();
    } else {
      // Fallback: navigate to community discussions tab
      router.push(`/community/${communityId}?tab=discussions`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0c0c10] to-[#0c0c14] border border-[#8B5CF6]/20 rounded-xl overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-[#8B5CF6]/15 to-purple-500/15 px-5 py-4 border-b border-[#8B5CF6]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider">This Week&apos;s Theme</span>
              <span className="text-[10px] text-[#6b7280] bg-[#1e1e28] px-1.5 py-0.5 rounded-full">{daysLeft}d left</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5 leading-snug">{theme.title}</h3>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm text-[#9ca3af] leading-relaxed mb-4">{theme.description}</p>

        {/* Discussion prompt */}
        <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Discussion Prompt</span>
              <p className="text-sm text-white mt-1 leading-relaxed">{theme.prompt}</p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <Button
          onClick={handleDiscuss}
          className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2 min-h-[44px]"
          size="sm"
        >
          <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
          Join the Discussion
          <ChevronRight className="w-4 h-4 ml-auto" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
