import { NextResponse } from 'next/server';
import { refreshStreamingCatalog, getStreamingPipelineStatus } from '@/lib/streaming-pipeline';

/**
 * POST /api/streaming/refresh
 *
 * Refresh the streaming catalog by clearing cache and re-fetching from all sources.
 * This is an admin-level operation.
 */
export async function POST() {
  try {
    const catalog = await refreshStreamingCatalog();
    const status = getStreamingPipelineStatus();

    return NextResponse.json({
      success: true,
      totalMovies: catalog.movies.length,
      totalCategories: catalog.categories.length,
      lastUpdated: catalog.lastUpdated,
      sources: status.sources,
    });
  } catch (error: any) {
    console.error('[API /streaming/refresh] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh catalog', details: error.message },
      { status: 500 }
    );
  }
}
