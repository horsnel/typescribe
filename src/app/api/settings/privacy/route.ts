import { NextResponse } from 'next/server';
import { getCurrentProfile, updateProfile } from '@/lib/db';

/**
 * Privacy settings API.
 *
 * Shape (stored in profiles.privacy_settings JSONB + the standalone
 * public_profile boolean column):
 *   {
 *     public_profile:  boolean,   // standalone column (referenced by RLS)
 *     show_watchlist:  boolean,   // ─┐
 *     show_ratings:    boolean,   //  │ stored in privacy_settings JSONB
 *     show_community:  boolean,   //  │
 *     allow_mentions:  boolean,   // ─┘
 *   }
 *
 * GET  /api/settings/privacy  → returns the user's current privacy prefs
 * POST /api/settings/privacy  → updates prefs (body: partial shape above)
 *
 * On first read after the migration, missing JSONB keys default to `true`
 * (open-by-default) for backwards compatibility with existing users.
 */

export const DEFAULTS = {
  public_profile: true,
  show_watchlist: false,
  show_ratings: true,
  show_community: true,
  allow_mentions: true,
} as const;

export interface PrivacySettings {
  public_profile: boolean;
  show_watchlist: boolean;
  show_ratings: boolean;
  show_community: boolean;
  allow_mentions: boolean;
}

function normalize(profile: { public_profile: boolean | null; privacy_settings?: Record<string, unknown> | null }): PrivacySettings {
  const ps = profile.privacy_settings ?? {};
  return {
    public_profile: profile.public_profile ?? DEFAULTS.public_profile,
    show_watchlist:  typeof ps.show_watchlist  === 'boolean' ? ps.show_watchlist  : DEFAULTS.show_watchlist,
    show_ratings:    typeof ps.show_ratings    === 'boolean' ? ps.show_ratings    : DEFAULTS.show_ratings,
    show_community:  typeof ps.show_community  === 'boolean' ? ps.show_community  : DEFAULTS.show_community,
    allow_mentions:  typeof ps.allow_mentions  === 'boolean' ? ps.allow_mentions  : DEFAULTS.allow_mentions,
  };
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(normalize(profile));
}

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Pull out the boolean flags the client is allowed to set.
  // Unknown keys are silently ignored (defensive).
  const patch: PrivacySettings = { ...normalize(profile) };
  for (const key of Object.keys(DEFAULTS) as (keyof PrivacySettings)[]) {
    const v = body[key];
    if (typeof v === 'boolean') patch[key] = v;
  }

  try {
    await updateProfile(profile.id, {
      public_profile: patch.public_profile,
      privacy_settings: {
        show_watchlist: patch.show_watchlist,
        show_ratings: patch.show_ratings,
        show_community: patch.show_community,
        allow_mentions: patch.allow_mentions,
      },
    });
  } catch (e: any) {
    console.error('[/api/settings/privacy] updateProfile failed:', e);
    return NextResponse.json(
      { error: 'Failed to save privacy settings', details: e?.message ?? String(e) },
      { status: 500 },
    );
  }

  return NextResponse.json(patch);
}
