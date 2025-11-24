import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET() {
  const settings = await prisma.settings.findFirst();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const data = await req.formData();
  const mainSliderTitle = data.get('mainSliderTitle') as string;
  const mainSliderSubtitle = data.get('mainSliderSubtitle') as string;
  const mainSliderText = data.get('mainSliderText') as string;
  const mainSliderImageFile = data.get('mainSliderImageFile') as File | null; // legacy, un seul fichier
  const mainSliderImagesFiles = data.getAll('mainSliderImagesFiles') as File[]; // multi fichiers
  const aboutUsTitle = data.get('aboutUsTitle') as string;
  const aboutUsSubtitle = data.get('aboutUsSubtitle') as string;
  const aboutUsText = data.get('aboutUsText') as string;
  const bbServiceText = data.get('bbServiceText') as string;
  const footerInstagram = data.get('footerInstagram') as string;
  const footerFacebook = data.get('footerFacebook') as string;
  const footerLinkedIn = data.get('footerLinkedIn') as string;
  const footerYouTube = data.get('footerYouTube') as string;
  const footerTikTok = data.get('footerTikTok') as string;

  // Récupère dynamiquement la liste d’avantages

  // Gestion upload images slider (multi + legacy)
  let mainSliderImageUrl: string | undefined;
  let uploadedUrls: string[] = [];
  const allowedExt = new Set(['jpg','jpeg','png','webp','gif','avif']);
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Multi-images si présentes
  if (Array.isArray(mainSliderImagesFiles) && mainSliderImagesFiles.length > 0) {
      for (const file of mainSliderImagesFiles) {
        if (!file || !(file as any).arrayBuffer) continue;
    const name = (file as any).name || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const mime = (file as any).type || '';
    if (!(allowedExt.has(ext) || mime.startsWith('image/'))) continue; // ignore non-images
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-slider.${ext}`.replace(/\s+/g, '-');
        const buf = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(uploadsDir, fname), buf);
        const url = `/uploads/${fname}`;
        uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        mainSliderImageUrl = uploadedUrls[0];
      }
    }

    // Legacy: un seul fichier si pas de multi fourni
    if (!mainSliderImageUrl && mainSliderImageFile && (mainSliderImageFile as any).arrayBuffer) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const name = (mainSliderImageFile as any).name || '';
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const mime = (mainSliderImageFile as any).type || '';
      if (!(allowedExt.has(ext) || mime.startsWith('image/'))) {
        // ignorer le fichier non image
      } else {
      const fname = `${Date.now()}-slider-main.${ext}`.replace(/\s+/g, '-');
      const buf = Buffer.from(await mainSliderImageFile.arrayBuffer());
      fs.writeFileSync(path.join(uploadsDir, fname), buf);
      mainSliderImageUrl = `/uploads/${fname}`;
      uploadedUrls = [mainSliderImageUrl];
      }
    }
  } catch (e) {
    // on ignore l’erreur d’upload, pas bloquant
  }

  // Concaténer avec la liste existante si on a uploadé quelque chose
  let dataUpdate: any = {
    mainSliderTitle,
    mainSliderSubtitle,
    mainSliderText,
    aboutUsTitle,
    aboutUsSubtitle,
    aboutUsText,
    bbServiceText,
    footerInstagram,
    footerFacebook,
    footerLinkedIn,
    footerYouTube,
    footerTikTok,
  };

  if (uploadedUrls.length > 0) {
    const current: any = await prisma.settings.findFirst();
    let existing: string[] = [];
    if (current?.mainSliderImageUrls) {
      try {
        const parsed = JSON.parse(current.mainSliderImageUrls as string);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {}
    }
    // Ne conserver que les URLs pointant vers des fichiers d'images (par extension)
    const keep = (u: string) => {
      const ext = u.split('.').pop()?.toLowerCase() || '';
      return allowedExt.has(ext);
    };
    const combined = [...existing.filter(keep), ...uploadedUrls.filter(keep)];
    dataUpdate.mainSliderImageUrls = JSON.stringify(combined);
    // garder mainSliderImageUrl en cohérence (première image)
    dataUpdate.mainSliderImageUrl = combined[0] ?? mainSliderImageUrl;
  } else if (mainSliderImageUrl) {
    // Cas très rare (legacy unique) sans liste: on définit aussi le single
    dataUpdate.mainSliderImageUrl = mainSliderImageUrl;
  }

  await prisma.settings.update({ where: { id: 1 }, data: dataUpdate as any });

  return NextResponse.redirect(new URL('/admin/homepage-settings', req.url));
}

// Suppression d'une image du slider par URL
export async function DELETE(req: Request) {
  const urlObj = new URL(req.url);
  const urlToDelete = urlObj.searchParams.get('url');
  if (!urlToDelete) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const settings: any = await prisma.settings.findFirst();
  let list: string[] = [];
  if (settings?.mainSliderImageUrls) {
    try {
      const parsed = JSON.parse(settings.mainSliderImageUrls as string);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  } else if (settings?.mainSliderImageUrl) {
    list = [settings.mainSliderImageUrl as string];
  }

  const newList = list.filter((u) => u !== urlToDelete);
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      mainSliderImageUrls: JSON.stringify(newList),
      mainSliderImageUrl: newList[0] || null,
    } as any,
    create: {
      id: 1,
      mainSliderImageUrls: JSON.stringify(newList),
      mainSliderImageUrl: newList[0] || null,
    } as any,
  });

  // Supprimer le fichier physiquement si dans /public/uploads
  try {
    if (urlToDelete.startsWith('/uploads/')) {
      const p = path.join(process.cwd(), 'public', urlToDelete.replace(/^\//, ''));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch {}

  return NextResponse.json({ ok: true, urls: newList });
}

// Réordonner la liste des images (remplacer par l'ordre fourni)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const urls = Array.isArray(body?.urls) ? body.urls.filter((u: any) => typeof u === 'string') : null;
    if (!urls) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    await prisma.settings.update({
      where: { id: 1 },
      data: {
        mainSliderImageUrls: JSON.stringify(urls),
        mainSliderImageUrl: urls[0] || null,
      } as any,
    });
    return NextResponse.json({ ok: true, urls });
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
