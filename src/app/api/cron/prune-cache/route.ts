import { NextRequest, NextResponse } from 'next/server';
import { pruneCache, getCacheStats } from '@/lib/pipeline';

/**
 * GET /api/cron/prune-cache
 *
 * Vercel Cron Job — runs daily at midnight UTC (see vercel.json).
 * Prunes expired cache entries from all 3 tiers (in-memory + Supabase + filesystem)
 * and returns aggregate cache stats.
 *
 * Security: requires Authorization: Bearer ${CRON_SECRET} header.
 * If CRON_SECRET is not set in env, refuses to run (fails-closed) to prevent
 * unauthenticated callers from triggering prune operations.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron /prune-cache] CRON_SECRET not set — refusing to run unauthenticated');
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pruned = await pruneCache();
    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      pruned,
      cacheStats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron /prune-cache] Error:', error);
    return NextResponse.json(
      { error: 'Prune failed', details: error.message },
      { status: 500 }
    );
  }
}
