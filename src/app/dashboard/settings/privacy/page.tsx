'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Shield, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Privacy Settings page — wired to /api/settings/privacy.
 *
 * Five toggles (all persisted server-side):
 *   - public_profile  → standalone profiles.public_profile column
 *                       (also drives the profiles_public_read RLS policy)
 *   - show_watchlist  ─┐
 *   - show_ratings    │  → stored in profiles.privacy_settings JSONB
 *   - show_community  │
 *   - allow_mentions  ─┘
 *
 * No mock data — defaults come from the API. Save button is disabled until
 * the user actually changes a toggle.
 */

interface PrivacySettings {
  public_profile: boolean;
  show_watchlist: boolean;
  show_ratings: boolean;
  show_community: boolean;
  allow_mentions: boolean;
}

const PRIVACY_OPTIONS: { key: keyof PrivacySettings; label: string; description: string }[] = [
  {
    key: 'public_profile',
    label: 'Make my profile public',
    description: 'Others can view your profile page. Disabling hides you from search and direct links.',
  },
  {
    key: 'show_watchlist',
    label: 'Show my watchlist to others',
    description: 'Your saved movies are visible on your public profile.',
  },
  {
    key: 'show_ratings',
    label: 'Show my ratings to others',
    description: 'Your movie ratings appear on your profile and on movie pages.',
  },
  {
    key: 'show_community',
    label: 'Allow others to see my community activity',
    description: 'Community posts and joined communities are visible on your profile.',
  },
  {
    key: 'allow_mentions',
    label: 'Allow mentions from anyone',
    description: 'When off, only users you follow can @-mention you in posts and comments.',
  },
];

export default function DashboardSettingsPrivacyPage() {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [original, setOriginal] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount (React docs: legitimate)
    setLoading(true);
    setError('');
    fetch('/api/settings/privacy', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: PrivacySettings) => {
        if (cancelled) return;
        setSettings(d);
        setOriginal(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load privacy settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = (key: keyof PrivacySettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const isDirty = !!settings && !!original && (
    settings.public_profile !== original.public_profile ||
    settings.show_watchlist  !== original.show_watchlist  ||
    settings.show_ratings    !== original.show_ratings    ||
    settings.show_community  !== original.show_community  ||
    settings.allow_mentions  !== original.allow_mentions
  );

  const handleSave = async () => {
    if (!settings || !isDirty) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? `HTTP ${res.status}`);
      }
      const updated: PrivacySettings = await res.json();
      setSettings(updated);
      setOriginal(updated);
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
        <p className="text-[#9ca3af]">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Privacy Settings</h1>

      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <p className="text-sm text-[#9ca3af] mb-6">
          Control who can see your information and activity on Typescribe.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#6b7280] animate-spin" strokeWidth={1.5} />
            <span className="ml-2 text-sm text-[#9ca3af]">Loading your privacy settings…</span>
          </div>
        ) : error && !settings ? (
          <div className="flex items-start gap-3 py-6 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-xs text-[#6b7280] mt-1">
                Try reloading the page. If the problem persists, run the
                <code className="mx-1 px-1.5 py-0.5 bg-[#050507] rounded text-[10px]">scripts/migrate_privacy_settings.py</code>
                migration on the Supabase project.
              </p>
            </div>
          </div>
        ) : settings ? (
          <>
            <div className="space-y-1">
              {PRIVACY_OPTIONS.map((option) => {
                const value = settings[option.key];
                return (
                  <div
                    key={option.key}
                    className="flex items-start justify-between py-3 border-b border-[#1e1e28]/50 last:border-0 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">{option.label}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{option.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      aria-label={option.label}
                      onClick={() => toggle(option.key)}
                      className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 cursor-pointer ${
                        value ? 'bg-[#D4A853]' : 'bg-[#2a2a35]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          value ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="bg-[#D4A853] hover:bg-[#B8922F] text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                    Saving…
                  </>
                ) : 'Save Privacy Settings'}
              </Button>

              {savedAt && !isDirty && !error && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <Check className="w-4 h-4" strokeWidth={2} />
                  Saved
                </span>
              )}

              {error && settings && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                  {error}
                </span>
              )}

              {isDirty && !error && (
                <span className="text-xs text-[#6b7280]">Unsaved changes</span>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Footer note — what each setting affects */}
      <div className="mt-6 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#D4A853] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-xs text-[#6b7280] leading-relaxed">
            <p className="mb-1.5">
              <span className="text-[#9ca3af] font-medium">How these settings work:</span>
            </p>
            <p className="mb-1.5">
              <span className="text-[#9ca3af]">Make my profile public</span> is enforced server-side —
              when off, your profile is hidden from everyone except you. The other toggles control
              visibility of specific sections on your public profile page.
            </p>
            <p>
              Changes take effect immediately on save. They are stored in the
              <code className="mx-1 px-1.5 py-0.5 bg-[#050507] rounded text-[10px]">profiles.privacy_settings</code>
              column on your account.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
