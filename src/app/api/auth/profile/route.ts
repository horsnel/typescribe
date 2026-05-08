import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/auth-config';

/**
 * GET /api/auth/profile?email=...
 * Returns user profile data (excluding password)
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Return user without password
  const { password: _, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

/**
 * PATCH /api/auth/profile
 * Update user profile data
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, ...updates } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.id;

    const updated = updateUser(email, updates);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('[Auth:Profile] Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
