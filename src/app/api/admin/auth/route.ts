import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'olhmes2024';

    if (password === adminPassword) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      return NextResponse.json({ token, message: 'Authenticated' });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
