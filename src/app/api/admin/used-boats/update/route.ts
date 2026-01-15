import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';

export async function POST(req: Request){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const id = parseInt(String(data.get('id')),10);
    if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });

    // Récupération existant
    const existing = await (prisma as any).usedBoat.findUnique({ where:{ id }, select:{ slug:true, mainImage:true, photoUrls:true } });
    if(!existing) return NextResponse.json({ error:'not_found' },{ status:404 });

    const existingPhotos: string[] = existing.photoUrls ? (()=>{ try { return JSON.parse(existing.photoUrls); } catch { return []; } })() : [];
    let mainImage: string | null = existing.mainImage || null;

    // keepPhotos = ordre restant des anciennes photos (hors main) envoyé par le formulaire
    let keepPhotosRaw = String(data.get('keepPhotos')||'');
    let kept: string[] | null = null;
    if(keepPhotosRaw){
      try { const parsed = JSON.parse(keepPhotosRaw); if(Array.isArray(parsed)) kept = parsed.filter(p=> typeof p==='string'); } catch {}
    }
    let basePhotos = kept !== null ? kept.filter(p=> existingPhotos.includes(p)) : existingPhotos;

    // mainImageChoice éventuel
    const mainChoice = String(data.get('mainImageChoice')||'').trim();
    if(mainChoice && (mainChoice === existing.mainImage || existingPhotos.includes(mainChoice))){
      if(mainChoice !== mainImage){
        // replacer ancienne main dans photos si différente
        if(mainImage && !basePhotos.includes(mainImage)) basePhotos.unshift(mainImage);
        // retirer la nouvelle main de la liste photos si elle y était
        basePhotos = basePhotos.filter(p=> p !== mainChoice);
        mainImage = mainChoice;
      }
    }

    // Upload nouvelles images vers Supabase Storage
    const imageFiles = data.getAll('images') as File[];
    const newUrls: string[] = [];
    if(imageFiles && imageFiles.length){
      try {
        const validFiles = imageFiles.filter(file => {
          if (!file || !(file instanceof File) || file.size === 0) return false;
          const mime = file.type || '';
          return mime.startsWith('image/');
        });
        
        if (validFiles.length > 0) {
          const urls = await uploadMultipleToSupabase(validFiles, 'used-boats');
          newUrls.push(...urls);
        }
      } catch (e: any) {
        console.error('Error uploading images to Supabase Storage:', e?.message || e);
        // Continue même si l'upload échoue
      }
    }

    // Si pas de main -> première nouvelle devient main
    if(!mainImage && newUrls.length){
      mainImage = newUrls.shift() || null;
    }

    // Fusion finale (ordre: basePhotos existantes réordonnées + nouvelles)
    const mergedPhotos = Array.from(new Set([...basePhotos, ...newUrls]));

    // Gestion des vidéos
    let videoUrls: string[] = [];
    const videoUrlsInput = String(data.get('videoUrls') || '').trim();
    if (videoUrlsInput) {
      try {
        const parsed = JSON.parse(videoUrlsInput);
        if (Array.isArray(parsed)) videoUrls = parsed.filter(v => typeof v === 'string');
      } catch {}
    }
    // Si pas de vidéos dans l'input, récupérer les existantes
    if (videoUrls.length === 0) {
      const existingBoat = await (prisma as any).usedBoat.findUnique({ where: { id }, select: { videoUrls: true } });
      if (existingBoat?.videoUrls) {
        try {
          const parsed = typeof existingBoat.videoUrls === 'string' ? JSON.parse(existingBoat.videoUrls) : existingBoat.videoUrls;
          if (Array.isArray(parsed)) videoUrls = parsed.filter(v => typeof v === 'string');
        } catch {}
      }
    }
    
    // Upload fichiers vidéo vers Supabase Storage (si présents dans le formulaire)
    const videoFiles = data.getAll('videoFiles') as File[];
    if (videoFiles && videoFiles.length) {
      try {
        const validVideos = videoFiles.filter(file => {
          if (!file || !(file instanceof File) || file.size === 0) return false;
          const mime = file.type || '';
          const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov'];
          return allowedMimes.includes(mime) || mime.startsWith('video/');
        });
        
        if (validVideos.length > 0) {
          const urls = await uploadMultipleToSupabase(validVideos, 'used-boats/videos');
          videoUrls.push(...urls);
        }
      } catch (e: any) {
        console.error('Error uploading videos to Supabase Storage:', e?.message || e);
        // Continue même si l'upload échoue
      }
    }

    const update:any = {
      slug: existing.slug,
      titleFr: String(data.get('titleFr')).trim(),
      titleEn: (data.get('titleEn')? String(data.get('titleEn')): String(data.get('titleFr')||'')).trim(),
      year: parseInt(String(data.get('year')),10),
      lengthM: parseFloat(String(data.get('lengthM'))),
      priceEur: parseInt(String(data.get('priceEur')),10),
      engines: data.get('engines')? String(data.get('engines')).trim(): null,
      engineHours: data.get('engineHours')? parseInt(String(data.get('engineHours')),10): null,
      fuelType: data.get('fuelType')? String(data.get('fuelType')).trim(): null,
      mainImage,
      summaryFr: data.get('summaryFr')? String(data.get('summaryFr')).trim(): null,
      summaryEn: (data.get('summaryEn')? String(data.get('summaryEn')): String(data.get('summaryFr')||'')).trim() || null,
      descriptionFr: data.get('descriptionFr')? String(data.get('descriptionFr')).trim(): null,
      descriptionEn: (data.get('descriptionEn')? String(data.get('descriptionEn')): String(data.get('descriptionFr')||'')).trim() || null,
      status: data.get('status')? String(data.get('status')): 'listed',
      sort: data.get('sort')? parseInt(String(data.get('sort')),10): 0,
      photoUrls: mergedPhotos.length ? JSON.stringify(mergedPhotos) : null,
      videoUrls: videoUrls.length ? JSON.stringify(videoUrls) : null,
    };

    await (prisma as any).usedBoat.update({ where:{ id }, data: update });
    const redirectUrl = new URL(`/admin/used-boats/${id}?updated=1`, req.url);
    return NextResponse.redirect(redirectUrl);
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
