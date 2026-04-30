'use client';

import { useState, useEffect } from 'react';
import {
  Trophy, Flame, Star, Zap, ChevronRight, Lock, Unlock,
  PenLine, NotebookPen, Landmark, MessageCircle, Mic, Heart,
  Swords, Bird, Crown, CalendarDays, CalendarRange, Compass,
  Vote, Sword, Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getUserAchievements,
  getContributionStreak,
  ACHIEVEMENT_DEFINITIONS,
  checkAndUnlockAchievements,
  type UserAchievement,
  type Achievement,
} from '@/lib/community-storage';

interface AchievementBadgeProps {
  userId: number;
  communityId: string;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  contribution: Star,
  social: Zap,
  streak: Flame,
  special: Trophy,
};

// Map achievement icon keys to Lucide components
const ACHIEVEMENT_ICON_MAP: Record<string, typeof Trophy> = {
  'pen-line': PenLine,
  'notebook-pen': NotebookPen,
  'landmark': Landmark,
  'message-circle': MessageCircle,
  'mic': Mic,
  'star': Star,
  'trophy': Trophy,
  'heart': Heart,
  'flame': Flame,
  'swords': Swords,
  'sword': Sword,
  'bird': Bird,
  'crown': Crown,
  'calendar-days': CalendarDays,
  'calendar-range': CalendarRange,
  'vote': Vote,
  'compass': Compass,
  'network': Network,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  contribution: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  social: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  streak: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  special: { bg: 'bg-[#d4a853]/10', text: 'text-[#d4a853]', border: 'border-[#d4a853]/20' },
};

const TIER_LABELS: Record<string, string> = {
  Platinum: 'P',
  Gold: 'G',
  Silver: 'S',
  Bronze: 'B',
  Newcomer: 'N',
};

const TIER_COLORS: Record<string, string> = {
  Platinum: 'from-purple-400 to-purple-600',
  Gold: 'from-[#d4a853] to-[#b8922e]',
  Silver: 'from-gray-300 to-gray-500',
  Bronze: 'from-orange-400 to-orange-600',
  Newcomer: 'from-gray-500 to-gray-700',
};

export default function AchievementBadge({ userId, communityId, compact = false }: AchievementBadgeProps) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number }>({ currentStreak: 0, longestStreak: 0 });
  const [showAll, setShowAll] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UserAchievement[]>([]);

  useEffect(() => {
    // Check and unlock achievements on load
    const unlocked = checkAndUnlockAchievements(userId, communityId);
    setNewlyUnlocked(unlocked);
    
    setAchievements(getUserAchievements(userId, communityId));
    const streakData = getContributionStreak(communityId, userId);
    setStreak({ currentStreak: streakData.currentStreak, longestStreak: streakData.longestStreak });
  }, [userId, communityId]);

  const unlockedIds = new Set(achievements.filter(a => a.progress >= 100).map(a => a.achievementId));
  const inProgress = achievements.filter(a => a.progress > 0 && a.progress < 100);
  const unlocked = achievements.filter(a => a.progress >= 100);

  // Calculate user tier based on achievement count
  const unlockedCount = unlocked.length;
  let userTier = 'Newcomer';
  if (unlockedCount >= 12) userTier = 'Platinum';
  else if (unlockedCount >= 8) userTier = 'Gold';
  else if (unlockedCount >= 5) userTier = 'Silver';
  else if (unlockedCount >= 2) userTier = 'Bronze';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${TIER_COLORS[userTier]} flex items-center justify-center text-white text-[10px] font-bold`}>
          {TIER_LABELS[userTier]}
        </div>
        <span className="text-xs text-[#9ca3af]">
          {unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length}
        </span>
        {streak.currentStreak > 0 && (
          <span className="flex items-center gap-1 text-xs text-orange-400">
            <Flame className="w-3 h-3" strokeWidth={1.5} /> {streak.currentStreak}d
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#1e1e28]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4a853]/20 to-purple-500/20 border border-[#d4a853]/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#d4a853]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Achievements</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${TIER_COLORS[userTier]} flex items-center justify-center text-white text-[9px] font-bold`}>
                  {TIER_LABELS[userTier]}
                </div>
                <span className="text-xs text-[#9ca3af]">{unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked</span>
                {streak.currentStreak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-orange-400">
                    <Flame className="w-3 h-3" strokeWidth={1.5} /> {streak.currentStreak}-day streak
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newly unlocked toast */}
      {newlyUnlocked.length > 0 && (
        <div className="p-3 bg-green-500/10 border-b border-green-500/20">
          <p className="text-xs text-green-400 font-medium">
            New achievement unlocked! {newlyUnlocked.map(a => {
              const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === a.achievementId);
              return def ? def.title : '';
            }).join(', ')}
          </p>
        </div>
      )}

      {/* Achievement grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFINITIONS.slice(0, showAll ? ACHIEVEMENT_DEFINITIONS.length : 6).map((def: Achievement) => {
            const isUnlocked = unlockedIds.has(def.id);
            const progress = achievements.find(a => a.achievementId === def.id)?.progress || 0;
            const CategoryIcon = CATEGORY_ICONS[def.category] || Trophy;
            const colors = CATEGORY_COLORS[def.category] || CATEGORY_COLORS.special;

            return (
              <div
                key={def.id}
                className={`relative p-3 rounded-lg border transition-all ${
                  isUnlocked
                    ? `${colors.bg} ${colors.border} hover:scale-[1.02]`
                    : 'bg-[#050507] border-[#1e1e28] opacity-50'
                }`}
              >
                {/* Icon */}
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const IconComponent = ACHIEVEMENT_ICON_MAP[def.icon] || Star;
                    return <IconComponent className={`w-5 h-5 ${isUnlocked ? colors.text : 'text-[#6b7280]'}`} />;
                  })()}
                  {isUnlocked ? (
                    <Unlock className={`w-3 h-3 ${colors.text}`} strokeWidth={1.5} />
                  ) : (
                    <Lock className="w-3 h-3 text-[#6b7280]" strokeWidth={1.5} />
                  )}
                </div>

                {/* Title & desc */}
                <h4 className={`text-xs font-semibold ${isUnlocked ? 'text-white' : 'text-[#6b7280]'} mb-0.5`}>
                  {def.title}
                </h4>
                <p className="text-[10px] text-[#6b7280] leading-snug">{def.description}</p>

                {/* Progress bar */}
                {!isUnlocked && progress > 0 && (
                  <div className="mt-2 w-full h-1 bg-[#1e1e28] rounded-full overflow-hidden">
                    <div className={`h-full ${colors.text.replace('text-', 'bg-')} rounded-full transition-all`} style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more */}
        {ACHIEVEMENT_DEFINITIONS.length > 6 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-[#6b7280] hover:text-[#d4a853] gap-1 min-h-[36px]"
            >
              {showAll ? 'Show Less' : `Show All (${ACHIEVEMENT_DEFINITIONS.length})`}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAll ? 'rotate-90' : ''}`} strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
