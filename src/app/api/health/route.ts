import { NextResponse } from 'next/server';

/** Ping léger pour détecter une app en ligne (récupération cache / bfcache). */
export async function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    }
  );
}
