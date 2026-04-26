'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { User, Camera, Globe, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardProfilePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to edit your profile.</p></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <h1 className="text-2xl font-bold text-white mb-6">Profile Settings</h1>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Profile Picture</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-2xl font-bold">
              {user?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <Button variant="outline" className="border-[#2a2a35] text-white hover:bg-[#1a1a25] gap-2">
              <Camera className="w-4 h-4" /> Change Avatar
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#a0a0b0] mb-1.5">Display Name</label>
              <input type="text" defaultValue={user?.display_name || ''} className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#e50914]" />
            </div>
            <div>
              <label className="block text-sm text-[#a0a0b0] mb-1.5">Username</label>
              <input type="text" placeholder="Choose a unique username" className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]" />
            </div>
            <div>
              <label className="block text-sm text-[#a0a0b0] mb-1.5">Bio <span className="text-[#6b6b7b]">(max 160 chars)</span></label>
              <textarea rows={3} placeholder="Tell others about yourself..." className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none" />
            </div>
            <div>
              <label className="block text-sm text-[#a0a0b0] mb-1.5">Favorite Genres</label>
              <input type="text" placeholder="Action, Drama, Sci-Fi..." className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]" />
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6b6b7b] uppercase tracking-wider mb-4">Profile Visibility</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Public Profile</p>
              <p className="text-xs text-[#6b6b7b]">Others can see your profile and reviews</p>
            </div>
            <button className="w-12 h-6 bg-[#e50914] rounded-full relative transition-colors">
              <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>

        <Button className="bg-[#e50914] hover:bg-[#b20710] text-white">Save Changes</Button>
      </div>
    </DashboardSidebar>
  );
}
