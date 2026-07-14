import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getWatchParties, getWatchParty, createWatchParty, rsvpWatchParty, getWatchPartyChat, sendWatchPartyChat, unlockAchievement } from '@/lib/db';

/**
 * GET /api/watch-parties              — list upcoming
 * GET /api/watch-parties?id=...       — single party + chat
 * POST /api/watch-parties             — create
 *   body: { action: 'create', movie_id, movie_title, poster_path, scheduled_for }
 *   body: { action: 'rsvp', party_id, rsvp }
 *   body: { action: 'chat', party_id, body, timestamp_sec? }
 */

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    const [party, chat] = await Promise.all([
      getWatchParty(id),
      getWatchPartyChat(id, 200),
    ]);
    if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ party, chat });
  }

  const parties = await getWatchParties(30);
  return NextResponse.json({ parties });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  if (body.action === 'create') {
    const party = await createWatchParty(profile.id, {
      movie_id: body.movie_id,
      movie_title: body.movie_title,
      poster_path: body.poster_path ?? null,
      scheduled_for: body.scheduled_for,
    });
    if (party) await unlockAchievement(profile.id, 'watch_party_host');
    return NextResponse.json({ party });
  }

  if (body.action === 'rsvp') {
    await rsvpWatchParty(body.party_id, profile.id, body.rsvp);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'chat') {
    const msg = await sendWatchPartyChat(body.party_id, profile.id, body.body, body.timestamp_sec ?? null);
    return NextResponse.json({ message: msg });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
