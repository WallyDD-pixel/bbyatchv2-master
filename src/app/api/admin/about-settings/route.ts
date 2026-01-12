import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

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
  const aboutHistoryFr = (data.get('aboutHistoryFr') || '').toString().trim();
  const aboutHistoryEn = (data.get('aboutHistoryEn') || '').toString().trim();
  const aboutMissionFr = (data.get('aboutMissionFr') || '').toString().trim();
  const aboutMissionEn = (data.get('aboutMissionEn') || '').toString().trim();
  const aboutTeamFr = (data.get('aboutTeamFr') || '').toString().trim();
  const aboutTeamEn = (data.get('aboutTeamEn') || '').toString().trim();
  const aboutValuesSafetyFr = (data.get('aboutValuesSafetyFr') || '').toString().trim();
  const aboutValuesSafetyEn = (data.get('aboutValuesSafetyEn') || '').toString().trim();
  const aboutValuesComfortFr = (data.get('aboutValuesComfortFr') || '').toString().trim();
  const aboutValuesComfortEn = (data.get('aboutValuesComfortEn') || '').toString().trim();
  const aboutValuesAuthFr = (data.get('aboutValuesAuthFr') || '').toString().trim();
  const aboutValuesAuthEn = (data.get('aboutValuesAuthEn') || '').toString().trim();
  const aboutValuesPleasureFr = (data.get('aboutValuesPleasureFr') || '').toString().trim();
  const aboutValuesPleasureEn = (data.get('aboutValuesPleasureEn') || '').toString().trim();

  // Gestion des images
  const imageFiles = data.getAll('imageFiles') as File[];
  const existingImagesRaw = data.getAll('existingImages');
  const existingImages: string[] = Array.isArray(existingImagesRaw) 
    ? existingImagesRaw.map((img: any) => img.toString()).filter((url: string) => url && !url.startsWith('data:'))
    : [];
  const allowedExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
  const uploadedUrls: string[] = [];

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const file of imageFiles) {
      if (!file || file.size === 0) continue;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExt.has(ext)) continue;

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${random}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      const bytes = await file.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(bytes));
      uploadedUrls.push(`/uploads/${filename}`);
    }
  } catch (e) {
    console.error('Error uploading images:', e);
  }

  // Combiner les images existantes et les nouvelles
  const allImages = [...existingImages, ...uploadedUrls];
  const aboutImageUrls = allImages.length > 0 ? JSON.stringify(allImages) : null;

  // Mettre à jour les settings
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      aboutHistoryFr,
      aboutHistoryEn,
      aboutMissionFr,
      aboutMissionEn,
      aboutTeamFr,
      aboutTeamEn,
      aboutValuesSafetyFr,
      aboutValuesSafetyEn,
      aboutValuesComfortFr,
      aboutValuesComfortEn,
      aboutValuesAuthFr,
      aboutValuesAuthEn,
      aboutValuesPleasureFr,
      aboutValuesPleasureEn,
      aboutImageUrls,
    } as any,
  });

  // Invalider le cache de la page d'accueil
  revalidatePath('/', 'page');
  revalidatePath('/');

  const redirectUrl = createRedirectUrl('/admin/about-settings?success=1', req);
  return NextResponse.redirect(redirectUrl, 303);
}

