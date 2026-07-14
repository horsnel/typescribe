import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth-config';
import { getProfileByEmail, updateProfile } from '@/lib/db';

/**
 * POST /api/auth/register
 * Registers a new user via Supabase Auth (which auto-creates the matching
 * `profiles` row via the handle_new_user trigger).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, display_name, favorite_genres } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 },
      );
    }

    const result = await createUser(email, password, display_name);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    // Best-effort update of favorite_genres
    const user = await getProfileByEmail(email);
    if (user && favorite_genres?.length) {
      await updateProfile(user.id, { favorite_genres });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        display_name: user?.display_name ?? display_name,
      },
    });
  } catch (error: any) {
    console.error('[Auth:Register] Error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
