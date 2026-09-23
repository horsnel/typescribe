import { NextResponse } from 'next/server';
import { getStreamingCatalog, getStreamingCatalogFull, getStreamingPipelineStatus } from '@/lib/streaming-pipeline';

// Vercel serverless function max duration (seconds)
export const maxDuration = 60;

/**
 * GET /api/streaming/catalog
 *
 * Returns the streaming catalog with movies and categories.
 * All data is fetched live from real streaming sources — there is no
 * hardcoded/seed/mock content anymore.
 *
 * Query params:
 *   ?categories=true — Include category groupings (default: true)
 *   ?moviesOnly=true — Only return the movie list, no categories
 *   ?tier=1 — Return the fast (Tier 2) live catalog
 *   ?full=true — Force a full fetch from all sources
 */
export const revalidate = 3600; // Cache for 1 hour at the Next.js level

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCategories = searchParams.get('categories') !== 'false';
    const moviesOnly = searchParams.get('moviesOnly') === 'true';
    const tier = searchParams.get('tier');
    const full = searchParams.get('full') === 'true';

    // Fast path: live Tier 2 data only (no Tier 3 round trips)
    if (tier === '1') {
      const catalog = await getStreamingCatalog();

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
      });
    }

    // Default: progressive loading — cached catalog, or live Tier 2 + background refresh
    const catalog = await getStreamingCatalog();
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
      backgroundRefreshInProgress: status.backgroundRefreshInProgress,
    });
  } catch (error: any) {
    console.error('[API /streaming/catalog] Error:', error);

    // No mock fallback — report the failure so the UI can show its empty state.
    return NextResponse.json(
      { error: 'Failed to fetch streaming catalog', details: error.message },
      { status: 500 }
    );
  }
}
