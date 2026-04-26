'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { genres } from '@/lib/data';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(user?.favorite_genres || []);
  const [saved, setSaved] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#a0a0b0] mb-4">Please sign in to edit your profile</p>
          <Link href="/login" className="text-[#e50914] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const toggleGenre = (name: string) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      display_name: displayName,
      bio,
      favorite_genres: selectedGenres,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-[#6b6b7b] hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
        <h1 className="text-3xl font-extrabold text-white mb-8">Edit Profile</h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-white mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-1.5 block">Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
            <label className="text-sm font-medium text-white mb-3 block">Favorite Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedGenres.includes(genre.name)
                      ? 'bg-[#e50914] text-white'
                      : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
            {saved && <span className="text-sm text-green-400">Profile saved!</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
