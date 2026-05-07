import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Validates credentials before NextAuth signIn.
 * This is a pre-check endpoint — the actual session creation
 * is handled by NextAuth's credentials provider.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // The actual authentication is handled by NextAuth's authorize() function
    // in auth-config.ts. This endpoint exists as a pre-validation step.
    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('[Auth:Login] Error:', error);
    return NextResponse.json(
      { error: 'Login validation failed' },
      { status: 500 }
    );
  }
}
