import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, deleteDiaryEntry, updateDiary } from '@/lib/db';

/**
 * DELETE /api/diary/[id]  — delete one of the current user's diary entries.
 *
 * PUT    /api/diary/[id]  — edit one of the current user's diary entries.
 *   body: {
 *     watched_on?, rating?, rewatch?, location?, notes?,
 *     poster_path?, genres?, release_year?
 *   }
 *   Only the supplied fields are written (partial update). Field-name
 *   translation (`notes` → `review_text`, `poster_path` → `movie_poster`)
 *   happens inside updateDiary() in src/lib/db.ts.
 *
 * Both routes use getCurrentProfile() to resolve the Supabase UUID server-side,
 * then operate only if the row's `user_id` matches (RLS-equivalent check).
 * Returns 404 if the row doesn't exist or doesn't belong to the caller.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing diary entry id' }, { status: 400 });
    }

    const ok = await deleteDiaryEntry(id, profile.id);
    if (!ok) {
      return NextResponse.json(
        { error: 'Diary entry not found or not owned by current user' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('[API /diary/[id]] DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing diary entry id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build the patch — only fields the caller explicitly supplied. This lets
    // callers do partial updates (e.g. just fix the rating) without re-sending
    // the entire entry.
    const updates: {
      watched_on?: string;
      rating?: number | null;
      rewatch?: boolean;
      location?: string | null;
      notes?: string | null;
      poster_path?: string | null;
      genres?: string[] | null;
      release_year?: number | null;
    } = {};

    if (body.watched_on !== undefined) {
      if (typeof body.watched_on !== 'string' || Number.isNaN(Date.parse(body.watched_on))) {
        return NextResponse.json({ error: 'watched_on must be a valid ISO date' }, { status: 400 });
      }
      updates.watched_on = body.watched_on.slice(0, 10); // YYYY-MM-DD
    }
    if (body.rating !== undefined) {
      // Diary ratings are nullable; allow null to clear the rating
      if (body.rating === null) {
        updates.rating = null;
      } else {
        const r = Number(body.rating);
        if (!Number.isFinite(r) || r < 0 || r > 10) {
          return NextResponse.json({ error: 'rating must be between 0 and 10 (or null)' }, { status: 400 });
        }
        updates.rating = r;
      }
    }
    if (body.rewatch !== undefined) {
      updates.rewatch = Boolean(body.rewatch);
    }
    if (body.location !== undefined) {
      updates.location = typeof body.location === 'string' ? body.location.slice(0, 200) : null;
    }
    if (body.notes !== undefined) {
      updates.notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : null;
    }
    if (body.poster_path !== undefined) {
      updates.poster_path = typeof body.poster_path === 'string' ? body.poster_path.slice(0, 500) : null;
    }
    if (body.genres !== undefined) {
      updates.genres = Array.isArray(body.genres) ? body.genres.slice(0, 20) : null;
    }
    if (body.release_year !== undefined) {
      updates.release_year = Number.isFinite(body.release_year) ? Math.floor(body.release_year) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 });
    }

    const entry = await updateDiary(id, profile.id, updates);
    if (!entry) {
      return NextResponse.json(
        { error: 'Diary entry not found or not owned by current user' },
        { status: 404 },
      );
    }
    return NextResponse.json({ entry });
  } catch (err: any) {
    console.error('[API /diary/[id]] PUT error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
