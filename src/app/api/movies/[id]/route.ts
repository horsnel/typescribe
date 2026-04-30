/**
 * GET /api/movies/[id]
 *
 * Get a single movie by TMDb ID.
 *
 * Strategy (fast-first):
 *   1. Check cache first — instant if available
 *   2. If not cached, return TMDb data immediately (fast)
 *   3. Run full pipeline in background for enrichment
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovie } from '@/lib/pipeline';
import { getCachedMovie, setCachedMovie } from '@/lib/pipeline/cache';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 60;

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

    // ── Check cache first ──
    const cacheKey = `tmdb:${tmdbId}`;
    const cached = getCachedMovie(cacheKey);

    if (cached) {
      console.log(`[API /movies] Cache hit for tmdb:${tmdbId}`);
      return NextResponse.json(cached.movie);
    }

    // ── Not cached — return TMDb data immediately (fast ~2-3s) ──
    console.log(`[API /movies] Cache miss for tmdb:${tmdbId}, fetching from TMDb`);

    // Try BOTH movie and TV endpoints in parallel — TMDb IDs are namespace-separated
    const [movieData, tvData] = await Promise.all([
      TMDb.getMovieDetails(tmdbId).catch(() => null),
      TMDb.getTvDetails(tmdbId).catch(() => null),
    ]);

    // Prefer movie result, fall back to TV
    const movie = movieData || tvData;

    if (movie) {
      // Cache the TMDb result
      setCachedMovie(cacheKey, movie, ['TMDb'], 30);
      setCachedMovie(`slug:${movie.slug}`, movie, ['TMDb'], 30);

      // Run full pipeline in background (fire-and-forget)
      const mediaType = movie.media_type as 'movie' | 'tv' | undefined;
      getMovie(tmdbId, mediaType ? { mediaType } : {}).then(result => {
        if (result.completeness > 0 && result.movie.title) {
          setCachedMovie(cacheKey, result.movie, result.sources, result.completeness);
          setCachedMovie(`slug:${result.movie.slug}`, result.movie, result.sources, result.completeness);
        }
      }).catch(() => {});

      return NextResponse.json(movie);
    }

    return NextResponse.json(
      { error: `Movie with TMDb ID ${tmdbId} not found.` },
      { status: 404 },
    );
  } catch (error: any) {
    console.error('[API /movies] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get movie', details: error.message },
      { status: 500 },
    );
  }
}
