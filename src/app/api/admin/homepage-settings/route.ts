import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase, uploadToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const settings = await prisma.settings.findFirst();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
  try {
    const data = await req.formData();
    const has = (k: string) => data.has(k);
    const mainSliderTitle = has('mainSliderTitle') ? (data.get('mainSliderTitle') || '').toString().trim() : undefined;
    const mainSliderSubtitle = has('mainSliderSubtitle') ? (data.get('mainSliderSubtitle') || '').toString().trim() : undefined;
    const mainSliderText = has('mainSliderText') ? (data.get('mainSliderText') || '').toString().trim() : undefined;
    const mainSliderImageFile = data.get('mainSliderImageFile') as File | null; // legacy, un seul fichier
    const mainSliderImagesFiles = data.getAll('mainSliderImagesFiles') as File[]; // multi fichiers
    const aboutUsTitle = has('aboutUsTitle') ? (data.get('aboutUsTitle') || '').toString().trim() : undefined;
    const aboutUsSubtitle = has('aboutUsSubtitle') ? (data.get('aboutUsSubtitle') || '').toString().trim() : undefined;
    const aboutUsText = has('aboutUsText') ? (data.get('aboutUsText') || '').toString().trim() : undefined;
    const whyChooseImageFile = data.get('whyChooseImageFile') as File | null;

  // Gestion upload image "Pourquoi choisir" vers Supabase Storage avec validation
  let whyChooseImageUrl: string | undefined;
  
  // Vérifier si une URL d'image externe a été fournie
  const whyChooseImageUrlInput = (data.get('whyChooseImageUrl') || '').toString().trim();
  if (whyChooseImageUrlInput && (whyChooseImageUrlInput.startsWith('http://') || whyChooseImageUrlInput.startsWith('https://'))) {
    try {
      const { downloadAndStoreImage } = await import('@/lib/download-image');
      const downloadResult = await downloadAndStoreImage(whyChooseImageUrlInput, 'homepage');
      
      if (downloadResult.success && downloadResult.url) {
        whyChooseImageUrl = downloadResult.url;
        console.log(`✅ Image externe téléchargée et stockée: ${whyChooseImageUrl}`);
      } else {
        console.error(`❌ Erreur lors du téléchargement de l'image externe: ${downloadResult.error}`);
        return NextResponse.json(
          { 
            error: 'Erreur lors de la sauvegarde',
            message: `Impossible de télécharger l'image depuis l'URL: ${downloadResult.error || 'Erreur inconnue'}`,
          },
          { status: 400 }
        );
      }
    } catch (e: any) {
      console.error('Error downloading external image:', e?.message || e);
      return NextResponse.json(
        { 
          error: 'Erreur lors de la sauvegarde',
          message: `Erreur lors du téléchargement de l'image: ${e?.message || 'Erreur inconnue'}`,
        },
        { status: 500 }
      );
    }
  } else if (whyChooseImageFile && whyChooseImageFile instanceof File && whyChooseImageFile.size > 0) {
    try {
      const { validateImageFile } = await import('@/lib/security/file-validation');
      const validation = await validateImageFile(whyChooseImageFile);
      if (validation.valid) {
        // Essayer de compresser côté serveur si nécessaire
        let fileToUpload = whyChooseImageFile;
        if (whyChooseImageFile.size > 2 * 1024 * 1024) { // Si > 2MB, compresser
          try {
            const { compressImageServer } = await import('@/lib/image-compression-server');
            fileToUpload = await compressImageServer(whyChooseImageFile, {
              maxSizeMB: 2,
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85,
            });
            console.log(`📦 Image compressée: ${(whyChooseImageFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
          } catch (compressionError) {
            console.warn('⚠️ Compression côté serveur échouée, utilisation du fichier original');
          }
        }
        
        const result = await uploadToSupabase(fileToUpload, 'homepage');
        if (result) {
          whyChooseImageUrl = result.url;
        }
      } else {
        console.warn(`⚠️ WhyChoose image rejected: ${whyChooseImageFile.name} - ${validation.error}`);
        // Retourner une erreur explicite pour l'utilisateur
        return NextResponse.json(
          { 
            error: 'Erreur lors de la sauvegarde',
            message: `Image rejetée: ${validation.error}. Veuillez utiliser une image de moins de 5MB.`,
          },
          { status: 400 }
        );
      }
    } catch (e: any) {
      console.error('Error uploading whyChoose image to Supabase Storage:', e?.message || e);
      // Retourner une erreur explicite
      return NextResponse.json(
        { 
          error: 'Erreur lors de la sauvegarde',
          message: `Erreur lors de l'upload de l'image: ${e?.message || 'Erreur inconnue'}. Vérifiez que l'image n'est pas trop volumineuse (max 5MB).`,
        },
        { status: 500 }
      );
    }
  }

  // Gestion upload images slider vers Supabase Storage (multi + legacy) avec validation
  let mainSliderImageUrl: string | undefined;
  let uploadedUrls: string[] = [];
  try {
    const { validateImageFile } = await import('@/lib/security/file-validation');
    
    // Multi-images si présentes
    if (Array.isArray(mainSliderImagesFiles) && mainSliderImagesFiles.length > 0) {
      const validFiles: File[] = [];
      
      for (const file of mainSliderImagesFiles) {
        if (!file || !(file instanceof File) || file.size === 0) continue;
        const validation = await validateImageFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          console.warn(`⚠️ Slider image rejected: ${file.name} - ${validation.error}`);
        }
      }
      
      if (validFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validFiles, 'homepage');
        uploadedUrls.push(...urls);
        if (uploadedUrls.length > 0) {
          mainSliderImageUrl = uploadedUrls[0];
        }
      }
    }

    // Legacy: un seul fichier si pas de multi fourni
    if (!mainSliderImageUrl && mainSliderImageFile && mainSliderImageFile instanceof File && mainSliderImageFile.size > 0) {
      const validation = await validateImageFile(mainSliderImageFile);
      if (validation.valid) {
        const result = await uploadMultipleToSupabase([mainSliderImageFile], 'homepage');
        if (result.length > 0) {
          mainSliderImageUrl = result[0];
          uploadedUrls = [mainSliderImageUrl];
        }
      } else {
        console.warn(`⚠️ Slider image rejected: ${mainSliderImageFile.name} - ${validation.error}`);
      }
    }
  } catch (e: any) {
    console.error('Error uploading slider images to Supabase Storage:', e?.message || e);
    // on ignore l'erreur d'upload, pas bloquant
  }

  // Ne mettre à jour que les champs envoyés dans le formulaire (évite d'écraser les réseaux sociaux quand on enregistre depuis Page d'accueil, et inversement)
  let dataUpdate: any = {};
  
  if (has('mainSliderTitle')) dataUpdate.mainSliderTitle = (mainSliderTitle ?? '').toString().trim() || null;
  if (has('mainSliderSubtitle')) dataUpdate.mainSliderSubtitle = (mainSliderSubtitle ?? '').toString().trim() || null;
  if (has('mainSliderText')) dataUpdate.mainSliderText = (mainSliderText ?? '').toString().trim() || null;
  if (has('aboutUsTitle')) dataUpdate.aboutUsTitle = (aboutUsTitle ?? '').toString().trim() || null;
  if (has('aboutUsSubtitle')) dataUpdate.aboutUsSubtitle = (aboutUsSubtitle ?? '').toString().trim() || null;
  if (has('aboutUsText')) dataUpdate.aboutUsText = (aboutUsText ?? '').toString().trim() || null;

  // Réseaux sociaux (page Réseaux sociaux n'envoie que ces champs — les persister sans écraser le reste)
  ['footerInstagram', 'footerFacebook', 'footerLinkedIn', 'footerYouTube', 'footerTikTok'].forEach((key) => {
    if (data.has(key)) dataUpdate[key] = (data.get(key) as string)?.toString().trim() || null;
  });

  // Ajouter l'URL de l'image "Pourquoi choisir" si uploadée ou téléchargée
  if (has('whyChooseImageUrl') && whyChooseImageUrlInput === '' && !whyChooseImageFile) {
    dataUpdate.whyChooseImageUrl = null;
  } else if (whyChooseImageUrl) {
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
    // Ne conserver que les URLs pointant vers des fichiers d'images (par extension), sans doublon
    const allowedExt = new Set(['jpg', 'jpeg', 'png', 'svg', 'webp']);
    const keep = (u: string) => {
      const ext = u.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
      return allowedExt.has(ext);
    };
    const combined = Array.from(new Set([...existing.filter(keep), ...uploadedUrls.filter(keep)]));
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

    // Si la requête ne contient que les champs réseaux sociaux (enregistrement depuis page Réseaux sociaux), retourner JSON au lieu de rediriger
    const onlySocial =
      Object.keys(dataUpdate).every((k) => ['footerInstagram', 'footerFacebook', 'footerLinkedIn', 'footerYouTube', 'footerTikTok'].includes(k)) &&
      Object.keys(dataUpdate).length > 0;
    if (onlySocial) {
      return NextResponse.json({ ok: true, message: 'Réseaux sociaux enregistrés' });
    }

    // Redirection avec URL correcte (évite localhost)
    const redirectUrl = createRedirectUrl('/admin/homepage-settings?success=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('=== Error updating homepage settings ===');
    console.error('Error type:', typeof e);
    console.error('Error message:', e?.message);
    console.error('Error stack:', e?.stack);
    console.error('Error full:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
    
    // Retourner une réponse JSON avec le détail de l'erreur
    const errorMessage = e?.message || String(e) || 'Erreur inconnue lors de la sauvegarde';
    return NextResponse.json(
      { 
        error: 'Erreur lors de la sauvegarde',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: e?.message,
          stack: e?.stack,
          name: e?.name
        } : undefined
      },
      { status: 500 }
    );
  }
}

// Suppression d'une image du slider par URL
export async function DELETE(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  
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
