import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/boats/[slug]
// Retourne les informations de base d'un bateau (notamment l'ID)
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const boat = await prisma.boat.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, slug: true }
    });
    if (!boat) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(boat);
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

