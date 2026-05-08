/**
 * GET /api/movies/[id]/recommendations
 *
 * Multi-source recommendation pipeline.
 *
 * Strategy (two-tier response):
 *   1. FAST mode (default): Returns TMDb recommendations + similar (~2-3s)
 *   2. ENRICHED mode (?enriched=true): Full pipeline with Letterboxd, RT,
 *      AniList, Jikan (~5-15s)
 *
 * Sources merged and deduplicated by TMDb ID, ranked by composite score.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/pipeline/recommendations';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 30; // Vercel function timeout (seconds)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: 'Invalid TMDb ID. Must be a positive integer.' },
        { status: 400 },
      );
    }

    const wantEnriched = request.nextUrl.searchParams.get('enriched') === 'true';
    const mediaType = (request.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'anime';

    // Get movie title for scraper-based sources
    let movieTitle: string | undefined;
    try {
      const details = mediaType === 'tv' || mediaType === 'anime'
        ? await TMDb.getTvDetails(tmdbId)
        : await TMDb.getMovieDetails(tmdbId);
      movieTitle = details?.title || details?.original_title;
    } catch { /* ignore — enrichment sources will just be skipped */ }

    const result = await getRecommendations(
      tmdbId,
      movieTitle,
      mediaType,
      wantEnriched,
    );

    return NextResponse.json({
      recommendations: result.recommendations,
      sources: result.sources,
      enriched: wantEnriched,
    });
  } catch (error: any) {
    console.error('[API /movies/[id]/recommendations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: error.message },
      { status: 500 },
    );
  }
}
