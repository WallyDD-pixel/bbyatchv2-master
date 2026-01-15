import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

// Configuration pour permettre les gros uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const historyImageFile = data.get('aboutHistoryImageFile') as File | null;
  const teamImageFile = data.get('aboutTeamImageFile') as File | null;
  const existingImagesRaw = data.getAll('existingImages');
  const existingImages: string[] = Array.isArray(existingImagesRaw) 
    ? existingImagesRaw.map((img: any) => img.toString()).filter((url: string) => url && !url.startsWith('data:'))
    : [];
  
  const uploadedUrls: string[] = [];
  let historyImageUrl: string | null = null;
  let teamImageUrl: string | null = null;

  // Upload vers Supabase Storage (comme pour les expériences et bateaux)
  if (imageFiles.length > 0) {
    try {
      const validFiles = imageFiles.filter(f => {
        if (!f || f.size === 0) return false;
        const mime = (f as any).type;
        const allowedImages = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
        return allowedImages.includes(mime);
      });
      
      if (validFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validFiles, 'about');
        uploadedUrls.push(...urls);
        console.log('Uploaded', uploadedUrls.length, 'image(s) to Supabase for about page');
      }
    } catch (e) {
      console.error('Error uploading to Supabase Storage:', e);
      // Continuer même si l'upload échoue
    }
  }

  // Upload image Histoire
  if (historyImageFile && historyImageFile.size > 0) {
    try {
      const mime = (historyImageFile as any).type;
      const allowedImages = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
      if (allowedImages.includes(mime)) {
        const urls = await uploadMultipleToSupabase([historyImageFile], 'about');
        if (urls.length > 0) {
          historyImageUrl = urls[0];
          console.log('Uploaded history image to Supabase');
        }
      }
    } catch (e) {
      console.error('Error uploading history image to Supabase Storage:', e);
    }
  } else {
    // Conserver l'image existante si pas de nouveau fichier
    const existingHistoryUrl = data.get('aboutHistoryImageUrl') as string | null;
    if (existingHistoryUrl) historyImageUrl = existingHistoryUrl;
  }

  // Upload image Équipe
  if (teamImageFile && teamImageFile.size > 0) {
    try {
      const mime = (teamImageFile as any).type;
      const allowedImages = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
      if (allowedImages.includes(mime)) {
        const urls = await uploadMultipleToSupabase([teamImageFile], 'about');
        if (urls.length > 0) {
          teamImageUrl = urls[0];
          console.log('Uploaded team image to Supabase');
        }
      }
    } catch (e) {
      console.error('Error uploading team image to Supabase Storage:', e);
    }
  } else {
    // Conserver l'image existante si pas de nouveau fichier
    const existingTeamUrl = data.get('aboutTeamImageUrl') as string | null;
    if (existingTeamUrl) teamImageUrl = existingTeamUrl;
  }

  // Combiner les images existantes et les nouvelles
  const allImages = [...existingImages, ...uploadedUrls];
  const aboutImageUrls = allImages.length > 0 ? JSON.stringify(allImages) : null;

  // Mettre à jour les settings
  try {
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
        aboutHistoryImageUrl: historyImageUrl !== undefined ? historyImageUrl : undefined,
        aboutTeamImageUrl: teamImageUrl !== undefined ? teamImageUrl : undefined,
      } as any,
    });
  } catch (updateError: any) {
    console.error('Error updating settings:', updateError);
    // Si Settings n'existe pas, créer l'enregistrement
    if (updateError?.code === 'P2025' || updateError?.code === 'P2018') {
      try {
        await prisma.settings.create({
          data: {
            id: 1,
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
            aboutHistoryImageUrl: historyImageUrl || null,
            aboutTeamImageUrl: teamImageUrl || null,
          } as any,
        });
      } catch (createError) {
        console.error('Error creating settings:', createError);
        return NextResponse.json({ error: 'server_error', details: createError }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'server_error', details: updateError?.message }, { status: 500 });
    }
  }

  // Vérifier si c'est une requête AJAX (fetch) ou un formulaire HTML classique
  const acceptHeader = req.headers.get('accept') || '';
  const isAjaxRequest = acceptHeader.includes('application/json') || 
                        req.headers.get('x-requested-with') === 'XMLHttpRequest';
  
  // Si c'est une requête AJAX, retourner JSON pour éviter les problèmes de redirection
  if (isAjaxRequest || !req.headers.get('content-type')?.includes('multipart/form-data')) {
    return NextResponse.json({ ok: true, message: 'Settings updated successfully' });
  }
  
  // Sinon, rediriger après sauvegarde normale
  const redirectUrl = createRedirectUrl('/admin/about-settings?success=1', req);
  return NextResponse.redirect(redirectUrl, 303);
}

