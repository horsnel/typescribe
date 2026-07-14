import { NextResponse } from 'next/server';
import { getCurrentProfile, getTasteTwins } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/taste-twin
 * Computes (if stale) and returns the current user's top taste twins
 * based on Pearson correlation of co-rated movies.
 */

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Recompute twins server-side via RPC (compute_taste_twins)
  const { error } = await supabaseAdmin.rpc('compute_taste_twins', {
    p_user_id: profile.id,
    p_limit: 5,
  });
  if (error) console.error('compute_taste_twins RPC failed:', error);

  const twins = await getTasteTwins(profile.id, 5);
  return NextResponse.json({ twins });
}
