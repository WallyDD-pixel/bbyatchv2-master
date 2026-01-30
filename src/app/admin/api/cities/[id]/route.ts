import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: modifier une ville
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const { name } = await req.json();
  const id = Number(idStr);
  if (!name || typeof name !== 'string' || !id) return NextResponse.json({ error: 'Nom ou ID requis' }, { status: 400 });
  const city = await prisma.city.update({ where: { id }, data: { name } });
  return NextResponse.json({ city });
}

// DELETE: supprimer une ville
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  await prisma.city.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
