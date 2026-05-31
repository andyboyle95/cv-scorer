import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i;

async function getLatLng(postcode: string): Promise<{ lat: number; lng: number }> {
  const encoded = encodeURIComponent(postcode.trim().toUpperCase());
  const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Postcode not found: ${postcode}`);
  const data = await res.json();
  if (!data.result) throw new Error(`Invalid postcode: ${postcode}`);
  return { lat: data.result.latitude, lng: data.result.longitude };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { homePostcode, workPostcode } = body as { homePostcode: string; workPostcode: string };

    if (!homePostcode || !workPostcode) {
      return NextResponse.json({ error: 'Both postcodes are required' }, { status: 400 });
    }
    if (!UK_POSTCODE_REGEX.test(homePostcode.trim())) {
      return NextResponse.json({ error: `Invalid home postcode: ${homePostcode}` }, { status: 400 });
    }
    if (!UK_POSTCODE_REGEX.test(workPostcode.trim())) {
      return NextResponse.json({ error: `Invalid work postcode: ${workPostcode}` }, { status: 400 });
    }

    const [home, work] = await Promise.all([getLatLng(homePostcode), getLatLng(workPostcode)]);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${home.lng},${home.lat};${work.lng},${work.lat}?overview=full&geometries=geojson`;
    const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(15000) });

    if (!osrmRes.ok) {
      return NextResponse.json({ error: 'Could not calculate route. Please try again.' }, { status: 500 });
    }

    const osrmData = await osrmRes.json();

    if (!osrmData.routes || osrmData.routes.length === 0) {
      return NextResponse.json({ error: 'No route found between these postcodes.' }, { status: 400 });
    }

    const route = osrmData.routes[0];
    const distanceMiles = route.distance / 1609.344;
    const durationMinutes = route.duration / 60;

    return NextResponse.json({
      distanceMiles,
      durationMinutes,
      homeLatLng: [home.lat, home.lng] as [number, number],
      workLatLng: [work.lat, work.lng] as [number, number],
      routeGeometry: route.geometry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
