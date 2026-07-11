/**
 * GET /api/people/[id]/jikan
 *
 * Cross-reference a TMDB person with Jikan/MAL person data.
 * Searches Jikan by name and returns the best match with anime staff details.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as Jikan from '@/lib/pipeline/clients/jikan';
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
      return NextResponse.json({ error: 'Invalid person ID.' }, { status: 400 });
    }

    // Get TMDB person details to find their name
    const person = await TMDb.getPersonDetails(personId);
    if (!person) {
      return NextResponse.json({ error: 'Person not found on TMDB.' }, { status: 404 });
    }

    // Search Jikan for this person
    const jikanResults = await Jikan.searchPeople(person.name, 1);

    if (jikanResults.length === 0) {
      return NextResponse.json({ jikanPerson: null, message: 'No MAL match found.' });
    }

    // Return the top match
    const topMatch = jikanResults[0];

    // Try to get full details
    const jikanDetails = await Jikan.getPersonDetails(topMatch.malId);

    return NextResponse.json({
      jikanPerson: jikanDetails ?? topMatch,
      matchConfidence: topMatch.name.toLowerCase() === person.name.toLowerCase() ? 'high' : 'medium',
    });
  } catch (error: any) {
    console.error('[API /people/jikan] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cross-reference', details: error.message },
      { status: 500 },
    );
  }
}
