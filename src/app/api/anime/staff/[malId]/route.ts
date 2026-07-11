/**
 * GET /api/anime/staff/[malId]
 *
 * Fetch anime staff + voice actors from Jikan/MAL.
 * Used on person biography pages to show anime-specific credits.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as Jikan from '@/lib/pipeline/clients/jikan';

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ malId: string }> },
) {
  try {
    const { malId } = await params;
    const id = parseInt(malId, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid MAL anime ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    const [staff, voiceActors] = await Promise.all([
      Jikan.getAnimeStaff(id),
      Jikan.getAnimeVoiceActors(id),
    ]);

    return NextResponse.json({ staff, voiceActors });
  } catch (error: any) {
    console.error('[API /anime/staff] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anime staff', details: error.message },
      { status: 500 },
    );
  }
}
