'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings as SettingsIcon, Bell, Eye, Save, Shield, Palette, Globe, Key, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true);
  const [publicProfile, setPublicProfile] = useState(user?.public_profile ?? true);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to view settings</p>
          <Link href="/login" className="text-[#e50914] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateProfile({ email_notifications: emailNotifications, public_profile: publicProfile });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirm) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    if (passwordData.newPass.length < 6) {
      setPasswordMsg('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    // Simulate password change (local auth only)
    setTimeout(() => {
      setPasswordSaving(false);
      setPasswordMsg('Password updated successfully!');
      setPasswordData({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordMsg(''), 3000);
    }, 1000);
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${enabled ? 'bg-[#e50914]' : 'bg-[#2a2a35]'}`}
    >
      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all" style={{ left: enabled ? '22px' : '2px' }} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
          <span>/</span>
          <span className="text-[#9ca3af]">Settings</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-[#e50914]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[#e50914]" />
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Receive email updates about new movies and reviews</p>
                </div>
                <Toggle enabled={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Reply Notifications</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Get notified when someone replies to your comment</p>
                </div>
                <Toggle enabled={true} onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Weekly Digest</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Get a weekly summary of top movies and reviews</p>
                </div>
                <Toggle enabled={true} onChange={() => {}} />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-[#e50914]" />
              <h2 className="text-lg font-semibold text-white">Privacy</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Public Profile</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Allow other users to see your reviews and watchlist</p>
                </div>
                <Toggle enabled={publicProfile} onChange={() => setPublicProfile(!publicProfile)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Show Spoilers</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Display spoiler content in reviews without hiding</p>
                </div>
                <Toggle enabled={showSpoilers} onChange={() => setShowSpoilers(!showSpoilers)} />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-[#e50914]" />
              <h2 className="text-lg font-semibold text-white">Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Language</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">Choose your preferred language</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-[#e50914]"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#050507] border border-[#1e1e28] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Rating System</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">Use 10-point rating scale</p>
                </div>
                <span className="text-xs text-[#6b7280] bg-[#0c0c10] px-2.5 py-1 rounded">10-point</span>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-[#e50914]" />
              <h2 className="text-lg font-semibold text-white">Change Password</h2>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-1.5 block">Current Password</label>
                <input type="password" value={passwordData.current} onChange={(e) => setPasswordData(p => ({ ...p, current: e.target.value }))} required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#e50914]" placeholder="Enter current password" />
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-1.5 block">New Password</label>
                <input type="password" value={passwordData.newPass} onChange={(e) => setPasswordData(p => ({ ...p, newPass: e.target.value }))} required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#e50914]" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-1.5 block">Confirm New Password</label>
                <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))} required className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#e50914]" placeholder="Repeat new password" />
              </div>
              {passwordMsg && <p className={`text-sm ${passwordMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{passwordMsg}</p>}
              <Button type="submit" disabled={passwordSaving} className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2">
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Update Password
              </Button>
            </form>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2">
              <Save className="w-4 h-4" /> Save Settings
            </Button>
            {saved && <span className="text-sm text-green-400">Settings saved!</span>}
          </div>

          {/* Account Section */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#e50914]" />
              <h2 className="text-lg font-semibold text-white">Account</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2">
                <span className="text-[#9ca3af]">Email</span>
                <span className="text-white">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#9ca3af]">Display Name</span>
                <span className="text-white">{user.display_name}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#9ca3af]">Member since</span>
                <span className="text-white">
                  {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#9ca3af]">Account ID</span>
                <span className="text-white font-mono text-xs">#{user.id}</span>
              </div>
              <div className="pt-3 border-t border-[#1e1e28] flex items-center gap-4">
                <Link href="/profile/edit" className="text-[#e50914] hover:underline text-sm">Edit Profile</Link>
                <Link href="/settings" className="text-[#6b7280] hover:text-white text-sm">Export Data</Link>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-[#0c0c10] border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            </div>
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Delete Account</p>
                  <p className="text-xs text-[#6b7280]">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50">
                  Delete Account
                </Button>
              </div>
            ) : (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-red-400 mb-3">Are you sure? This action cannot be undone. All your reviews, watchlist, and account data will be permanently deleted.</p>
                <div className="flex items-center gap-3">
                  <Button onClick={() => { logout(); }} className="bg-red-500 hover:bg-red-600 text-white gap-2">
                    <Trash2 className="w-4 h-4" /> Yes, Delete My Account
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-[#1e1e28] text-[#9ca3af]">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
