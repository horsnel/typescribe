import { NextRequest, NextResponse } from 'next/server';
import { getStreamingMovie, getSimilarStreamingMovies } from '@/lib/streaming-pipeline';

/**
 * GET /api/streaming/detail?id=movie-id
 *
 * Returns a single streaming movie by ID.
 * Also returns similar movies if ?similar=true.
 *
 * Using query parameter instead of URL path to avoid issues with
 * movie IDs containing dots (e.g., "archive-movie.avi").
 *
 * Supported IDs:
 *   - blender-big-buck-bunny
 *   - blender-sintel
 *   - blender-tears-of-steel
 *   - blender-elephants-dream
 *   - blender-spring
 *   - archive-{identifier}
 *   - youtube-{videoId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Movie ID is required. Use ?id=movie-id' },
        { status: 400 }
      );
    }

    const movie = await getStreamingMovie(id);

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found', id },
        { status: 404 }
      );
    }

    const includeSimilar = searchParams.get('similar') === 'true';
    const similarLimit = parseInt(searchParams.get('limit') || '8', 10);

    let similar: Awaited<ReturnType<typeof getSimilarStreamingMovies>> | undefined = undefined;
    if (includeSimilar) {
      similar = await getSimilarStreamingMovies(id, similarLimit);
    }

    return NextResponse.json({
      movie,
      similar,
    });
  } catch (error: any) {
    console.error('[API /streaming/detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streaming movie', details: error.message },
      { status: 500 }
    );
  }
}
