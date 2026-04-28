/**
 * GET /api/anime/[id]/recommendations
 *
 * Fetch anime recommendations by MAL ID using the Jikan API.
 * Returns { recommendations }.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAnimeRecommendations } from '@/lib/pipeline/clients/jikan';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const malId = parseInt(id, 10);

    if (isNaN(malId) || malId <= 0) {
      return NextResponse.json(
        { error: 'Invalid MAL ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    const recommendations = await getAnimeRecommendations(malId);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('[API /anime/[id]/recommendations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anime recommendations', details: error.message },
      { status: 500 },
    );
  }
}
