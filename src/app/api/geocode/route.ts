import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }

  const ua = process.env.NOMINATIM_USER_AGENT;
  if (!ua) {
    return NextResponse.json({ error: 'Geocoding not configured' }, { status: 503 });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
    { headers: { 'User-Agent': ua } },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }

  const data = (await res.json()) as {
    address?: { city?: string; town?: string; village?: string; country?: string };
  };

  const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? '';
  const country = data.address?.country ?? '';
  const location = [city, country].filter(Boolean).join(', ');

  return NextResponse.json({ location: location || null });
}
