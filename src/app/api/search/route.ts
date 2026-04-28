/**
 * GET /api/search
 *
 * Search for movies and TV shows by query string.
 * Uses TMDb multi-search under the hood.
 *
 * Query params:
 *   q – search query string (required, min 1 character)
 */
import { NextRequest, NextResponse } from 'next/server';
import { searchMovies } from '@/lib/pipeline';
import { searchLimiter } from '@/lib/rate-limit';

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

    // ── Validate query ──
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required.' },
        { status: 400 },
      );
    }

    const trimmedQuery = query.trim();

    console.log(`[API /search] Searching for: "${trimmedQuery}"`);

    const result = await searchMovies(trimmedQuery);

    return NextResponse.json({ ...result, fromAPI: result.sources.length > 0 });
  } catch (error: any) {
    console.error('[API /search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 },
    );
  }
}
