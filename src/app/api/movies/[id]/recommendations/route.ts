/**
 * GET /api/movies/[id]/recommendations
 *
 * Fetch movie recommendations and similar movies from TMDb.
 * Strategy: Try recommendations first (higher quality), fall back to similar.
 * Returns up to 8 movies with proper poster images.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import type { Movie } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: 'Invalid TMDb ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    // Determine media type from query param (default: movie)
    const mediaType = request.nextUrl.searchParams.get('type') || 'movie';

    let movies: TMDb.PaginatedResult<Movie> | null = null;

    if (mediaType === 'tv') {
      // TV: similar shows
      movies = await TMDb.getSimilarTv(tmdbId);
    } else {
      // Movie: try recommendations first, fall back to similar
      movies = await TMDb.getMovieRecommendations(tmdbId);

      if (!movies || movies.results.length === 0) {
        movies = await TMDb.getSimilarMovies(tmdbId);
      }
    }

    if (!movies) {
      return NextResponse.json({ recommendations: [] });
    }

    // Return up to 8 recommendations (with poster images guaranteed by the TMDb functions)
    const recommendations = movies.results.slice(0, 8);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('[API /movies/[id]/recommendations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: error.message },
      { status: 500 },
    );
  }
}
