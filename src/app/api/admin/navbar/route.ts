import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = (await getServerSession(auth as any)) as any;
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

export async function GET() {
  try {
    const navbarItems = await prisma.navbarItem.findMany({
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ navbarItems });
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments de navbar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { labelFr, labelEn, href, icon, order, visible, target } = await request.json();

    if (!labelFr || !labelEn || !href) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const navbarItem = await prisma.navbarItem.create({
      data: {
        labelFr,
        labelEn,
        href,
        icon: icon || null,
        order: order || 0,
        visible: visible !== undefined ? visible : true,
        target: target || '_self'
      }
    });

    return NextResponse.json({ 
      success: true, 
      navbarItem,
      message: 'Élément de navigation créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'élément de navbar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, labelFr, labelEn, href, icon, order, visible, target } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const navbarItem = await prisma.navbarItem.update({
      where: { id: Number(id) },
      data: {
        labelFr,
        labelEn,
        href,
        icon: icon || null,
        order: order || 0,
        visible: visible !== undefined ? visible : true,
        target: target || '_self'
      }
    });

    return NextResponse.json({ 
      success: true, 
      navbarItem,
      message: 'Élément de navigation mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'élément de navbar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    await prisma.navbarItem.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Élément de navigation supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'élément de navbar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
