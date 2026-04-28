/**
 * GET /api/movies/slug/[slug]
 *
 * Get a single movie by its URL slug.
 * Returns just the Movie object, or 404 if not found.
 *
 * The slug is a URL-friendly identifier like "the-dark-knight-155".
 * Currently only resolves slugs that are already in the cache;
 * slug-based TMDb search is not supported.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMovieBySlug } from '@/lib/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // ── Validate slug ──
    if (!slug || slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'Slug parameter is required.' },
        { status: 400 },
      );
    }

    const trimmedSlug = slug.trim();

    console.log(`[API /movies/slug] Looking up slug: "${trimmedSlug}"`);

    // ── Try to resolve by slug ──
    const result = await getMovieBySlug(trimmedSlug);

    if (!result) {
      return NextResponse.json(
        { error: `Movie with slug "${trimmedSlug}" not found.` },
        { status: 404 },
      );
    }

    // Return the full result so frontend can access movie, sources, completeness
    return NextResponse.json({
      movie: result.movie,
      sources: result.sources,
      completeness: result.completeness,
    });
  } catch (error: any) {
    console.error('[API /movies/slug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get movie by slug', details: error.message },
      { status: 500 },
    );
  }
}
