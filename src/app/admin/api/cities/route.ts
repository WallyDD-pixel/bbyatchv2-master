import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: liste des villes
export async function GET() {
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ cities });
}

// POST: ajouter une ville (idempotent par name)
export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name || typeof name !== 'string') return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  const trimmed = name.trim();
  if (!trimmed) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  const city = await prisma.city.upsert({ where: { name: trimmed }, update: {}, create: { name: trimmed } });
  return NextResponse.json({ city }, { status: 201 });
}

// PUT: renommer une ville (par id)
export async function PUT(req: Request) {
  const { id, name } = await req.json();
  if (!id || !name || typeof name !== 'string') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  const trimmed = name.trim();
  const city = await prisma.city.update({ where: { id }, data: { name: trimmed } });
  return NextResponse.json({ city });
}

// DELETE: supprimer une ville (par name via querystring pour simplicité)
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get('name') || '').trim();
  if (!name) return NextResponse.json({ error: 'Paramètre name requis' }, { status: 400 });
  try {
    await prisma.city.delete({ where: { name } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // si inexistante, on considère ok (idempotence)
    return NextResponse.json({ ok: true });
  }
}
