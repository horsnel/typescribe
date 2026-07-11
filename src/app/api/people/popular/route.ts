/**
 * GET /api/people/popular?page=1
 *
 * Fetch popular people from TMDb (trending actors, directors, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const results = await TMDb.getPopularPeople(page);

    if (!results) {
      return NextResponse.json({ results: [], total_results: 0, total_pages: 0 });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[API /people/popular] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular people', details: error.message },
      { status: 500 },
    );
  }
}
