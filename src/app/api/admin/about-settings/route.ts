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

  // Gestion des images - extraire correctement les fichiers
  const imageFiles: File[] = [];
  data.getAll('imageFiles').forEach((value) => {
    if (value instanceof File) {
      imageFiles.push(value);
      console.log(`  ✓ Extracted file: ${value.name} (${value.size} bytes, ${value.type})`);
    } else {
      console.warn(`  ⚠️ Skipping non-File value for imageFiles:`, typeof value, value);
    }
  });
  
  const historyImageFile = data.get('aboutHistoryImageFile') as File | null;
  const teamImageFile = data.get('aboutTeamImageFile') as File | null;
  const existingImagesRaw = data.getAll('existingImages');
  const existingImages: string[] = Array.isArray(existingImagesRaw) 
    ? existingImagesRaw.map((img: any) => img.toString()).filter((url: string) => url && !url.startsWith('data:') && !url.startsWith('blob:'))
    : [];
  
  console.log('About settings API - Received:', {
    imageFilesCount: imageFiles.length,
    existingImagesCount: existingImages.length,
    historyImageFile: historyImageFile ? `${historyImageFile.name} (${historyImageFile.size} bytes)` : 'none',
    teamImageFile: teamImageFile ? `${teamImageFile.name} (${teamImageFile.size} bytes)` : 'none'
  });
  
  // Log détaillé des fichiers reçus
  imageFiles.forEach((file, index) => {
    console.log(`  File ${index + 1}:`, file.name, file.size, 'bytes', file.type, file instanceof File ? 'is File' : 'NOT a File');
  });
  
  const uploadedUrls: string[] = [];
  let historyImageUrl: string | null = null;
  let teamImageUrl: string | null = null;

  // Upload vers Supabase Storage (comme pour les expériences et bateaux)
  console.log('Received imageFiles:', imageFiles.length);
  if (imageFiles.length > 0) {
    try {
      const validFiles = imageFiles.filter(f => {
        if (!f || !(f instanceof File)) {
          console.log('Skipping invalid file (not a File instance):', f);
          return false;
        }
        if (f.size === 0) {
          console.log('Skipping empty file:', f.name);
          return false;
        }
        const mime = f.type || '';
        // Accepter tous les types d'images (plus permissif)
        const isImage = mime.startsWith('image/') || 
                       ['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/avif','image/svg+xml'].includes(mime) ||
                       !mime; // Si pas de type MIME, on accepte quand même (certains navigateurs ne le fournissent pas)
        if (!isImage && mime) {
          console.log('Skipping non-image file:', mime, f.name);
          return false;
        }
        console.log('Valid file to upload:', f.name, f.size, 'bytes', mime || 'no mime type');
        return true;
      });
      
      console.log('Valid files to upload:', validFiles.length, 'out of', imageFiles.length);
      if (validFiles.length > 0) {
        console.log('🚀 Starting upload to Supabase for', validFiles.length, 'file(s)...');
        try {
          const urls = await uploadMultipleToSupabase(validFiles, 'about');
          console.log('📤 Upload result from Supabase:', urls ? `${urls.length} URLs` : 'null/undefined');
          if (urls && urls.length > 0) {
            uploadedUrls.push(...urls);
            console.log('✅ Successfully uploaded', uploadedUrls.length, 'image(s) to Supabase for about page');
            urls.forEach((url, i) => {
              console.log(`  URL ${i + 1}:`, url.substring(0, 100) + '...');
            });
          } else {
            console.error('❌ Upload returned no URLs. Files may not have been uploaded.');
            console.error('  - validFiles count:', validFiles.length);
            console.error('  - uploadMultipleToSupabase returned:', urls);
            // Ne pas retourner d'erreur ici, continuer pour voir si c'est un problème d'upload ou de sauvegarde
          }
        } catch (uploadError: any) {
          console.error('❌ Error during uploadMultipleToSupabase:', uploadError);
          console.error('  - Error message:', uploadError?.message);
          console.error('  - Error stack:', uploadError?.stack);
          throw uploadError; // Re-throw pour être capturé par le catch externe
        }
      } else {
        console.warn('⚠️ No valid image files found after filtering');
      }
    } catch (e: any) {
      console.error('❌ Error uploading to Supabase Storage:', e?.message || e);
      console.error('Stack:', e?.stack);
      // Ne pas continuer si l'upload échoue - retourner une erreur
      return NextResponse.json({ 
        error: 'upload_failed', 
        details: e?.message || 'Failed to upload images to Supabase',
        message: 'Erreur lors de l\'upload des images vers Supabase' 
      }, { status: 500 });
    }
  } else {
    console.log('ℹ️ No imageFiles received (this is OK if only updating existing images)');
  }

  // Upload image Histoire
  if (historyImageFile && historyImageFile instanceof File && historyImageFile.size > 0) {
    try {
      const mime = historyImageFile.type || '';
      const allowedImages = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
      if (allowedImages.includes(mime) || mime.startsWith('image/')) {
        const urls = await uploadMultipleToSupabase([historyImageFile], 'about');
        if (urls.length > 0) {
          historyImageUrl = urls[0];
          console.log('Uploaded history image to Supabase:', urls[0]);
        }
      } else {
        console.warn('Invalid image type for history image:', mime);
      }
    } catch (e: any) {
      console.error('Error uploading history image to Supabase Storage:', e?.message || e);
    }
  } else {
    // Conserver l'image existante si pas de nouveau fichier
    const existingHistoryUrl = (data.get('aboutHistoryImageUrl') as string | null)?.trim();
    if (existingHistoryUrl && existingHistoryUrl !== 'null' && existingHistoryUrl !== '') {
      historyImageUrl = existingHistoryUrl;
    }
  }

  // Upload image Équipe
  if (teamImageFile && teamImageFile instanceof File && teamImageFile.size > 0) {
    try {
      const mime = teamImageFile.type || '';
      const allowedImages = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
      if (allowedImages.includes(mime) || mime.startsWith('image/')) {
        const urls = await uploadMultipleToSupabase([teamImageFile], 'about');
        if (urls.length > 0) {
          teamImageUrl = urls[0];
          console.log('Uploaded team image to Supabase:', urls[0]);
        }
      } else {
        console.warn('Invalid image type for team image:', mime);
      }
    } catch (e: any) {
      console.error('Error uploading team image to Supabase Storage:', e?.message || e);
    }
  } else {
    // Conserver l'image existante si pas de nouveau fichier
    const existingTeamUrl = (data.get('aboutTeamImageUrl') as string | null)?.trim();
    if (existingTeamUrl && existingTeamUrl !== 'null' && existingTeamUrl !== '') {
      teamImageUrl = existingTeamUrl;
    }
  }

  // Combiner les images existantes et les nouvelles, en évitant les doublons
  const allImagesSet = new Set<string>();
  
  // Ajouter d'abord les images existantes (celles qui n'ont pas été remplacées)
  existingImages.forEach(url => {
    if (url && url.trim() && !url.startsWith('data:') && !url.startsWith('blob:')) {
      // Normaliser l'URL pour éviter les doublons avec des variations
      const normalizedUrl = url.trim();
      allImagesSet.add(normalizedUrl);
      console.log('  ✓ Keeping existing image:', normalizedUrl);
    }
  });
  
  // Ajouter les nouvelles images uploadées
  uploadedUrls.forEach(url => {
    if (url && url.trim()) {
      const normalizedUrl = url.trim();
      // Si l'URL existe déjà (cas improbable mais possible), ne pas l'ajouter
      if (!allImagesSet.has(normalizedUrl)) {
        allImagesSet.add(normalizedUrl);
        console.log('  ✓ Adding new uploaded image:', normalizedUrl);
      } else {
        console.log('  ⚠ Skipping duplicate URL:', normalizedUrl);
      }
    }
  });
  
  const allImages = Array.from(allImagesSet);
  const aboutImageUrls = allImages.length > 0 ? JSON.stringify(allImages) : null;
  
  console.log('📊 About images summary:');
  console.log('  - Existing images received:', existingImages.length);
  console.log('  - New uploaded images:', uploadedUrls.length);
  console.log('  - Total unique images:', allImages.length);
  console.log('  - aboutImageUrls will be:', aboutImageUrls ? `${allImages.length} images` : 'NULL');
  if (allImages.length > 0) {
    console.log('  - Image URLs:', allImages);
  } else {
    console.warn('  ⚠️ WARNING: No images to save!');
    if (existingImages.length === 0 && uploadedUrls.length === 0) {
      console.warn('  ⚠️ No existing images AND no new uploads - this will clear all images!');
    }
  }

  // Mettre à jour les settings
  try {
    const updateData: any = {
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
    };
    
    // Toujours mettre à jour aboutImageUrls, même si null (pour effacer)
    updateData.aboutImageUrls = aboutImageUrls;
    
    if (historyImageUrl !== undefined) {
      updateData.aboutHistoryImageUrl = historyImageUrl;
    }
    if (teamImageUrl !== undefined) {
      updateData.aboutTeamImageUrl = teamImageUrl;
    }
    
    console.log('💾 Updating settings with image URLs...');
    const updated = await prisma.settings.update({
      where: { id: 1 },
      data: updateData,
    });
    
    console.log('✅ Settings updated successfully');
    console.log('  - aboutImageUrls saved:', updated.aboutImageUrls ? 'YES' : 'NO');
    if (updated.aboutImageUrls) {
      try {
        const savedImages = JSON.parse(updated.aboutImageUrls);
        console.log('  - Number of images in DB:', Array.isArray(savedImages) ? savedImages.length : 'not an array');
      } catch (e) {
        console.error('  - Error parsing saved aboutImageUrls:', e);
      }
    }
  } catch (updateError: any) {
    console.error('Error updating settings:', updateError);
    // Si Settings n'existe pas, créer l'enregistrement
    if (updateError?.code === 'P2025' || updateError?.code === 'P2018') {
      try {
        const createData: any = {
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
        };
        
        if (historyImageUrl !== undefined) {
          createData.aboutHistoryImageUrl = historyImageUrl;
        }
        if (teamImageUrl !== undefined) {
          createData.aboutTeamImageUrl = teamImageUrl;
        }
        
        console.log('💾 Creating new settings record with image URLs...');
        await prisma.settings.create({
          data: createData,
        });
        console.log('✅ Settings created successfully');
      } catch (createError) {
        console.error('Error creating settings:', createError);
        return NextResponse.json({ error: 'server_error', details: createError }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'server_error', details: updateError?.message }, { status: 500 });
    }
  }

  // Toujours retourner JSON pour les requêtes AJAX (depuis submitForm)
  // Cela permet au client de gérer la réponse correctement
  const acceptHeader = req.headers.get('accept') || '';
  const isAjaxRequest = acceptHeader.includes('application/json') || 
                        req.headers.get('x-requested-with') === 'XMLHttpRequest';
  
  // Retourner JSON avec les informations de sauvegarde
  return NextResponse.json({ 
    ok: true, 
    success: true,
    message: 'Settings updated successfully',
    aboutImageUrls: aboutImageUrls,
    imageCount: allImages.length
  });
}

