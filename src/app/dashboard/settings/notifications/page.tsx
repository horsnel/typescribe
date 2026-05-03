'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Bell, Mail, Star, Users, Sparkles, Megaphone, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const NOTIFICATION_TYPES = [
  { key: 'weekly_recos', label: 'Weekly movie recommendations email', icon: Mail, default: true },
  { key: 'new_releases', label: 'New releases in my favorite genres', icon: Star, default: true },
  { key: 'review_replies', label: 'Someone replies to my review', icon: Bell, default: true },
  { key: 'review_helpful', label: 'Someone finds my review helpful', icon: Star, default: true },
  { key: 'community_posts', label: 'New posts in my communities', icon: Users, default: false },
  { key: 'ai_updates', label: 'AI review updates for movies I\'ve watched', icon: Sparkles, default: false },
  { key: 'marketing', label: 'Marketing and promotional emails', icon: Megaphone, default: false },
];

const PREFS_KEY = 'typescribe_notification_prefs';

function loadPrefs(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(PREFS_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  // Return defaults
  const defaults: Record<string, boolean> = {};
  NOTIFICATION_TYPES.forEach(n => { defaults[n.key] = n.default; });
  return defaults;
}

function savePrefs(prefs: Record<string, boolean>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export default function DashboardSettingsNotificationsPage() {
  const { isAuthenticated } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const togglePref = (key: string) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
  };

  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to access settings.</p></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Notification Preferences</h1>
        <Button onClick={handleSave} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2">
          <Save className="w-4 h-4" strokeWidth={1.5} />
          {saved ? 'Saved!' : 'Save Preferences'}
        </Button>
      </div>

      {saved && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" strokeWidth={1.5} />
          <span className="text-sm text-green-400">Notification preferences saved successfully!</span>
        </div>
      )}

      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <p className="text-sm text-[#9ca3af] mb-6">Choose which notifications you want to receive. You can change these at any time.</p>
        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((notif) => {
            const isEnabled = prefs[notif.key] ?? notif.default;
            return (
              <div key={notif.key} className="flex items-center justify-between py-3 border-b border-[#1e1e28]/50 last:border-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEnabled ? 'bg-[#8B5CF6]/10' : 'bg-[#1e1e28]'}`}>
                    <notif.icon className={`w-4 h-4 flex-shrink-0 ${isEnabled ? 'text-[#8B5CF6]' : 'text-[#6b7280]'}`} strokeWidth={1.5} />
                  </div>
                  <span className={`text-sm transition-colors ${isEnabled ? 'text-white' : 'text-[#9ca3af]'}`}>{notif.label}</span>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => togglePref(notif.key)}
                  className={`data-[state=checked]:bg-[#8B5CF6] data-[state=unchecked]:bg-[#2a2a35] ${isEnabled ? '' : 'opacity-70'}`}
                  aria-label={`Toggle ${notif.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
