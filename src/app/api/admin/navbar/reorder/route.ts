import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = await getServerSession() as any;
  if (!session?.user) return null;
  if ((session.user as any)?.role === 'admin') return session.user;
  if (session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      if (u?.role === 'admin') return session.user;
    } catch {}
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items doit être un tableau' }, { status: 400 });
    }

    // Mettre à jour l'ordre de tous les éléments
    const updatePromises = items.map((item: any, index: number) => 
      prisma.navbarItem.update({
        where: { id: Number(item.id) },
        data: { order: index }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true,
      message: 'Ordre mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
