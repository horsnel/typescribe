import { NextRequest, NextResponse } from 'next/server';
import {
  getCacheStats,
  getAllCachedMovies,
  clearAllCachedMovies,
  pruneCache,
} from '@/lib/pipeline';
import { invalidateCachedMovie } from '@/lib/pipeline/cache';

/**
 * GET — Returns cache stats and list of cached movies.
 */
export async function GET() {
  try {
    const stats = getCacheStats();
    const cachedMovies = getAllCachedMovies();

    return NextResponse.json({
      success: true,
      stats,
      cachedMovies,
    });
  } catch (error) {
    console.error('[API /pipeline/cache GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Clears the cache (optionally a specific key via ?key=xxx).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const key = searchParams.get('key');

    if (key) {
      const removed = invalidateCachedMovie(key);
      const stats = getCacheStats();

      return NextResponse.json({
        success: removed,
        cleared: removed ? 1 : 0,
        message: removed ? `Invalidated cache entry: ${key}` : 'Entry not found',
        stats,
      });
    }

    const cleared = clearAllCachedMovies();
    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      cleared,
      message: `Cleared ${cleared} cache entries`,
      stats,
    });
  } catch (error) {
    console.error('[API /pipeline/cache DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

/**
 * POST — Prunes expired cache entries.
 */
export async function POST() {
  try {
    const pruned = pruneCache();
    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      cleared: pruned,
      message: `Pruned ${pruned} expired entries`,
      stats,
    });
  } catch (error) {
    console.error('[API /pipeline/cache POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to prune cache' },
      { status: 500 }
    );
  }
}
