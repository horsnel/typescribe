import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/mood-heatmap
 * POST /api/mood-heatmap
 *   body: { mood, movie_id, movie_title, poster_path, rating }
 *
 * F36 — Mood Heatmap. Each user logs movies they watched under a "mood"
 * (e.g. cozy, melancholic, pumped, nostalgic) and we visualize counts
 * per mood over time.
 */

const MOODS = ['Cozy','Melancholic','Pumped','Nostalgic','Romantic','Tense','Curious','Inspired','Sad','Triumphant'];

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('mood_heatmap')
    .select('*')
    .eq('user_id', profile.id)
    .order('logged_at', { ascending: false });

  // Tally per mood
  const tally: Record<string, number> = {};
  for (const m of MOODS) tally[m] = 0;
  for (const row of data ?? []) {
    tally[row.mood] = (tally[row.mood] ?? 0) + 1;
  }

  return NextResponse.json({
    entries: data ?? [],
    moods: MOODS,
    tally,
    total: (data ?? []).length,
  });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mood, movie_id, movie_title, poster_path, rating } = await req.json();
  if (!mood || !movie_id) return NextResponse.json({ error: 'mood + movie_id required' }, { status: 400 });

  // Upsert — one entry per (user, mood, movie)
  const { error } = await supabaseAdmin
    .from('mood_heatmap')
    .upsert({
      user_id: profile.id,
      mood,
      movie_id,
      movie_title,
      poster_path: poster_path ?? null,
      rating: rating ?? null,
    }, { onConflict: 'user_id,mood,movie_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
