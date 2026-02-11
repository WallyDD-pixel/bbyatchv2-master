import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/security/auth-helpers";
import { prisma } from "@/lib/prisma";
import { uploadMultipleToSupabase } from "@/lib/storage";
import path from "path";
import fs from "fs";

// Timeout plus long pour les uploads d'images/vidéos
export const maxDuration = 60;

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  // Next.js 15: params is a Promise
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);

  // Récupération état avant modifications pour déterminer fichiers supprimés
  const oldBoat = await (prisma as any).boat.findUnique({ where: { id } }).catch(() => null);

  const ct = req.headers.get('content-type') || '';
  let body: any = {};
  let newFiles: File[] = [];
  let singleFile: File | null = null;
  let videoFiles: File[] = [];
  let replaceImageUrl: string | null = null;
  if (ct.includes('application/json')) {
    body = await req.json().catch(()=>({}));
  } else if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    fd.forEach((value, key) => {
      if (key === 'imageFiles' && value instanceof File) newFiles.push(value);
      if (key === 'videoFiles' && value instanceof File) videoFiles.push(value);
    });
    singleFile = (fd.get('imageFile') as File) || null;
    replaceImageUrl = (fd.get('replaceImageUrl') as string) || null;
    body = Object.fromEntries(fd.entries());
  } else if (ct.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData();
    replaceImageUrl = (fd.get('replaceImageUrl') as string) || null;
    body = Object.fromEntries(fd.entries());
  } else {
    body = await req.json().catch(()=>({}));
  }

  const { slug, name, city, capacity, speedKn, fuel, enginePower, lengthM, pricePerDay, priceAm, pricePm, priceSunset, priceAgencyPerDay, priceAgencyAm, priceAgencyPm, priceAgencySunset, imageUrl, available, videoUrls, photoUrls, avantagesFr, avantagesEn, optionsInclusesFr, optionsInclusesEn, skipperRequired, skipperPrice } = body || {};
  const optionsPayload = body.options; // tableau attendu {id?, label, price|null}
  const experiencesPayload = body.experiences; // [{experienceId, price|null}]
  // Dérivation éventuelle prix AM/PM si uniquement day fourni
  // IMPORTANT: Ne pas modifier les prix explicitement entrés (comme priceSunset)
  let derivedPricePerDay = pricePerDay;
  let derivedPriceAm = priceAm;
  let derivedPricePm = pricePm;
  // Ne calculer automatiquement que si les prix AM/PM sont vides ET que priceSunset n'est pas fourni
  // Si priceSunset est fourni, on ne touche pas aux prix AM/PM
  const hasExplicitSunset = priceSunset != null && priceSunset !== '';
  if (!hasExplicitSunset && derivedPricePerDay != null && derivedPricePerDay !== '' && (derivedPriceAm == null || derivedPriceAm === '') && (derivedPricePm == null || derivedPricePm === '')) {
    const dayNum = Number(derivedPricePerDay) || 0;
    const half = Math.round(dayNum / 2);
    derivedPriceAm = String(half);
    derivedPricePm = String(dayNum - half);
  } else if (!hasExplicitSunset && derivedPricePerDay != null && derivedPricePerDay !== '') {
    const dayNum = Number(derivedPricePerDay) || 0;
    if ((derivedPriceAm == null || derivedPriceAm === '') && (derivedPricePm != null && derivedPricePm !== '')) {
      const pmVal = Number(derivedPricePm) || 0;
      derivedPriceAm = String(Math.max(dayNum - pmVal, 0));
    }
    if ((derivedPricePm == null || derivedPricePm === '') && (derivedPriceAm != null && derivedPriceAm !== '')) {
      const amVal = Number(derivedPriceAm) || 0;
      derivedPricePm = String(Math.max(dayNum - amVal, 0));
    }
  }

  const toList = (v: any) => {
    if (v === undefined) return undefined; // ne pas modifier
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return [];
      if (s.startsWith('[') && s.endsWith(']')) { try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; } }
      return s.split(',').map(x=>x.trim()).filter(Boolean);
    }
    return [];
  };

  // Gestion upload vers Supabase Storage avec validation de sécurité
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  const allowedVideo = ['video/mp4','video/webm','video/ogg','video/quicktime'];
  
  let uploaded: string[] = [];
  let uploadedVideos: string[] = [];
  const validationErrors: string[] = [];
  try {
    // Upload images avec validation
    if (newFiles.length) {
      const { validateImageFile } = await import('@/lib/security/file-validation');
      const validImageFiles: File[] = [];
      
      for (const file of newFiles) {
        const mime = (file as any).type;
        if (allowed.includes(mime)) {
          const validation = await validateImageFile(file);
          if (validation.valid) {
            validImageFiles.push(file);
          } else {
            const msg = `${file.name}: ${validation.error}`;
            console.warn(`⚠️ Image file rejected: ${msg}`);
            validationErrors.push(msg);
          }
        } else {
          const msg = `${file.name}: Type non autorisé (${mime}). Utilisez JPEG, PNG, WebP ou GIF.`;
          validationErrors.push(msg);
        }
      }
      
      if (newFiles.length > 0 && validImageFiles.length === 0) {
        return NextResponse.json({
          error: 'image_upload_failed',
          message: validationErrors[0] || 'Aucune image valide. Formats acceptés : JPEG, PNG, WebP, GIF. Max 20 Mo par fichier.',
          details: validationErrors.join(' ; '),
        }, { status: 400 });
      }
      
      if (validImageFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validImageFiles, 'boats');
        if (urls.length === 0) {
          return NextResponse.json({
            error: 'image_upload_failed',
            message: 'Échec de l\'upload vers le stockage. Vérifiez NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et le bucket Supabase.',
            details: 'Aucune URL retournée par Supabase Storage.',
          }, { status: 500 });
        }
        uploaded.push(...urls);
      }
    } else if (singleFile) {
      const mime = (singleFile as any).type;
      if (allowed.includes(mime)) {
        const { validateImageFile } = await import('@/lib/security/file-validation');
        const validation = await validateImageFile(singleFile);
        if (validation.valid) {
          const result = await uploadMultipleToSupabase([singleFile], 'boats');
          if (result.length === 0) {
            return NextResponse.json({
              error: 'image_upload_failed',
              message: 'Échec de l\'upload vers le stockage. Vérifiez la configuration Supabase (URL, clé, bucket).',
            }, { status: 500 });
          }
          uploaded.push(...result);
        } else {
          return NextResponse.json({
            error: 'image_upload_failed',
            message: validation.error || 'Image refusée',
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          error: 'image_upload_failed',
          message: `Type non autorisé (${mime}). Utilisez JPEG, PNG, WebP ou GIF.`,
        }, { status: 400 });
      }
    }
    
    // Upload vidéos avec validation
    if (videoFiles.length) {
      const { validateVideoFile } = await import('@/lib/security/file-validation');
      const validVideoFiles: File[] = [];
      const videoErrors: string[] = [];
      
      for (const file of videoFiles) {
        const mime = (file as any).type;
        if (allowedVideo.includes(mime)) {
          const validation = await validateVideoFile(file);
          if (validation.valid) {
            validVideoFiles.push(file);
          } else {
            const msg = `${file.name}: ${validation.error}`;
            console.warn(`⚠️ Video file rejected: ${msg}`);
            videoErrors.push(msg);
          }
        } else {
          const msg = `${file.name}: Type non autorisé (${mime}). Utilisez MP4, WebM, OGG ou MOV (max 200 Mo).`;
          videoErrors.push(msg);
        }
      }
      
      if (videoFiles.length > 0 && validVideoFiles.length === 0) {
        return NextResponse.json({
          error: 'video_upload_failed',
          message: videoErrors[0] || 'Aucune vidéo valide. Formats acceptés : MP4, WebM, OGG, MOV. Max 200 Mo par fichier.',
          details: videoErrors.join(' ; '),
        }, { status: 400 });
      }
      
      if (validVideoFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validVideoFiles, 'boats/videos');
        uploadedVideos.push(...urls);
      }
    }
  } catch (e: any) {
    console.error('Error uploading to Supabase Storage:', e);
    const errorMessage = e?.message || 'Erreur lors de l\'upload des fichiers';
    // Si c'est une erreur de validation, donner plus de détails
    if (errorMessage.includes('validation') || errorMessage.includes('rejected')) {
      return NextResponse.json({ 
        error: 'image_upload_failed', 
        details: errorMessage,
        message: 'Fichier rejeté : ' + errorMessage 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'image_upload_failed', 
      details: errorMessage,
      message: 'Erreur lors de l\'upload : ' + errorMessage 
    }, { status: 500 });
  }

  let finalImageUrl = imageUrl;
  if (uploaded.length) finalImageUrl = uploaded[0];

  // Fusion photoUrls existants + nouveaux uploads
  // IMPORTANT: photoUrls du body contient la liste complète des photos existantes
  // On ajoute seulement les nouvelles uploadées, en évitant les doublons
  const listPhotos = toList(photoUrls);
  const existingPhotos = Array.isArray(listPhotos) ? listPhotos : [];
  
  // Débogage
  console.log('📸 Photos existantes reçues:', existingPhotos.length);
  console.log('📸 Photos uploadées:', uploaded.length);
  
  let mergedPhotos = existingPhotos;
  
  if (uploaded.length) {
    if (replaceImageUrl) {
      // Remplacer l'image spécifiée par la nouvelle
      const index = existingPhotos.indexOf(replaceImageUrl);
      if (index >= 0) {
        // Remplacer à la même position
        mergedPhotos = [...existingPhotos];
        mergedPhotos[index] = uploaded[0];
        // Ajouter les autres images uploadées à la fin si nécessaire (sans doublons)
        if (uploaded.length > 1) {
          const additional = uploaded.slice(1).filter(url => !mergedPhotos.includes(url));
          mergedPhotos.push(...additional);
        }
      } else {
        // Si l'URL n'est pas trouvée, ajouter à la fin (sans doublons)
        const newPhotos = uploaded.filter(url => !existingPhotos.includes(url));
        mergedPhotos = [...existingPhotos, ...newPhotos];
      }
    } else {
      // Ajouter les nouvelles images à la fin (sans doublons)
      // Filtrer les URLs déjà présentes dans existingPhotos
      const newPhotos = uploaded.filter(url => !existingPhotos.includes(url));
      if (newPhotos.length !== uploaded.length) {
        console.warn('⚠️ Certaines images uploadées étaient déjà présentes, doublons évités');
      }
      mergedPhotos = [...existingPhotos, ...newPhotos];
    }
  }
  
  // Débogage final
  console.log('📸 Photos finales après fusion:', mergedPhotos.length);
  console.log('📸 Doublons détectés:', mergedPhotos.length !== Array.from(new Set(mergedPhotos)).length);
  
  // S'assurer qu'il n'y a vraiment aucun doublon
  mergedPhotos = Array.from(new Set(mergedPhotos));

  // Gestion de la relation City (comme dans POST, mais en mode update)
  let cityId: number | undefined;
  if (city !== undefined && city !== null) {
    const trimmed = String(city).trim();
    if (!trimmed) {
      // Si la valeur envoyée est vide, on "détache" la ville
      cityId = null as any;
    } else {
      try {
        let existingCity = await (prisma as any).city.findUnique({ where: { name: trimmed } });
        if (!existingCity) {
          existingCity = await (prisma as any).city.create({ data: { name: trimmed } });
        }
        cityId = existingCity.id;
      } catch (e) {
        console.error('Error handling city on update:', e);
        // on laisse cityId = undefined pour ne pas casser l'update
      }
    }
  }

  try {
    await (prisma as any).boat.update({
      where: { id },
      data: {
        slug,
        name,
        ...(cityId !== undefined ? { cityId } : {}),
        capacity: capacity != null && capacity !== '' ? Number(capacity) : undefined,
        speedKn: speedKn != null && speedKn !== '' ? Number(speedKn) : undefined,
        fuel: fuel != null && fuel !== '' ? Number(fuel) : undefined,
        enginePower: enginePower != null && enginePower !== '' ? Number(enginePower) : undefined,
        lengthM: lengthM != null && lengthM !== '' ? Number(lengthM) : undefined,
        pricePerDay: derivedPricePerDay != null && derivedPricePerDay !== '' ? Number(derivedPricePerDay) : undefined,
        priceAm: derivedPriceAm != null && derivedPriceAm !== '' ? Number(derivedPriceAm) : undefined,
        pricePm: derivedPricePm != null && derivedPricePm !== '' ? Number(derivedPricePm) : undefined,
        priceSunset: priceSunset != null && priceSunset !== '' ? Number(priceSunset) : undefined,
        priceAgencyPerDay: priceAgencyPerDay != null && priceAgencyPerDay !== '' ? Number(priceAgencyPerDay) : undefined,
        priceAgencyAm: priceAgencyAm != null && priceAgencyAm !== '' ? Number(priceAgencyAm) : undefined,
        priceAgencyPm: priceAgencyPm != null && priceAgencyPm !== '' ? Number(priceAgencyPm) : undefined,
        priceAgencySunset: priceAgencySunset != null && priceAgencySunset !== '' ? Number(priceAgencySunset) : undefined,
        imageUrl: finalImageUrl,
        available: available != null ? (typeof available === 'string' ? (available === 'true' || available === 'on') : Boolean(available)) : undefined,
        videoUrls: (() => { 
          const arr = toList(videoUrls) || [];
          // Débogage
          console.log('📹 Vidéos existantes reçues:', arr.length);
          console.log('📹 Vidéos uploadées:', uploadedVideos.length);
          
          // Filtrer les vidéos déjà présentes pour éviter les doublons
          const newVideos = uploadedVideos.filter(url => !arr.includes(url));
          if (newVideos.length !== uploadedVideos.length) {
            console.warn('⚠️ Certaines vidéos uploadées étaient déjà présentes, doublons évités');
          }
          const merged = [...arr, ...newVideos];
          
          // S'assurer qu'il n'y a vraiment aucun doublon
          const uniqueMerged = Array.from(new Set(merged));
          console.log('📹 Vidéos finales après fusion:', uniqueMerged.length);
          console.log('📹 Doublons détectés:', merged.length !== uniqueMerged.length);
          
          return uniqueMerged.length ? JSON.stringify(uniqueMerged) : (arr.length ? null : undefined);
        })(),
        photoUrls: mergedPhotos.length ? JSON.stringify(mergedPhotos) : null,
        avantagesFr: avantagesFr != null ? String(avantagesFr).trim() || null : undefined,
        avantagesEn: avantagesEn != null ? String(avantagesEn).trim() || null : undefined,
        optionsInclusesFr: optionsInclusesFr != null ? String(optionsInclusesFr).trim() || null : undefined,
        optionsInclusesEn: optionsInclusesEn != null ? String(optionsInclusesEn).trim() || null : undefined,
        skipperRequired: skipperRequired != null ? (typeof skipperRequired === 'string' ? (skipperRequired === 'true' || skipperRequired === 'on') : Boolean(skipperRequired)) : undefined,
        skipperPrice: skipperPrice != null && skipperPrice !== '' ? Number(skipperPrice) : undefined,
        ...(Array.isArray(optionsPayload) ? {
          options: {
            deleteMany: { boatId: id, NOT: optionsPayload.filter((o:any)=> o.id).map((o:any)=> ({ id: Number(o.id) })) },
            upsert: optionsPayload.filter((o:any)=> o.label && o.label.trim()).map((o:any)=> ({
              where: { id: o.id ? Number(o.id) : 0 },
              update: { label: o.label.trim(), price: o.price===''||o.price==null? null: Number(o.price) },
              create: { label: o.label.trim(), price: o.price===''||o.price==null? null: Number(o.price) }
            }))
          }
        } : {}),
        ...(Array.isArray(experiencesPayload) ? {
          boatExperiences: {
            deleteMany: { boatId: id, NOT: experiencesPayload.map((e:any)=> ({ experienceId: Number(e.experienceId) })) },
            upsert: experiencesPayload.map((e:any)=> ({
              where: { boatId_experienceId: { boatId: id, experienceId: Number(e.experienceId) } },
              update: { price: e.price===''||e.price==null? null: Number(e.price) },
              create: { experienceId: Number(e.experienceId), price: e.price===''||e.price==null? null: Number(e.price) }
            }))
          }
        } : {})
      },
    });

    // Suppression physique des images retirées
    (async () => {
      try {
        if (oldBoat) {
          const prevPhotos: string[] = (() => { try { return oldBoat.photoUrls ? JSON.parse(oldBoat.photoUrls) : []; } catch { return []; } })();
          const prevMain: string | undefined = oldBoat.imageUrl || undefined;
          const newPhotos: string[] = Array.isArray(mergedPhotos) ? mergedPhotos : [];
          const newMain: string | undefined = finalImageUrl || undefined;
          const removedSet = new Set<string>();
          prevPhotos.forEach(p => { if (!newPhotos.includes(p)) removedSet.add(p); });
          if (prevMain && prevMain.startsWith('/uploads/') && prevMain !== newMain && !newPhotos.includes(prevMain)) removedSet.add(prevMain);
          for (const rel of removedSet) {
            if (!rel.startsWith('/uploads/')) continue;
            // Vérifier si utilisé par un autre bateau (recherche substring car JSON stringifié)
            const count = await (prisma as any).boat.count({ where: { OR: [ { imageUrl: rel }, { photoUrls: { contains: rel } } ] } });
            if (count <= 0) {
              const abs = path.join(process.cwd(), 'public', rel.replace(/^\/+/, ''));
              fs.promises.unlink(abs).catch(()=>{});
            }
          }
        }
      } catch {}
    })();
    // Éviter les doublons dans la réponse pour videoUrls
    const finalVideoUrls = (() => {
      const arr = toList(videoUrls) || [];
      const newVideos = uploadedVideos.filter(url => !arr.includes(url));
      const merged = [...arr, ...newVideos];
      // S'assurer qu'il n'y a vraiment aucun doublon
      return Array.from(new Set(merged));
    })();
    
    // S'assurer qu'il n'y a vraiment aucun doublon dans mergedPhotos aussi
    const finalPhotoUrls = Array.from(new Set(mergedPhotos));
    
    // Toujours retourner du JSON, même pour les requêtes multipart/form-data
    // Vérifier si c'est une requête fetch (avec header Accept: application/json)
    const acceptHeader = req.headers.get('accept') || '';
    const isFetchRequest = acceptHeader.includes('application/json') || ct.includes('application/json');
    
    // Pour les requêtes fetch, toujours retourner du JSON
    if (isFetchRequest || !ct.includes('multipart/form-data')) {
      return NextResponse.json({ 
        ok: true, 
        imageUrl: finalImageUrl, 
        photoUrls: finalPhotoUrls, 
        videoUrls: finalVideoUrls 
      });
    }
    
    // Pour les formulaires HTML classiques (sans header Accept), on peut faire une redirection
    // Mais en production, on devrait toujours retourner du JSON pour éviter les problèmes
    return NextResponse.json({ 
      ok: true, 
      imageUrl: finalImageUrl, 
      photoUrls: finalPhotoUrls, 
      videoUrls: finalVideoUrls 
    });
  } catch (e) {
    console.error('❌ Erreur lors de la mise à jour du bateau:', e);
    const msg = e instanceof Error ? e.message : 'Erreur lors de la mise à jour';
    return NextResponse.json({ 
      error: 'image_upload_failed', 
      message: msg,
      details: process.env.NODE_ENV === 'development' ? (e instanceof Error ? e.stack : String(e)) : undefined,
    }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  // Next.js 15: params is a Promise
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  try {
    await (prisma as any).boat.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
