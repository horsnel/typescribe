/**
 * GET /api/browse
 *
 * Browse/discover movies and TV shows using TMDb discover API.
 * Supports filtering by format, country, genre, theme, rating, year, and sort.
 *
 * Query params:
 *   format    – "movie" | "tv" | "all" (default: "movie")
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
import { browseMovies } from '@/lib/pipeline';
import type { MediaFormat } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

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

    // ── Call browseMovies ──
    console.log('[API /browse] Browsing movies', {
      format, country, genreIds, themeKeywordId, sort, minRating, yearFrom, yearTo, page,
    });

    const result = await browseMovies({
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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /browse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to browse movies', details: error.message },
      { status: 500 },
    );
  }
}
