import { NextResponse } from 'next/server';
import { getStreamingCatalog, getStreamingPipelineStatus } from '@/lib/streaming-pipeline';

/**
 * GET /api/streaming/catalog
 *
 * Returns the full streaming catalog with movies and categories.
 * Cached internally for 6 hours.
 *
 * Query params:
 *   ?categories=true — Include category groupings (default: true)
 *   ?moviesOnly=true — Only return the movie list, no categories
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCategories = searchParams.get('categories') !== 'false';
    const moviesOnly = searchParams.get('moviesOnly') === 'true';

    const catalog = await getStreamingCatalog();

    if (moviesOnly) {
      return NextResponse.json({
        movies: catalog.movies,
        total: catalog.movies.length,
        lastUpdated: catalog.lastUpdated,
      });
    }

    const status = getStreamingPipelineStatus();

    return NextResponse.json({
      movies: catalog.movies,
      categories: includeCategories ? catalog.categories : undefined,
      total: catalog.movies.length,
      lastUpdated: catalog.lastUpdated,
      sources: status.sources,
    });
  } catch (error: any) {
    console.error('[API /streaming/catalog] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streaming catalog', details: error.message },
      { status: 500 }
    );
  }
}
