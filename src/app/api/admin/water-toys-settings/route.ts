import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(auth as any);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.settings.findFirst({
      where: { id: 1 },
      select: { waterToysUrl: true }
    });

    return NextResponse.json({ 
      waterToysUrl: settings?.waterToysUrl || 'https://example.com/water-toys' 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(auth as any);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { waterToysUrl } = await request.json();

    if (!waterToysUrl || typeof waterToysUrl !== 'string') {
      return NextResponse.json({ error: 'URL des jeux d\'eau requise' }, { status: 400 });
    }

    // Validation basique de l'URL
    try {
      new URL(waterToysUrl);
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { waterToysUrl },
      create: { id: 1, waterToysUrl }
    });

    return NextResponse.json({ 
      success: true, 
      waterToysUrl: settings.waterToysUrl,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
