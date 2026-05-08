import { NextRequest, NextResponse } from 'next/server';
import { pruneCache, getCacheStats } from '@/lib/pipeline';

/**
 * GET /api/cron/prune-cache
 *
 * Vercel Cron Job — runs every 6 hours.
 * Prunes expired cache entries and returns cache stats.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pruned = pruneCache();
    const stats = getCacheStats();

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
