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
 * Region-aware: the source title's original language / origin countries are
 * used to filter the result set — an Indian (hi/ta/te…) title only gets
 * same-language recommendations (never American, never cross-language), a
 * British title gets British recs, an American title American recs, and a
 * Japanese anime only gets Japanese recs.
 *
 * Sources merged and deduplicated by TMDb ID, ranked by composite score.
 * Results are cached in-memory per serverless instance (fast tier 6h /
 * enriched tier 12h) so repeat visits and page switches are instant.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/pipeline/recommendations';
import * as TMDb from '@/lib/pipeline/clients/tmdb';

export const maxDuration = 30; // Vercel function timeout (seconds)

// ─── In-memory result cache (per serverless instance) ───────────────────────

interface RecsCacheEntry {
  recommendations: unknown[];
  sources: string[];
  cachedAt: number;
}

const recsCache = new Map<string, RecsCacheEntry>();
const RECS_FAST_TTL = 6 * 3600 * 1000;    // 6h for TMDb-only tier
const RECS_ENRICHED_TTL = 12 * 3600 * 1000; // 12h for full pipeline

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

    const cacheKey = `${tmdbId}:${mediaType}:${wantEnriched ? 'e' : 'f'}`;
    const ttl = wantEnriched ? RECS_ENRICHED_TTL : RECS_FAST_TTL;

    // ── Serve from in-memory cache when available ──
    const cachedEntry = recsCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.cachedAt < ttl) {
      return NextResponse.json({
        recommendations: cachedEntry.recommendations,
        sources: cachedEntry.sources,
        enriched: wantEnriched,
        fromCache: true,
      }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
    }

    // Get source context (title for scraper-based sources, language/countries
    // for region-aware filtering, year/genre for ranking + backfill)
    let movieTitle: string | undefined;
    let sourceLanguage: string | undefined;
    let sourceCountries: string[] = [];
    let sourceYear: number | undefined;
    let primaryGenreId: number | undefined;
    try {
      const details = mediaType === 'tv' || mediaType === 'anime'
        ? await TMDb.getTvDetails(tmdbId)
        : await TMDb.getMovieDetails(tmdbId);
      movieTitle = details?.title || details?.original_title;
      sourceLanguage = details?.original_language || undefined;
      sourceCountries = (
        details?.origin_countries ??
        (details?.origin_country ? [details.origin_country] : [])
      ).filter(Boolean);
      primaryGenreId = details?.genres?.[0]?.id;
      if (details?.release_date) {
        const y = parseInt(details.release_date.split('-')[0], 10);
        if (Number.isFinite(y)) sourceYear = y;
      }
    } catch { /* ignore — enrichment sources will just be skipped */ }

    const result = await getRecommendations(
      tmdbId,
      movieTitle,
      mediaType,
      wantEnriched,
      { language: sourceLanguage, countries: sourceCountries, year: sourceYear, primaryGenreId },
    );

    // Cache the result (only if we actually got recommendations)
    if (result.recommendations.length > 0) {
      recsCache.set(cacheKey, {
        recommendations: result.recommendations,
        sources: result.sources,
        cachedAt: Date.now(),
      });
      // Opportunistic cleanup of stale entries
      if (recsCache.size > 500) {
        const now = Date.now();
        for (const [k, v] of recsCache) {
          if (now - v.cachedAt > RECS_ENRICHED_TTL) recsCache.delete(k);
        }
      }
    }

    return NextResponse.json({
      recommendations: result.recommendations,
      sources: result.sources,
      enriched: wantEnriched,
    }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch (error: any) {
    console.error('[API /movies/[id]/recommendations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: error.message },
      { status: 500 },
    );
  }
}
