'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { genres } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PRESET_AVATARS = [
  { id: 'av1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', label: 'Felix' },
  { id: 'av2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', label: 'Aneka' },
  { id: 'av3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster', label: 'Buster' },
  { id: 'av4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke', label: 'Duke' },
  { id: 'av5', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper', label: 'Jasper' },
  { id: 'av6', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna', label: 'Luna' },
  { id: 'av7', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight', label: 'Midnight' },
  { id: 'av8', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow', label: 'Shadow' },
  { id: 'av9', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba', label: 'Simba' },
  { id: 'av10', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe', label: 'Zoe' },
  { id: 'av11', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow', label: 'Willow' },
  { id: 'av12', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Phoenix', label: 'Phoenix' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(user?.favorite_genres || []);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [saved, setSaved] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to edit your profile</p>
          <Link href="/login" className="text-[#D4A853] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const userInitials = user.display_name
    ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const toggleGenre = (name: string) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleAvatarSelect = (url: string) => {
    setAvatarUrl(url);
    setAvatarDialogOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      display_name: displayName,
      bio,
      favorite_genres: selectedGenres,
      avatar: avatarUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#D4A853] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back to Profile
        </Link>
        <h1 className="text-3xl font-extrabold text-white mb-8">Edit Profile</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <label className="text-sm font-medium text-white mb-4 block">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B8922F] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#050507] border border-[#1e1e28] rounded-full flex items-center justify-center text-[#9ca3af] hover:text-white hover:border-[#D4A853] transition-all"
                      aria-label="Change avatar"
                    >
                      <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0c0c10] border-[#1e1e28] text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Choose Your Avatar</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-3 py-4">
                      {PRESET_AVATARS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => handleAvatarSelect(av.url)}
                          className={`relative rounded-xl p-1 transition-all hover:scale-105 ${
                            avatarUrl === av.url ? 'ring-2 ring-[#D4A853] bg-[#D4A853]/10' : 'bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45]'
                          }`}
                        >
                          <img src={av.url} alt={av.label} className="w-full aspect-square rounded-lg" />
                          <span className="block text-[10px] text-[#6b7280] text-center mt-1 truncate">{av.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(''); setAvatarDialogOpen(false); }}
                      className="mt-2 text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                    >
                      Remove avatar (use initials)
                    </button>
                  </DialogContent>
                </Dialog>
              </div>
              <div>
                <p className="text-sm text-[#9ca3af]">Pick a fun avatar to represent yourself</p>
                <p className="text-xs text-[#6b7280] mt-1">Click the camera icon to browse options</p>
              </div>
            </div>
          </div>

          {/* Name & Bio */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-white mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] min-h-[44px]"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-1.5 block">Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#D4A853] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Genres */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <label className="text-sm font-medium text-white mb-3 block">Favorite Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
                    selectedGenres.includes(genre.name)
                      ? 'bg-[#D4A853] text-white'
                      : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 min-h-[44px]">
              <Save className="w-4 h-4" strokeWidth={1.5} /> Save Changes
            </Button>
            {saved && <span className="text-sm text-green-400">Profile saved!</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
