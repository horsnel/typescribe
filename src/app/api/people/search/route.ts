/**
 * GET /api/people/search?q=query&page=1
 *
 * Search for people by name via TMDb.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

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

    const results = await TMDb.searchPeople(query, page);

    if (!results) {
      return NextResponse.json({ results: [], total_results: 0, total_pages: 0 });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[API /people/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search people', details: error.message },
      { status: 500 },
    );
  }
}
