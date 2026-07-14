import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, getUserAchievements, getAllAchievements, checkAndUnlockAchievements } from '@/lib/db';

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [userAch, allAch] = await Promise.all([
    getUserAchievements(profile.id),
    getAllAchievements(),
  ]);
  const unlockedCodes = new Set(userAch.map(ua => ua.achievement?.code));
  return NextResponse.json({
    unlocked: userAch,
    available: allAch,
    lockedCodes: allAch.filter(a => !unlockedCodes.has(a.code)).map(a => a.code),
    totalXp: profile.xp,
  });
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await checkAndUnlockAchievements(profile.id);
  return NextResponse.json({ ok: true });
}
