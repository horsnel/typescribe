/**
 * GET /api/movies/[id]/watch-providers
 *
 * Returns the watch/streaming providers for a given movie TMDb ID.
 * Uses the getMovieWatchProviders function from the streaming client.
 *
 * Query params:
 *   id – TMDb movie ID (from URL path)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovieWatchProviders } from '@/lib/pipeline/clients/streaming';

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

    console.log(`[API /watch-providers] Fetching providers for movie ${tmdbId}`);

    const result = await getMovieWatchProviders(tmdbId);

    if (!result) {
      return NextResponse.json(
        { error: `Watch providers not found for movie with TMDb ID ${tmdbId}.` },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /watch-providers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get watch providers', details: error.message },
      { status: 500 },
    );
  }
}
