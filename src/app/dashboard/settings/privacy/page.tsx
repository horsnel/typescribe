'use client';

import { useAuth } from '@/lib/auth';
import { Shield, Eye, Bookmark, Star, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRIVACY_OPTIONS = [
  { key: 'public_profile', label: 'Make my profile public', description: 'Others can see your profile page', default: true },
  { key: 'show_watchlist', label: 'Show my watchlist to others', description: 'Your saved movies are visible on your profile', default: false },
  { key: 'show_ratings', label: 'Show my ratings to others', description: 'Your movie ratings are visible on your profile', default: true },
  { key: 'show_community', label: 'Allow others to see my community activity', description: 'Community posts and joins are visible', default: true },
  { key: 'allow_mentions', label: 'Allow mentions from anyone', description: 'Only followers / nobody can also be chosen', default: true },
];

export default function DashboardSettingsPrivacyPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to access settings.</p></div>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Privacy Settings</h1>

      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <p className="text-sm text-[#9ca3af] mb-6">Control who can see your information and activity on Typescribe.</p>
        <div className="space-y-4">
          {PRIVACY_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-start justify-between py-3 border-b border-[#1e1e28]/50 last:border-0 gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white">{option.label}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">{option.description}</p>
              </div>
              <button className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${option.default ? 'bg-[#8B5CF6]' : 'bg-[#2a2a35]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${option.default ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <Button className="mt-6 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">Save Privacy Settings</Button>
      </div>
    </>
  );
}
