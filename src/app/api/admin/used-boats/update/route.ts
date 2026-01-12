import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { revalidatePath } from 'next/cache';

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
    // Si keepPhotos est envoyé (même vide), on utilise cette liste, sinon on garde toutes les photos existantes
    let basePhotos = kept !== null ? kept.filter(p=> existingPhotos.includes(p)) : existingPhotos;
    console.log('📋 API - keepPhotos reçu:', keepPhotosRaw);
    console.log('📋 API - kept parsé:', kept);
    console.log('📋 API - existingPhotos:', existingPhotos);
    console.log('📋 API - basePhotos final:', basePhotos);

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
        const validFiles = imageFiles.filter(file => (file as any).arrayBuffer);
        if(validFiles.length > 0){
          const urls = await uploadMultipleToSupabase(validFiles, 'used-boats');
          newUrls.push(...urls);
        }
      } catch(e){
        console.error('Error uploading to Supabase Storage:', e);
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
    
    // Upload fichiers vidéo (si présents dans le formulaire)
    const videoFiles = data.getAll('videoFiles') as File[];
    if (videoFiles && videoFiles.length) {
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      for (const file of videoFiles) {
        if (!file || (file as any).size === 0) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
        const allowedExt = ['mp4', 'webm', 'ogg', 'mov'];
        if (!allowedExt.includes(ext)) continue;
        
        const fname = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filepath = path.join(uploadsDir, fname);
        fs.writeFileSync(filepath, buffer);
        videoUrls.push(`/uploads/${fname}`);
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
    
    // Invalider le cache pour cette page et la liste
    revalidatePath(`/admin/used-boats/${id}`);
    revalidatePath('/admin/used-boats');
    
    const redirectUrl = createRedirectUrl(`/admin/used-boats/${id}?updated=1`, req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
