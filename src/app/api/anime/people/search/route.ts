/**
 * GET /api/anime/people/search?q=query&page=1
 *
 * Search for anime people (voice actors, directors, etc.) via Jikan/MAL.
 * Returns people with their MAL profiles.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as Jikan from '@/lib/pipeline/clients/jikan';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required.' },
        { status: 400 },
      );
    }

    const results = await Jikan.searchPeople(query, page);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[API /anime/people/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search anime people', details: error.message },
      { status: 500 },
    );
  }
}
