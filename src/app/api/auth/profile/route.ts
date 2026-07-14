import { NextRequest, NextResponse } from 'next/server';
import { getProfileByEmail, updateProfile } from '@/lib/db';
import { getCurrentUserId } from '@/lib/db';

/**
 * GET /api/auth/profile?email=...
 * Returns user profile data
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }
  const user = await getProfileByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(user);
}

/**
 * PATCH /api/auth/profile
 * Update user profile data — uses Supabase Auth session, not email body.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    // Strip sensitive fields
    delete body.email;
    delete body.id;
    delete body.role;
    delete body.xp;
    delete body.created_at;
    delete body.updated_at;

    const updated = await updateProfile(userId, body);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Auth:Profile] Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
