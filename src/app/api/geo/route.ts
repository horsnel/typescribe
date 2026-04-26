import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // Get the real client IP from proxy headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0]?.trim() || realIp || '';

    // Build the ipapi.co URL — use the client IP if available so the
    // geolocation is based on the USER's IP, not the server's IP.
    const geoUrl = clientIp
      ? `https://ipapi.co/${clientIp}/json/`
      : 'https://ipapi.co/json/';

    const res = await fetch(geoUrl, {
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
