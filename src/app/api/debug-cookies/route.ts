import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/debug-cookies — temporary debug endpoint.
 * Returns all cookies the server sees + the Supabase URL + the result of
 * sb.auth.getUser(). This is to diagnose why /api/reviews returns 401.
 *
 * DO NOT DEPLOY TO PRODUCTION LONG-TERM — it exposes cookie names + lengths.
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieSummary = allCookies.map(c => ({
      name: c.name,
      valueLength: c.value.length,
      valuePreview: c.value.slice(0, 80),
    }));

    // Try to create the Supabase client and call getUser
    const { createClient } = await import('@/lib/supabase/server');
    const sb = await createClient();
    const { data: { user }, error } = await sb.auth.getUser();

    return NextResponse.json({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      cookies: cookieSummary,
      getUserResult: user ? { id: user.id, email: user.email } : null,
      getUserError: error?.message ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'unknown error', stack: err?.stack }, { status: 500 });
  }
}
