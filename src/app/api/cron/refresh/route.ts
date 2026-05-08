import { NextRequest, NextResponse } from 'next/server';
import { getTrending, getTopRated, getNowPlaying, browseMovies, clearTmdbCache, clearOmdbCache, pruneCache } from '@/lib/pipeline';

/**
 * GET /api/cron/refresh
 *
 * Vercel Cron Job — runs every hour.
 * Warms the cache by fetching popular content so that user requests
 * are served from cache (fast) instead of triggering cold API calls.
 *
 * Also prunes expired cache entries.
 *
 * Security: verifies a cron secret to prevent unauthorized calls.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  // 1. Clear stale in-memory caches so we get fresh data
  try {
    clearTmdbCache();
    clearOmdbCache();
    results.push('Cleared TMDb + OMDb in-memory caches');
  } catch (err: any) {
    errors.push(`Cache clear failed: ${err.message}`);
  }

  // 2. Prune expired pipeline cache entries
  try {
    const pruned = pruneCache();
    results.push(`Pruned ${pruned} expired cache entries`);
  } catch (err: any) {
    errors.push(`Prune failed: ${err.message}`);
  }

  // 3. Warm cache: fetch trending (most visited page)
  try {
    const trending = await getTrending('week');
    results.push(`Trending: ${trending.movies.length} movies cached`);
  } catch (err: any) {
    errors.push(`Trending fetch failed: ${err.message}`);
  }

  // 4. Warm cache: fetch top rated
  try {
    const topRated = await getTopRated(1);
    results.push(`Top Rated: ${topRated.movies.length} movies cached`);
  } catch (err: any) {
    errors.push(`Top Rated fetch failed: ${err.message}`);
  }

  // 5. Warm cache: fetch now playing
  try {
    const nowPlaying = await getNowPlaying(1);
    results.push(`Now Playing: ${nowPlaying.movies.length} movies cached`);
  } catch (err: any) {
    errors.push(`Now Playing fetch failed: ${err.message}`);
  }

  // 6. Warm cache: browse popular movies
  try {
    const popular = await browseMovies({
      format: 'movie',
      sort: 'popularity.desc',
      page: 1,
    });
    results.push(`Browse Popular: ${popular.movies.length} movies cached`);
  } catch (err: any) {
    errors.push(`Browse fetch failed: ${err.message}`);
  }

  // 7. Warm cache: browse TV shows
  try {
    const tvShows = await browseMovies({
      format: 'tv',
      sort: 'popularity.desc',
      page: 1,
    });
    results.push(`Browse TV: ${tvShows.movies.length} shows cached`);
  } catch (err: any) {
    errors.push(`TV fetch failed: ${err.message}`);
  }

  console.log('[Cron /refresh] Results:', results);
  if (errors.length > 0) {
    console.error('[Cron /refresh] Errors:', errors);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
