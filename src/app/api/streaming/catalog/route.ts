import { NextResponse } from 'next/server';
import { getStreamingCatalog, getStreamingCatalogFull, getStreamingPipelineStatus } from '@/lib/streaming-pipeline';
import { getSeedMovies } from '@/lib/streaming-pipeline/seed';
import { getCached, setCached } from '@/lib/streaming-pipeline/cache';
import type { StreamingCatalog } from '@/lib/streaming-pipeline/types';

// Vercel serverless function max duration (seconds)
export const maxDuration = 60;

/**
 * GET /api/streaming/catalog
 *
 * Returns the streaming catalog with movies and categories.
 * Implements progressive loading:
 *   - Returns cached catalog immediately if available
 *   - If cache is empty, returns seed data and triggers background refresh
 *   - ?tier=1 returns only seed data (instant)
 *   - ?full=true triggers a full fetch from all sources
 *
 * Query params:
 *   ?categories=true — Include category groupings (default: true)
 *   ?moviesOnly=true — Only return the movie list, no categories
 *   ?tier=1 — Return only Tier 1 (seed) data instantly
 *   ?full=true — Force full fetch from all sources
 */
export const revalidate = 3600; // Cache for 1 hour at the Next.js level (reduced from 6 hours)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCategories = searchParams.get('categories') !== 'false';
    const moviesOnly = searchParams.get('moviesOnly') === 'true';
    const tier = searchParams.get('tier');
    const full = searchParams.get('full') === 'true';

    // Tier 1: Return seed data instantly (no API calls)
    if (tier === '1') {
      const seedMovies = getSeedMovies();
      return NextResponse.json({
        movies: seedMovies,
        categories: includeCategories ? [] : undefined,
        total: seedMovies.length,
        lastUpdated: new Date().toISOString(),
        isSeed: true,
        tier: 1,
      });
    }

    // Full fetch: Force fetching from all sources
    if (full) {
      const catalog = await getStreamingCatalogFull();
      const status = getStreamingPipelineStatus();

      if (moviesOnly) {
        return NextResponse.json({
          movies: catalog.movies,
          total: catalog.movies.length,
          lastUpdated: catalog.lastUpdated,
        });
      }

      return NextResponse.json({
        movies: catalog.movies,
        categories: includeCategories ? catalog.categories : undefined,
        total: catalog.movies.length,
        lastUpdated: catalog.lastUpdated,
        sources: status.sources,
        isSeed: false,
      });
    }

    // Default: progressive loading — try cache, then seed + background refresh
    const catalog = await getStreamingCatalog();
    const status = getStreamingPipelineStatus();

    if (moviesOnly) {
      return NextResponse.json({
        movies: catalog.movies,
        total: catalog.movies.length,
        lastUpdated: catalog.lastUpdated,
      });
    }

    // Determine if what we're returning is seed data
    const fullCache = getCached<StreamingCatalog>('streaming-catalog-full');
    const isSeed = !fullCache;

    return NextResponse.json({
      movies: catalog.movies,
      categories: includeCategories ? catalog.categories : undefined,
      total: catalog.movies.length,
      lastUpdated: catalog.lastUpdated,
      sources: status.sources,
      isSeed,
      backgroundRefreshInProgress: status.backgroundRefreshInProgress,
    });
  } catch (error: any) {
    console.error('[API /streaming/catalog] Error:', error);

    // Fallback: return seed data on error
    try {
      const seedMovies = getSeedMovies();
      return NextResponse.json({
        movies: seedMovies,
        categories: [],
        total: seedMovies.length,
        lastUpdated: new Date().toISOString(),
        isSeed: true,
        error: error.message,
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch streaming catalog', details: error.message },
        { status: 500 }
      );
    }
  }
}
