import { NextRequest, NextResponse } from 'next/server';
import { searchStreamingMovies } from '@/lib/streaming-pipeline';

/**
 * GET /api/streaming/search?q=query
 *
 * Search streaming movies by title, genre, or description.
 * Searches across all sources (local catalog, YouTube, Internet Archive).
 *
 * Query params:
 *   q — Search query (required, min 2 characters)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters', results: [] },
        { status: 400 }
      );
    }

    const results = await searchStreamingMovies(query);

    return NextResponse.json({
      query,
      results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('[API /streaming/search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message, results: [] },
      { status: 500 }
    );
  }
}
