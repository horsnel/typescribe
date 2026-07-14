import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/communities/leaderboard?limit=10
 *
 * Returns the top reviewers by review count, joined with their profile data.
 * Replaces the previous in-file MOCK_USERS_DB that returned hardcoded names
 * like 'FilmBuff42', 'Sarah M.', etc.
 *
 * Response shape:
 *   { leaderboard: [{ user_id, display_name, avatar_url, review_count }] }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10) || 10, 50);

    // Count reviews per user, then join to profiles for display info.
    // RLS-safe: this uses the service-role admin client so it can read both
    // tables even though anon users can't normally list all profiles.
    const { data, error } = await supabaseAdmin
      .rpc('top_reviewers', { p_limit: limit })
      .select('*');

    if (error) {
      // The RPC may not exist yet on this database — fall back to a manual
      // two-step query that the route can run with the admin client.
      console.warn('[leaderboard] RPC top_reviewers not available, using fallback:', error.message);

      // Step 1: count reviews per user
      const { data: counts, error: countErr } = await supabaseAdmin
        .from('reviews')
        .select('user_id')
        .not('moderation_status', 'eq', 'rejected');

      if (countErr) throw countErr;

      const countsByUser = new Map<string, number>();
      for (const row of counts ?? []) {
        const uid = row.user_id as string;
        countsByUser.set(uid, (countsByUser.get(uid) ?? 0) + 1);
      }

      const topUserIds = [...countsByUser.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([uid]) => uid);

      if (topUserIds.length === 0) {
        return NextResponse.json({ leaderboard: [] });
      }

      // Step 2: fetch profiles for these users
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', topUserIds);

      if (profileErr) throw profileErr;

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      const leaderboard = topUserIds.map((uid) => {
        const profile = profileMap.get(uid) as any;
        return {
          user_id: uid,
          display_name: profile?.display_name ?? 'Anonymous',
          avatar_url: profile?.avatar_url ?? null,
          review_count: countsByUser.get(uid) ?? 0,
        };
      });

      return NextResponse.json({ leaderboard });
    }

    // RPC path — already shaped correctly
    return NextResponse.json({
      leaderboard: (data ?? []).map((row: any) => ({
        user_id: row.user_id,
        display_name: row.display_name ?? 'Anonymous',
        avatar_url: row.avatar_url ?? null,
        review_count: row.review_count ?? 0,
      })),
    });
  } catch (err) {
    console.error('[leaderboard] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error', leaderboard: [] },
      { status: 500 },
    );
  }
}
