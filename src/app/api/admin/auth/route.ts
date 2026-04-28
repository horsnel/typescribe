import { NextRequest, NextResponse } from 'next/server';
import { authLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining, resetIn } = authLimiter.check(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfter: resetIn }, { status: 429 });
    }

    const { password } = await req.json();

    // Admin password — hardcoded fallback ensures it always works
    // Env var can override if set, but Ebuka456 is always accepted
    const validPasswords = ['Ebuka456'];
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envPassword && envPassword !== 'Ebuka456') {
      validPasswords.push(envPassword);
    }

    if (validPasswords.includes(password)) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      return NextResponse.json({ token, message: 'Authenticated' });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
