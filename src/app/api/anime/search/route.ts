import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/pipeline';

/**
 * GET /api/anime/search?q=...
 * Search anime using AniList + TMDb.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 },
      );
    }

    const result = await searchAnime(query.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /anime/search] Error:', error);
    return NextResponse.json(
      { error: 'Anime search failed', details: error.message },
      { status: 500 },
    );
  }
}
