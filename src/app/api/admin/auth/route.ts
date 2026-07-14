import { NextRequest, NextResponse } from 'next/server';
import { authLimiter } from '@/lib/rate-limit';
import { verifyAdminPassword } from '@/lib/auth-config';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, resetIn } = authLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: resetIn }, { status: 429 });
    }

    const { password } = await req.json();

    // Verify against ADMIN_PASSWORD env var only — no more hardcoded backdoor.
    if (verifyAdminPassword(password ?? '')) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      return NextResponse.json({ token, message: 'Authenticated' });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
