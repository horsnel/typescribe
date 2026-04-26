'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Settings, Mail, Lock, Bell, Shield, Trash2, Moon, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardSettingsPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to access settings.</p></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <h1 className="text-2xl font-bold text-white mb-6">Account Settings</h1>

      <div className="space-y-6">
        {/* Email */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-[#e50914]" />
            <h2 className="text-base font-semibold text-white">Email</h2>
          </div>
          <input type="email" defaultValue={user?.email || ''} className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#e50914] mb-3" />
          <Button size="sm" className="bg-[#e50914] hover:bg-[#b20710] text-white">Update Email</Button>
        </div>

        {/* Password */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-[#e50914]" />
            <h2 className="text-base font-semibold text-white">Password</h2>
          </div>
          <div className="space-y-3">
            <input type="password" placeholder="Current password" className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]" />
            <input type="password" placeholder="New password" className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]" />
            <input type="password" placeholder="Confirm new password" className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914]" />
          </div>
          <Button size="sm" className="mt-3 bg-[#e50914] hover:bg-[#b20710] text-white">Change Password</Button>
        </div>

        {/* Preferences */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-[#e50914]" />
            <h2 className="text-base font-semibold text-white">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-[#a0a0b0]" />
                <div><p className="text-sm text-white">Dark Mode</p><p className="text-xs text-[#6b6b7b]">Default theme</p></div>
              </div>
              <button className="w-12 h-6 bg-[#e50914] rounded-full relative"><span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" /></button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-[#a0a0b0]" />
                <div><p className="text-sm text-white">Language</p><p className="text-xs text-[#6b6b7b]">Site language preference</p></div>
              </div>
              <select className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0]">
                <option>English</option>
                <option>Français</option>
                <option>Español</option>
                <option>日本語</option>
                <option>한국어</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification & Privacy Links */}
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">More Settings</h2>
          <div className="space-y-2">
            <Link href="/dashboard/settings/notifications" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] rounded-lg transition-colors">
              <Bell className="w-4 h-4" /> Notification Preferences
            </Link>
            <Link href="/dashboard/settings/privacy" className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] rounded-lg transition-colors">
              <Shield className="w-4 h-4" /> Privacy Settings
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#12121a] border border-red-500/20 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-[#6b6b7b] mb-4">Once you delete your account, there is no going back.</p>
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
            <Trash2 className="w-4 h-4" /> Delete Account
          </Button>
        </div>
      </div>
    </DashboardSidebar>
  );
}
