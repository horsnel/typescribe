import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, checkIn } from '@/lib/db';

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    currentStreak: profile.streak_count,
    longestStreak: profile.longest_streak,
    lastCheckIn: profile.last_check_in,
    canCheckInToday: profile.last_check_in !== new Date().toISOString().slice(0, 10),
  });
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await checkIn(profile.id);
  return NextResponse.json(result);
}
