'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { User, Camera, Globe, Star, Film, Bookmark, Users, Calendar, Edit3, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Gizmo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nala',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Rex',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ziggy',
];

export default function DashboardProfilePage() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_reviews');
      if (data) setReviewCount(JSON.parse(data).length);
    } catch { /* ignore */ }
    try {
      const data = localStorage.getItem('typescribe_watchlist');
      if (data) setWatchlistCount(JSON.parse(data).length);
    } catch { /* ignore */ }
    try {
      const data = localStorage.getItem('typescribe_joined_communities');
      if (data) setCommunityCount(JSON.parse(data).length);
    } catch { /* ignore */ }
  }, []);

  const handleAvatarSelect = (url: string) => {
    updateProfile({ avatar: url });
    setShowAvatarPicker(false);
  };

  const handleRemoveAvatar = () => {
    updateProfile({ avatar: '' });
    setShowAvatarPicker(false);
  };

  const initials = user?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to edit your profile.</p></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <Link href="/dashboard/settings"><Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2"><Edit3 className="w-4 h-4" />Edit Settings</Button></Link>
      </div>

      {/* Avatar Section */}
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mb-6">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#e50914]/30 ring-4 ring-[#e50914]/10">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#e50914] rounded-full flex items-center justify-center text-white hover:bg-[#b20710] transition-colors border-2 border-[#12121a]"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white">{user?.display_name || 'Movie Lover'}</h2>
          <p className="text-sm text-[#6b7280] mt-1">{user?.email}</p>
          <div className="flex items-center gap-2 text-xs text-[#6b7280] mt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {memberSince}</span>
          </div>
          {user?.bio && (
            <p className="text-sm text-[#9ca3af] mt-3 text-center max-w-md">{user.bio}</p>
          )}
          {user?.favorite_genres && user.favorite_genres.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              {user.favorite_genres.map(genre => (
                <span key={genre} className="text-xs text-[#9ca3af] bg-[#111118] border border-[#1e1e28] px-2.5 py-1 rounded-full">{genre}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAvatarPicker(false)}>
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Choose Avatar</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="text-[#6b7280] hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {AVATAR_PRESETS.map(url => (
                <button
                  key={url}
                  onClick={() => handleAvatarSelect(url)}
                  className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:border-[#e50914] ${user?.avatar === url ? 'border-[#e50914] ring-2 ring-[#e50914]/30' : 'border-[#1e1e28]'}`}
                >
                  <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button onClick={handleRemoveAvatar} className="text-sm text-[#6b7280] hover:text-white transition-colors">Remove avatar (use initials)</button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <Star className="w-5 h-5 text-[#f5c518] mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{reviewCount}</p>
          <p className="text-xs text-[#6b7280]">Reviews</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <Film className="w-5 h-5 text-[#3b82f6] mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{reviewCount + watchlistCount}</p>
          <p className="text-xs text-[#6b7280]">Watched</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <Bookmark className="w-5 h-5 text-[#e50914] mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{watchlistCount}</p>
          <p className="text-xs text-[#6b7280]">Watchlist</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-[#22c55e] mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{communityCount}</p>
          <p className="text-xs text-[#6b7280]">Communities</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Quick Links</h2>
        <div className="space-y-2">
          <Link href="/dashboard/reviews" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#111118] rounded-lg transition-colors">
            <Star className="w-4 h-4" /> My Reviews
          </Link>
          <Link href="/dashboard/watchlist" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#111118] rounded-lg transition-colors">
            <Bookmark className="w-4 h-4" /> My Watchlist
          </Link>
          <Link href="/dashboard/communities" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#111118] rounded-lg transition-colors">
            <Users className="w-4 h-4" /> My Communities
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#111118] rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </Link>
        </div>
      </div>
    </DashboardSidebar>
  );
}
