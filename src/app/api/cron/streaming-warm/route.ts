import { NextRequest, NextResponse } from 'next/server';
import { getStreamingCatalog, clearStreamingCache } from '@/lib/streaming-pipeline';

/**
 * GET /api/cron/streaming-warm
 *
 * Vercel Cron Job — warms the streaming pipeline cache.
 * Fetches the full catalog so subsequent user requests are fast.
 *
 * Security: verifies a cron secret to prevent unauthorized calls.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  // 1. Clear stale streaming cache
  try {
    const cleared = clearStreamingCache();
    results.push(`Cleared ${cleared} streaming cache entries`);
  } catch (err: any) {
    errors.push(`Cache clear failed: ${err.message}`);
  }

  // 2. Warm cache: fetch the full streaming catalog
  try {
    const catalog = await getStreamingCatalog();
    results.push(`Streaming catalog: ${catalog.movies.length} movies, ${catalog.categories.length} categories cached`);
  } catch (err: any) {
    errors.push(`Catalog fetch failed: ${err.message}`);
  }

  console.log('[Cron /streaming-warm] Results:', results);
  if (errors.length > 0) {
    console.error('[Cron /streaming-warm] Errors:', errors);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
