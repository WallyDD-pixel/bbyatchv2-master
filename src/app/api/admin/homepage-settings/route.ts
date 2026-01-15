import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase, uploadToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const settings = await prisma.settings.findFirst();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const mainSliderTitle = data.get('mainSliderTitle') as string;
    const mainSliderSubtitle = data.get('mainSliderSubtitle') as string;
    const mainSliderText = data.get('mainSliderText') as string;
    const mainSliderImageFile = data.get('mainSliderImageFile') as File | null; // legacy, un seul fichier
    const mainSliderImagesFiles = data.getAll('mainSliderImagesFiles') as File[]; // multi fichiers
    const aboutUsTitle = data.get('aboutUsTitle') as string;
    const aboutUsSubtitle = data.get('aboutUsSubtitle') as string;
    const aboutUsText = data.get('aboutUsText') as string;
    const whyChooseImageFile = data.get('whyChooseImageFile') as File | null;

  // Gestion upload image "Pourquoi choisir" vers Supabase Storage
  let whyChooseImageUrl: string | undefined;
  if (whyChooseImageFile && (whyChooseImageFile as any).arrayBuffer) {
    try {
      const name = (whyChooseImageFile as any).name || '';
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const mime = (whyChooseImageFile as any).type || '';
      const allowedExt = new Set(['jpg','jpeg','png','webp','gif','avif']);
      if (allowedExt.has(ext) || mime.startsWith('image/')) {
        const result = await uploadToSupabase(whyChooseImageFile, 'homepage');
        if (result) {
          whyChooseImageUrl = result.url;
        }
      }
    } catch (e) {
      console.error('Error uploading whyChoose image to Supabase Storage:', e);
      // on ignore l'erreur d'upload, pas bloquant
    }
  }

  // Gestion upload images slider vers Supabase Storage (multi + legacy)
  let mainSliderImageUrl: string | undefined;
  let uploadedUrls: string[] = [];
  const allowedExt = new Set(['jpg','jpeg','png','webp','gif','avif']);
  try {
    // Multi-images si présentes
    if (Array.isArray(mainSliderImagesFiles) && mainSliderImagesFiles.length > 0) {
      const validFiles = mainSliderImagesFiles.filter(file => {
        if (!file || !(file as any).arrayBuffer) return false;
        const name = (file as any).name || '';
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const mime = (file as any).type || '';
        return allowedExt.has(ext) || mime.startsWith('image/');
      });
      
      if (validFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validFiles, 'homepage');
        uploadedUrls.push(...urls);
        if (uploadedUrls.length > 0) {
          mainSliderImageUrl = uploadedUrls[0];
        }
      }
    }

    // Legacy: un seul fichier si pas de multi fourni
    if (!mainSliderImageUrl && mainSliderImageFile && (mainSliderImageFile as any).arrayBuffer) {
      const name = (mainSliderImageFile as any).name || '';
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const mime = (mainSliderImageFile as any).type || '';
      if (allowedExt.has(ext) || mime.startsWith('image/')) {
        const result = await uploadMultipleToSupabase([mainSliderImageFile], 'homepage');
        if (result.length > 0) {
          mainSliderImageUrl = result[0];
          uploadedUrls = [mainSliderImageUrl];
        }
      }
    }
  } catch (e) {
    console.error('Error uploading slider images to Supabase Storage:', e);
    // on ignore l'erreur d'upload, pas bloquant
  }

  // Concaténer avec la liste existante si on a uploadé quelque chose
  let dataUpdate: any = {
    mainSliderTitle,
    mainSliderSubtitle,
    mainSliderText,
    aboutUsTitle,
    aboutUsSubtitle,
    aboutUsText,
  };

  // Ajouter l'URL de l'image "Pourquoi choisir" si uploadée
  if (whyChooseImageUrl) {
    dataUpdate.whyChooseImageUrl = whyChooseImageUrl;
  }

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

    await prisma.settings.upsert({
      where: { id: 1 },
      update: dataUpdate as any,
      create: { id: 1, ...dataUpdate as any },
    });

    // Invalider le cache de la page d'accueil et de la page admin
    revalidatePath('/', 'page');
    revalidatePath('/');
    revalidatePath('/admin/homepage-settings', 'page');

    // Redirection avec URL correcte (évite localhost)
    const redirectUrl = createRedirectUrl('/admin/homepage-settings?success=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('Error updating homepage settings:', e);
    // En cas d'erreur, rediriger quand même pour éviter une page d'erreur
    const redirectUrl = createRedirectUrl('/admin/homepage-settings?error=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  }
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

  // Note: Les fichiers Supabase Storage sont gérés par Supabase, pas besoin de suppression locale

  // Invalider le cache de la page d'accueil
  revalidatePath('/', 'page');
  revalidatePath('/');

  return NextResponse.json({ ok: true, urls: newList });
}

// Réordonner la liste des images (remplacer par l'ordre fourni)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const urls = Array.isArray(body?.urls) ? body.urls.filter((u: any) => typeof u === 'string') : null;
    if (!urls) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        mainSliderImageUrls: JSON.stringify(urls),
        mainSliderImageUrl: urls[0] || null,
      } as any,
      create: {
        id: 1,
        mainSliderImageUrls: JSON.stringify(urls),
        mainSliderImageUrl: urls[0] || null,
      } as any,
    });
    
    // Invalider le cache de la page d'accueil
    revalidatePath('/', 'page');
    revalidatePath('/');
    
    return NextResponse.json({ ok: true, urls });
  } catch (e) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
