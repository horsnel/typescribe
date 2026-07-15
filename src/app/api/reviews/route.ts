import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createReview, getReviewsByMovie, getReviewsByUser, getPublicReviewsByUser } from '@/lib/db';

/**
 * GET /api/reviews                  — list the current user's reviews (auth required)
 * GET /api/reviews?movie_id=<id>    — list reviews for a specific movie (public)
 * GET /api/reviews?user_id=<id>     — list reviews by a specific user (public;
 *                                     used by public profile pages)
 *
 * POST /api/reviews                 — create a new review (auth required)
 *   body: { movie_id, movie_title, rating, title?, body?, spoiler?, genres?, release_year? }
 *
 * The route uses getCurrentProfile() to resolve the Supabase UUID server-side
 * for the auth-scoped list and for writes, so client-sent user IDs are
 * ignored on those paths. The ?movie_id and ?user_id paths are intentionally
 * public (no auth required) so they can be consumed by public movie/profile
 * pages.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const movieIdParam = url.searchParams.get('movie_id');
    const userIdParam = url.searchParams.get('user_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 100);

    if (movieIdParam) {
      const movieId = parseInt(movieIdParam, 10);
      if (!Number.isFinite(movieId)) {
        return NextResponse.json({ error: 'movie_id must be an integer' }, { status: 400 });
      }
      const reviews = await getReviewsByMovie(movieId, limit);
      return NextResponse.json({ reviews });
    }

    if (userIdParam) {
      // Basic UUID shape validation — Supabase user IDs are UUIDs.
      // Reject anything that's clearly not a UUID to avoid Postgres errors.
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userIdParam)) {
        return NextResponse.json({ error: 'user_id must be a valid UUID' }, { status: 400 });
      }
      const reviews = await getPublicReviewsByUser(userIdParam, limit);
      return NextResponse.json({ reviews });
    }

    // List current user's reviews (auth required)
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const reviews = await getReviewsByUser(profile.id, limit);
    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error('[API /reviews] GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { movie_id, movie_title, rating, title, body: reviewBody, spoiler, genres, release_year } = body ?? {};

    if (!Number.isFinite(movie_id) || movie_id <= 0) {
      return NextResponse.json({ error: 'movie_id is required (must be a positive integer)' }, { status: 400 });
    }
    if (!movie_title || typeof movie_title !== 'string') {
      return NextResponse.json({ error: 'movie_title is required' }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
      return NextResponse.json({ error: 'rating is required and must be between 0 and 10' }, { status: 400 });
    }

    const review = await createReview(profile.id, {
      movie_id: Math.floor(movie_id),
      movie_title: movie_title.trim(),
      rating: Number(rating),
      title: typeof title === 'string' ? title.trim().slice(0, 200) : '',
      body: typeof reviewBody === 'string' ? reviewBody.trim().slice(0, 10000) : '',
      spoiler: Boolean(spoiler),
      genres: Array.isArray(genres) ? genres.slice(0, 20) : null,
      release_year: Number.isFinite(release_year) ? Math.floor(release_year) : null,
    });

    if (!review) {
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }
    return NextResponse.json({ review }, { status: 201 });
  } catch (err: any) {
    console.error('[API /reviews] POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
