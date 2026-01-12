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

export async function POST(req: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    
    const data: any = {
      facebookPixelId: formData.get('facebookPixelId')?.toString() || null,
      googleAnalyticsId: formData.get('googleAnalyticsId')?.toString() || null,
      googleTagManagerId: formData.get('googleTagManagerId')?.toString() || null,
      metaTitle: formData.get('metaTitle')?.toString() || null,
      metaDescription: formData.get('metaDescription')?.toString() || null,
      metaKeywords: formData.get('metaKeywords')?.toString() || null,
      ogImage: formData.get('ogImage')?.toString() || null,
      siteUrl: formData.get('siteUrl')?.toString() || null,
    };

    await prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return NextResponse.json({ success: true, message: 'Paramètres SEO et tracking sauvegardés' });
  } catch (error: any) {
    console.error('Erreur lors de la sauvegarde SEO/tracking:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.settings.findFirst();
    return NextResponse.json(settings || {});
  } catch (error: any) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}




