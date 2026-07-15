import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, deleteReview, updateReview } from '@/lib/db';

/**
 * DELETE /api/reviews/[id]  — delete one of the current user's reviews.
 *
 * PUT    /api/reviews/[id]  — edit one of the current user's reviews.
 *   body: { rating?, title?, body?, spoiler?, genres?, release_year? }
 *   Only the supplied fields are written; `updated_at` is bumped automatically.
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
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
    }

    const ok = await deleteReview(id, profile.id);
    if (!ok) {
      return NextResponse.json(
        { error: 'Review not found or not owned by current user' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('[API /reviews/[id]] DELETE error:', err);
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
      return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build the patch — only fields the caller explicitly supplied. This lets
    // callers do partial updates (e.g. just fix a typo in `body`) without
    // having to re-send the entire review.
    const updates: {
      rating?: number;
      title?: string | null;
      body?: string | null;
      spoiler?: boolean;
      genres?: string[] | null;
      release_year?: number | null;
    } = {};

    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isFinite(r) || r < 0 || r > 10) {
        return NextResponse.json({ error: 'rating must be between 0 and 10' }, { status: 400 });
      }
      updates.rating = r;
    }
    if (body.title !== undefined) {
      updates.title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : null;
    }
    if (body.body !== undefined) {
      updates.body = typeof body.body === 'string' ? body.body.trim().slice(0, 10000) : null;
    }
    if (body.spoiler !== undefined) {
      updates.spoiler = Boolean(body.spoiler);
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

    const review = await updateReview(id, profile.id, updates);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found or not owned by current user' },
        { status: 404 },
      );
    }
    return NextResponse.json({ review });
  } catch (err: any) {
    console.error('[API /reviews/[id]] PUT error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
