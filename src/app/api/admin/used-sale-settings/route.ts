import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

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
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const settings = await prisma.settings.findFirst();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = await req.formData();
  
  // Récupérer les champs texte
  const usedSaleTitleFr = (data.get('usedSaleTitleFr') || '').toString().trim();
  const usedSaleTitleEn = (data.get('usedSaleTitleEn') || '').toString().trim();
  const usedSaleTextFr = (data.get('usedSaleTextFr') || '').toString().trim();
  const usedSaleTextEn = (data.get('usedSaleTextEn') || '').toString().trim();

  // Mettre à jour les settings
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      usedSaleTitleFr: usedSaleTitleFr || null,
      usedSaleTitleEn: usedSaleTitleEn || null,
      usedSaleTextFr: usedSaleTextFr || null,
      usedSaleTextEn: usedSaleTextEn || null,
    } as any,
  });

  const redirectUrl = createRedirectUrl('/admin/used-sale-settings?success=1', req);
  return NextResponse.redirect(redirectUrl, 303);
}

