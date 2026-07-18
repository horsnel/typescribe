/**
 * GET /api/people/popular?page=1
 *
 * Fetch popular people from TMDb (trending actors, directors, etc.)
 *
 * Filters out people who have no profile_path (no photo available) and
 * backfills from subsequent pages so callers always get a full set of
 * people-with-photos. This prevents the "blank avatar" UX in the homepage
 * Popular People carousel.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import type { PersonSearchResult } from '@/lib/types';

export const maxDuration = 30;

const TARGET_PAGE_SIZE = 20;
const MAX_PAGES_TO_FETCH = 5;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startPage = parseInt(searchParams.get('page') || '1', 10);

    const collected: PersonSearchResult[] = [];
    let totalResults = 0;
    let lastSeenTotalPages = 0;

    for (let offset = 0; offset < MAX_PAGES_TO_FETCH; offset += 1) {
      const page = startPage + offset;
      const results = await TMDb.getPopularPeople(page);
      if (!results) break;

      lastSeenTotalPages = results.total_pages || lastSeenTotalPages;
      totalResults = results.total_results || totalResults;

      const withPhoto = (results.results || []).filter((p) => {
        // TMDb returns either a full URL (after our client mapping) or
        // empty string when profile_path was null. Treat empty/missing
        // paths as "no photo".
        return Boolean(p.profile_path) && p.profile_path.trim() !== '';
      });
      collected.push(...withPhoto);

      if (collected.length >= TARGET_PAGE_SIZE) break;
      if (page >= lastSeenTotalPages) break;
    }

    const trimmed = collected.slice(0, TARGET_PAGE_SIZE);

    return NextResponse.json({
      page: startPage,
      results: trimmed,
      total_results: totalResults,
      total_pages: Math.max(1, lastSeenTotalPages),
      filtered: true,
    });
  } catch (error: any) {
    console.error('[API /people/popular] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular people', details: error.message },
      { status: 500 },
    );
  }
}
