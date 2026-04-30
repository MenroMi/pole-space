import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/shared/lib/ratelimit', () => ({
  geocodeRatelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}));

import { geocodeRatelimit } from '@/shared/lib/ratelimit';
import { GET } from './route';

const mockLimit = geocodeRatelimit.limit as ReturnType<typeof vi.fn>;

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, NOMINATIM_USER_AGENT: 'test-agent/1.0' };
  global.fetch = vi.fn();
  mockLimit.mockResolvedValue({ success: true });
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

function makeRequest(params: Record<string, string>, headers?: Record<string, string>) {
  const url = new URL('http://localhost/api/geocode');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { headers });
}

describe('GET /api/geocode', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false });
    const res = await GET(makeRequest({ lat: '52.23', lon: '21.01' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Too many requests' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 when lat is missing', async () => {
    const res = await GET(makeRequest({ lon: '21.01' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing lat or lon' });
  });

  it('returns 400 when lon is missing', async () => {
    const res = await GET(makeRequest({ lat: '52.23' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing lat or lon' });
  });

  it('returns 400 for non-numeric lat', async () => {
    const res = await GET(makeRequest({ lat: 'abc', lon: '21.01' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 400 for lat with trailing garbage (e.g. "52.23abc")', async () => {
    const res = await GET(makeRequest({ lat: '52.23abc', lon: '21.01' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 400 for lat out of range (> 90)', async () => {
    const res = await GET(makeRequest({ lat: '91', lon: '21.01' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 400 for lat out of range (< -90)', async () => {
    const res = await GET(makeRequest({ lat: '-91', lon: '21.01' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 400 for lon out of range (> 180)', async () => {
    const res = await GET(makeRequest({ lat: '52.23', lon: '181' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 400 for lon out of range (< -180)', async () => {
    const res = await GET(makeRequest({ lat: '52.23', lon: '-181' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid coordinates' });
  });

  it('returns 503 when NOMINATIM_USER_AGENT is not set', async () => {
    delete process.env.NOMINATIM_USER_AGENT;
    const res = await GET(makeRequest({ lat: '52.23', lon: '21.01' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Geocoding not configured' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 502 when Nominatim returns a non-ok response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 429 }));
    const res = await GET(makeRequest({ lat: '52.23', lon: '21.01' }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Geocoding failed' });
  });

  it('returns 502 when fetch throws a network error', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await GET(makeRequest({ lat: '52.23', lon: '21.01' }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Geocoding failed' });
  });

  it('returns location string when Nominatim responds with city and country', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ address: { city: 'Warsaw', country: 'Poland' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const res = await GET(makeRequest({ lat: '52.23', lon: '21.01' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: 'Warsaw, Poland' });
  });

  it('falls back to town when city is absent', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ address: { town: 'Kraków', country: 'Poland' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const res = await GET(makeRequest({ lat: '50.06', lon: '19.94' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: 'Kraków, Poland' });
  });

  it('falls back to village when city and town are absent', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ address: { village: 'Małe Zalesie', country: 'Poland' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const res = await GET(makeRequest({ lat: '52.1', lon: '20.9' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: 'Małe Zalesie, Poland' });
  });

  it('returns null location when address is empty', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ address: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const res = await GET(makeRequest({ lat: '0', lon: '0' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ location: null });
  });

  it('forwards parsed floats (not raw strings) to Nominatim URL', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ address: { city: 'Test', country: 'Land' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await GET(makeRequest({ lat: '52.2300', lon: '21.0100' }));
    const calledUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('lat=52.23');
    expect(calledUrl).toContain('lon=21.01');
  });
});
