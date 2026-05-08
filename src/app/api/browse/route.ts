/**
 * GET /api/browse
 *
 * Browse/discover movies and TV shows using TMDb discover API.
 * Supports filtering by format, country, genre, theme, rating, year, and sort.
 * For anime format, falls back to AniList/Jikan when TMDb returns 0 results.
 *
 * Query params:
 *   format    – "movie" | "tv" | "anime" | "all" (default: "movie")
 *   country   – ISO 3166-1 alpha-2 code or "all" (default: "all")
 *   genres    – comma-separated genre IDs (e.g. "28,12,16")
 *   theme     – TMDb keyword ID for thematic filtering
 *   sort      – TMDb sort string (default: "popularity.desc")
 *   minRating – minimum vote average (0-10)
 *   yearFrom  – start year filter
 *   yearTo    – end year filter
 *   page      – page number (default: 1)
 */
import { NextRequest, NextResponse } from 'next/server';
import { browseMovies, searchAnime, getTrending, getTopRated, getNowPlaying, getUpcoming } from '@/lib/pipeline';
import type { Movie, MediaFormat } from '@/lib/types';
import { apiLimiter } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetIn } = apiLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: resetIn }, { status: 429 });
    }

    const { searchParams } = request.nextUrl;

    // ── Parse source param (trending / top_rated / now_playing) ──
    const source = searchParams.get('source');

    // ── Parse format ──
    const formatRaw = searchParams.get('format') || 'movie';
    const validFormats: MediaFormat[] = ['movie', 'tv', 'anime', 'all'];
    const format: MediaFormat = validFormats.includes(formatRaw as MediaFormat)
      ? (formatRaw as MediaFormat)
      : 'movie';

    // ── Parse genres (comma-separated IDs → number[]) ──
    const genresRaw = searchParams.get('genres');
    const genreIds: number[] = genresRaw
      ? genresRaw
          .split(',')
          .map(g => parseInt(g.trim(), 10))
          .filter(n => !isNaN(n) && n > 0)
      : [];

    // ── Parse theme (keyword ID) ──
    const themeRaw = searchParams.get('theme');
    const themeKeywordId = themeRaw ? parseInt(themeRaw, 10) : null;

    // ── Parse numeric filters ──
    const minRating = parseFloat(searchParams.get('minRating') || '0') || 0;
    const yearFrom = parseInt(searchParams.get('yearFrom') || '0', 10) || undefined;
    const yearTo = parseInt(searchParams.get('yearTo') || '0', 10) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;

    // ── Parse sort & country ──
    const sort = searchParams.get('sort') || 'popularity.desc';
    const country = searchParams.get('country') || 'all';

    // ── Handle source-based shortcuts (trending, top_rated, now_playing) ──
    let result;

    if (source === 'trending') {
      console.log('[API /browse] Fetching trending');
      result = await getTrending('week');
    } else if (source === 'top_rated') {
      console.log('[API /browse] Fetching top rated', { page });
      result = await getTopRated(page);
    } else if (source === 'now_playing') {
      console.log('[API /browse] Fetching now playing', { page });
      result = await getNowPlaying(page);
    } else if (source === 'upcoming') {
      console.log('[API /browse] Fetching upcoming', { page });
      result = await getUpcoming(page);
    } else {
      // ── Call browseMovies ──
      console.log('[API /browse] Browsing movies', {
        format, country, genreIds, themeKeywordId, sort, minRating, yearFrom, yearTo, page,
      });

      result = await browseMovies({
        format,
        country,
        genreIds,
        themeKeywordId,
        sort,
        minRating: minRating > 0 ? minRating : undefined,
        yearFrom,
        yearTo,
        page,
      });
    }

    // ── Free-tier fallback: If TMDb returned 0 results for ANY format, try free sources ──
    if (result.movies.length === 0) {
      console.log('[API /browse] TMDb returned 0 results. Falling back to free-tier sources...');

      try {
        const { freeTierBrowse } = await import('@/lib/pipeline/free-tier');
        const fallbackResult = await freeTierBrowse({
          format: format,
          genreIds: genreIds,
          sort: sort,
          page: page,
        });
        if (fallbackResult.movies.length > 0) {
          result = {
            movies: fallbackResult.movies,
            page: fallbackResult.page,
            totalPages: fallbackResult.totalPages,
            totalResults: fallbackResult.totalResults,
            sources: ['AniList', 'Jikan', 'TVMaze'],
            durationMs: result.durationMs,
          };
        }
      } catch (err) {
        console.warn('[API /browse] Free-tier fallback failed:', err);
      }
    }

    return NextResponse.json({
      ...result,
      fromAPI: result.sources.length > 0,
    });
  } catch (error: any) {
    console.error('[API /browse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to browse movies', details: error.message },
      { status: 500 },
    );
  }
}
