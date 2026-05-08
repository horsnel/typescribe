import { NextRequest, NextResponse } from 'next/server';
import { getStreamingMovie, getSimilarStreamingMovies } from '@/lib/streaming-pipeline';

// Vercel serverless function max duration (seconds)
export const maxDuration = 60;

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
export const revalidate = 86400; // Cache for 24 hours at the Next.js level

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
      try {
        // Race with a 15-second timeout to prevent blocking the response
        const similarPromise = getSimilarStreamingMovies(id, similarLimit);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Similar movies timeout')), 15000)
        );
        similar = await Promise.race([similarPromise, timeoutPromise]);
      } catch (err) {
        // Similar movies require full catalog which may timeout on cold starts
        // Return the movie without similar rather than failing entirely
        console.warn('[API /streaming/detail] Similar movies fetch failed/timed out, returning movie only:', err);
        similar = [];
      }
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
