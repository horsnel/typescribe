import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, logDiary, getDiary } from '@/lib/db';

/**
 * GET /api/diary         — list the current user's watch diary
 * GET /api/diary?limit=N — limit (default 100, max 200)
 *
 * POST /api/diary        — log a new diary entry
 *   body: {
 *     movie_id, movie_title, poster_path?, watched_on?, rating?,
 *     rewatch?, location?, notes?, genres?, release_year?
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 200);
    const entries = await getDiary(profile.id, limit);
    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error('[API /diary] GET error:', err);
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

    const {
      movie_id, movie_title, poster_path, watched_on, rating,
      rewatch, location, notes, genres, release_year,
    } = body ?? {};

    if (!Number.isFinite(movie_id) || movie_id <= 0) {
      return NextResponse.json({ error: 'movie_id is required (must be a positive integer)' }, { status: 400 });
    }
    if (!movie_title || typeof movie_title !== 'string') {
      return NextResponse.json({ error: 'movie_title is required' }, { status: 400 });
    }
    if (rating != null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) {
      return NextResponse.json({ error: 'rating must be between 0 and 10 (or null)' }, { status: 400 });
    }
    if (watched_on != null && Number.isNaN(Date.parse(watched_on))) {
      return NextResponse.json({ error: 'watched_on must be a valid ISO date' }, { status: 400 });
    }

    const entry = await logDiary(profile.id, {
      movie_id: Math.floor(movie_id),
      movie_title: movie_title.trim(),
      poster_path: typeof poster_path === 'string' ? poster_path : null,
      watched_on: typeof watched_on === 'string' ? watched_on : undefined,
      rating: rating != null ? Number(rating) : null,
      rewatch: Boolean(rewatch),
      location: typeof location === 'string' ? location.slice(0, 200) : null,
      notes: typeof notes === 'string' ? notes.slice(0, 5000) : null,
      genres: Array.isArray(genres) ? genres.slice(0, 20) : null,
      release_year: Number.isFinite(release_year) ? Math.floor(release_year) : null,
    });

    if (!entry) {
      return NextResponse.json({ error: 'Failed to create diary entry' }, { status: 500 });
    }
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: any) {
    console.error('[API /diary] POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
