/**
 * GET /api/movies/[id]
 *
 * Get a single movie by TMDb ID. Returns just the Movie object
 * (not the full MergedMovieResult with pipeline metadata).
 *
 * Strategy:
 *   1. Check cache first via getCachedMovie — instant if available
 *   2. If not cached, run the full pipeline via getMovie
 *   3. Return only the movie object
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovie } from '@/lib/pipeline';
import { getCachedMovie } from '@/lib/pipeline/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Parse & validate TMDb ID ──
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: 'Invalid TMDb ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    // ── Check cache first ──
    const cacheKey = `tmdb:${tmdbId}`;
    const cached = getCachedMovie(cacheKey);

    if (cached) {
      console.log(`[API /movies] Cache hit for tmdb:${tmdbId}`);
      return NextResponse.json(cached.movie);
    }

    // ── Not cached — run the full pipeline ──
    console.log(`[API /movies] Cache miss for tmdb:${tmdbId}, running pipeline`);

    const result = await getMovie(tmdbId);

    // If the pipeline returned no useful data, return 404
    if (result.completeness === 0 && !result.movie.title) {
      return NextResponse.json(
        { error: `Movie with TMDb ID ${tmdbId} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json(result.movie);
  } catch (error: any) {
    console.error('[API /movies] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get movie', details: error.message },
      { status: 500 },
    );
  }
}
