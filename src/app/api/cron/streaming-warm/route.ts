import { NextRequest, NextResponse } from 'next/server';
import { getStreamingCatalogFull, clearStreamingCache } from '@/lib/streaming-pipeline';

/**
 * GET /api/cron/streaming-warm
 *
 * Vercel Cron Job — warms the streaming pipeline cache.
 * Fetches the FULL catalog (all 14+ sources) so subsequent user requests are
 * served from the Supabase streaming_cache table without re-fetching.
 *
 * Security: verifies a cron secret to prevent unauthorized calls.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (strict — fails-closed if env var missing)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron /streaming-warm] CRON_SECRET not set — refusing to run unauthenticated');
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  // 1. Clear stale streaming cache (memory + Supabase + file)
  try {
    const cleared = await clearStreamingCache();
    results.push(`Cleared ${cleared} streaming cache entries`);
  } catch (err: any) {
    errors.push(`Cache clear failed: ${err.message}`);
  }

  // 2. Warm cache: fetch the FULL streaming catalog (all 14+ sources).
  //    This blocks until the fetch completes so the Supabase streaming_cache
  //    table is fully populated before the function returns.
  try {
    const catalog = await getStreamingCatalogFull();
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
