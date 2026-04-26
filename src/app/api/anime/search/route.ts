import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/pipeline';
import { searchLimiter } from '@/lib/rate-limit';

/**
 * GET /api/anime/search?q=...
 * Search anime using AniList + TMDb.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetIn } = searchLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: resetIn }, { status: 429 });
    }

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
