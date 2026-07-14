import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getSceneComments, addSceneComment } from '@/lib/db';

/**
 * GET /api/scene-comments?movie_id=...
 * POST /api/scene-comments
 *   body: { movie_id, timestamp_sec, body, spoiler }
 *
 * F12 — Scene-timeline comments: comments pinned to a specific timestamp in
 * a film. UI lives in a separate page; this is the data API.
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const movieId = parseInt(url.searchParams.get('movie_id') ?? '0', 10);
  if (!movieId) return NextResponse.json({ error: 'movie_id required' }, { status: 400 });

  const comments = await getSceneComments(movieId);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { movie_id, timestamp_sec, body, spoiler } = await req.json();
  if (!movie_id || timestamp_sec == null || !body) {
    return NextResponse.json({ error: 'movie_id, timestamp_sec, body required' }, { status: 400 });
  }
  const c = await addSceneComment(profile.id, { movie_id, timestamp_sec, body, spoiler: !!spoiler });
  return NextResponse.json({ comment: c });
}
