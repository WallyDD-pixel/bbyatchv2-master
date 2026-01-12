import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';
import { uploadMultipleToSupabase } from '@/lib/storage';

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

  try {
    const data = await req.formData();

    // Gestion upload logo vers Supabase Storage
    let logoUrl: string | undefined;
    const logoFile = data.get('logoFile') as File | null;
    if (logoFile && (logoFile as any).size > 0 && (logoFile as any).arrayBuffer) {
      const allowedExt = new Set(['jpg', 'jpeg', 'png', 'svg', 'webp']);
      const name = (logoFile as any).name || '';
      const ext = name.split('.').pop()?.toLowerCase() || '';
      if (allowedExt.has(ext)) {
        try {
          const urls = await uploadMultipleToSupabase([logoFile], 'logos');
          if (urls.length > 0) {
            logoUrl = urls[0];
          }
        } catch (e) {
          console.error('Error uploading logo to Supabase Storage:', e);
        }
      }
    } else {
      // Conserver l'URL existante si pas de nouveau fichier
      const existingLogoUrl = data.get('logoUrl') as string;
      if (existingLogoUrl) logoUrl = existingLogoUrl;
    }

    // Prix du skipper par défaut
    const defaultSkipperPriceStr = (data.get('defaultSkipperPrice') || '').toString().trim();
    const defaultSkipperPrice = defaultSkipperPriceStr ? parseInt(defaultSkipperPriceStr, 10) : null;

    // URL des jeux d'eau
    const waterToysUrl = (data.get('waterToysUrl') || '').toString().trim() || null;

    // Mettre à jour les settings
    const updateData: any = {};
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (defaultSkipperPrice !== null) updateData.defaultSkipperPrice = defaultSkipperPrice;
    if (waterToysUrl !== null) updateData.waterToysUrl = waterToysUrl;

    await prisma.settings.update({
      where: { id: 1 },
      data: updateData,
    });

    const redirectUrl = createRedirectUrl('/admin/general-settings?success=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('Error updating general settings:', e);
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

