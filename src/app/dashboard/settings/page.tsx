'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Settings, Mail, Lock, Bell, Shield, Trash2, Moon, Globe, Check, Save, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const ALL_GENRES = ['Action', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Fantasy', 'Adventure', 'Musical', 'War', 'Western'];

export default function DashboardSettingsPage() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setEmailNotifications(user.email_notifications);
      setPublicProfile(user.public_profile);
      setFavoriteGenres(user.favorite_genres || []);
    }
  }, [user]);

  const handleSave = () => {
    updateProfile({
      display_name: displayName,
      bio,
      email_notifications: emailNotifications,
      public_profile: publicProfile,
      favorite_genres: favoriteGenres,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleGenre = (genre: string) => {
    setFavoriteGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to access settings.</p></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <Button onClick={handleSave} className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2">
          <Save className="w-4 h-4" strokeWidth={1.5} />
          {saved ? 'Saved!' : 'Save All'}
        </Button>
      </div>

      {saved && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" strokeWidth={1.5} />
          <span className="text-sm text-green-400">Settings saved successfully!</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Info */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-white">Profile Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4A853]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-1.5">Bio <span className="text-[#6b7280]">(max 160 chars)</span></label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 160))}
                placeholder="Tell others about yourself..."
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] resize-none"
              />
              <p className="text-xs text-[#6b7280] mt-1">{bio.length}/160</p>
            </div>
            <div>
              <label className="block text-sm text-[#9ca3af] mb-2">Favorite Genres</label>
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      favoriteGenres.includes(genre)
                        ? 'bg-[#D4A853] text-white border-[#D4A853]'
                        : 'bg-[#050507] text-[#9ca3af] border-[#1e1e28] hover:border-[#3a3a45] hover:text-white'
                    }`}
                  >
                    {favoriteGenres.includes(genre) && <Check className="w-3 h-3 inline mr-1" strokeWidth={1.5} />}
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-white">Email</h2>
          </div>
          <input type="email" defaultValue={user?.email || ''} className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#D4A853] mb-1" disabled />
          <p className="text-xs text-[#6b7280]">Email cannot be changed in this demo.</p>
        </div>

        {/* Password */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-white">Password</h2>
          </div>
          <div className="space-y-3">
            <input type="password" placeholder="Current password" className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]" />
            <input type="password" placeholder="New password" className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]" />
            <input type="password" placeholder="Confirm new password" className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853]" />
          </div>
          <Button size="sm" className="mt-3 bg-[#D4A853] hover:bg-[#B8922F] text-white">Change Password</Button>
        </div>

        {/* Preferences */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-white">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="w-4 h-4 text-[#9ca3af] flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-white">Email Notifications</p>
                  <p className="text-xs text-[#6b7280]">Receive email about reviews and activity</p>
                </div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${emailNotifications ? 'bg-[#D4A853]' : 'bg-[#2a2a35]'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailNotifications ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-[#9ca3af] flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-white">Public Profile</p>
                  <p className="text-xs text-[#6b7280]">Others can see your profile and reviews</p>
                </div>
              </div>
              <button
                onClick={() => setPublicProfile(!publicProfile)}
                className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${publicProfile ? 'bg-[#D4A853]' : 'bg-[#2a2a35]'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${publicProfile ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Moon className="w-4 h-4 text-[#9ca3af] flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0"><p className="text-sm text-white">Dark Mode</p><p className="text-xs text-[#6b7280]">Default theme</p></div>
              </div>
              <button className="w-12 h-6 bg-[#D4A853] rounded-full relative flex-shrink-0"><span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" /></button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-[#9ca3af] flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0"><p className="text-sm text-white">Language</p><p className="text-xs text-[#6b7280]">Site language preference</p></div>
              </div>
              <select className="bg-[#050507] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] flex-shrink-0">
                <option>English</option>
                <option>Français</option>
                <option>Español</option>
                <option>日本語</option>
                <option>한국어</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#0c0c10] border border-red-500/20 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-[#6b7280] mb-4">Once you delete your account, there is no going back.</p>
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
            <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Delete Account
          </Button>
        </div>
      </div>
    </>
  );
}
