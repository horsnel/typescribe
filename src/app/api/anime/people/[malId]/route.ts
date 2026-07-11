/**
 * GET /api/anime/people/[malId]
 *
 * Fetch anime person details from Jikan/MAL.
 * Includes biography, birthday, favourites, etc.
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
        { error: 'Invalid MAL person ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    const person = await Jikan.getPersonDetails(id);

    if (!person) {
      return NextResponse.json(
        { error: `Person with MAL ID ${id} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ person });
  } catch (error: any) {
    console.error('[API /anime/people] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person', details: error.message },
      { status: 500 },
    );
  }
}
