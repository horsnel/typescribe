/**
 * GET /api/anime/[id]
 *
 * Fetch anime details and characters by MAL ID using the Jikan API.
 * Returns { anime, characters }.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAnimeDetails, getAnimeCharacters } from '@/lib/pipeline/clients/jikan';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Parse & validate MAL ID ──
    const { id } = await params;
    const malId = parseInt(id, 10);

    if (isNaN(malId) || malId <= 0) {
      return NextResponse.json(
        { error: 'Invalid MAL ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    // ── Fetch details and characters in parallel ──
    const [anime, characters] = await Promise.all([
      getAnimeDetails(malId),
      getAnimeCharacters(malId),
    ]);

    if (!anime) {
      return NextResponse.json(
        { error: `Anime with MAL ID ${malId} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ anime, characters });
  } catch (error: any) {
    console.error('[API /anime/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anime data', details: error.message },
      { status: 500 },
    );
  }
}
