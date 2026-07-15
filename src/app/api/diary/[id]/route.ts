import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, deleteDiaryEntry } from '@/lib/db';

/**
 * DELETE /api/diary/[id]  — delete one of the current user's diary entries.
 *
 * Uses getCurrentProfile() to resolve the Supabase UUID, then deletes only if
 * the row's `user_id` matches. Returns 404 if the row doesn't exist or doesn't
 * belong to the caller.
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
