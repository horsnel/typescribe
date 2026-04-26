/**
 * GET /api/discover/local
 *
 * Discover movies based on the user's country/region.
 * Uses TMDb discover API with country and language filters.
 *
 * Query params:
 *   countryCode – ISO 3166-1 alpha-2 country code (required)
 *   page        – page number (optional, default 1)
 */
import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTv } from '@/lib/pipeline/clients/tmdb';
import { getCountryDiscoverParams } from '@/lib/geolocation';
import type { Movie } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const countryCode = searchParams.get('countryCode')?.trim().toUpperCase();
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Query parameter "countryCode" is required.' },
        { status: 400 },
      );
    }

    console.log(`[API /discover/local] Discovering content for country: ${countryCode}, page: ${page}`);

    const discoverParams = getCountryDiscoverParams(countryCode);

    // Fetch movies and TV shows in parallel
    const [movieResult, tvResult] = await Promise.all([
      discoverMovies({
        with_origin_country: discoverParams.with_origin_country,
        with_original_language: discoverParams.with_original_language,
        sort_by: discoverParams.sort_by || 'popularity.desc',
        page,
        'vote_count.gte': 20,
      }),
      discoverTv({
        with_origin_country: discoverParams.with_origin_country,
        with_original_language: discoverParams.with_original_language,
        sort_by: discoverParams.sort_by || 'popularity.desc',
        page,
        'vote_count.gte': 20,
      }),
    ]);

    const movies: Movie[] = [];
    const seenIds = new Set<number>();

    // Add movies
    for (const m of movieResult?.results || []) {
      if (!seenIds.has(m.tmdb_id)) {
        movies.push(m);
        seenIds.add(m.tmdb_id);
      }
    }

    // Add TV shows (deduplicated)
    for (const m of tvResult?.results || []) {
      if (!seenIds.has(m.tmdb_id)) {
        movies.push(m);
        seenIds.add(m.tmdb_id);
      }
    }

    // If no country-specific results, fall back to popular movies
    if (movies.length === 0) {
      console.log(`[API /discover/local] No country-specific results for ${countryCode}, falling back to popular`);
      const popularResult = await discoverMovies({
        sort_by: 'popularity.desc',
        page,
        'vote_count.gte': 100,
      });

      for (const m of popularResult?.results || []) {
        movies.push(m);
      }
    }

    return NextResponse.json({
      movies,
      countryCode,
      page: movieResult?.page || page,
      totalPages: Math.max(movieResult?.total_pages || 1, tvResult?.total_pages || 1),
      totalResults: (movieResult?.total_results || 0) + (tvResult?.total_results || 0),
      fromAPI: true,
    });
  } catch (error: any) {
    console.error('[API /discover/local] Error:', error);
    return NextResponse.json(
      { error: 'Failed to discover local content', details: error.message },
      { status: 500 },
    );
  }
}
