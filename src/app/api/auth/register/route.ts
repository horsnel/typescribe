import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth-config';

/**
 * POST /api/auth/register
 *
 * Register a new user with email and password.
 * Password is hashed with bcrypt before storage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, display_name, favorite_genres } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const result = await createUser(email, password, display_name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    const user = getUserByEmail(email);
    return NextResponse.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        display_name: user?.display_name,
      },
    });
  } catch (error: any) {
    console.error('[Auth:Register] Error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
