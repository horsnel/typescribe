/**
 * GET /api/people/[id]
 *
 * Fetch person details + combined credits from TMDb.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId) || personId <= 0) {
      return NextResponse.json(
        { error: 'Invalid person ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    // Fetch person details and credits in parallel
    const [person, credits] = await Promise.all([
      TMDb.getPersonDetails(personId),
      TMDb.getPersonCredits(personId),
    ]);

    if (!person) {
      return NextResponse.json(
        { error: `Person with ID ${personId} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      person,
      credits: credits ?? { cast: [], crew: [] },
    });
  } catch (error: any) {
    console.error('[API /people] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person', details: error.message },
      { status: 500 },
    );
  }
}
