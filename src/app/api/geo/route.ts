import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // Forward the client IP to ipapi.co
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0]?.trim() || realIp || '';

    // Use ipapi.co for geolocation
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ countryCode: 'US', countryName: 'United States', detected: false });
    }

    const data = await res.json();

    return NextResponse.json({
      countryCode: data.country_code || 'US',
      countryName: data.country_name || 'United States',
      city: data.city || '',
      region: data.region || '',
      timezone: data.timezone || 'UTC',
      detected: true,
    });
  } catch {
    return NextResponse.json({ countryCode: 'US', countryName: 'United States', detected: false });
  }
}
