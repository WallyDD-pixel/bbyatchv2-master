import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/security/auth-helpers";
import { prisma } from "@/lib/prisma";
import { uploadMultipleToSupabase } from "@/lib/storage";

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
  if (ct.includes('application/json')) {
    body = await req.json().catch(()=>({}));
  } else if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    fd.forEach((value, key) => {
      if (key === 'imageFiles' && value instanceof File) newFiles.push(value);
      if (key === 'videoFiles' && value instanceof File) videoFiles.push(value);
    });
    singleFile = (fd.get('imageFile') as File) || null;
    body = Object.fromEntries(fd.entries());
  } else if (ct.includes('application/x-www-form-urlencoded')) {
    body = await req.formData().then(fd=>Object.fromEntries(fd.entries()));
  } else {
    body = await req.json().catch(()=>({}));
  }

  const { slug, name, city, capacity, speedKn, fuel, enginePower, lengthM, pricePerDay, priceAm, pricePm, imageUrl, available, videoUrls, photoUrls, avantagesFr, avantagesEn, optionsInclusesFr, optionsInclusesEn, skipperRequired, skipperPrice } = body || {};
  const optionsPayload = body.options; // tableau attendu {id?, label, price|null}
  const experiencesPayload = body.experiences; // [{experienceId, price|null}]
  // Dérivation éventuelle prix AM/PM si uniquement day fourni
  let derivedPricePerDay = pricePerDay;
  let derivedPriceAm = priceAm;
  let derivedPricePm = pricePm;
  if (derivedPricePerDay != null && derivedPricePerDay !== '' && (derivedPriceAm == null || derivedPriceAm === '') && (derivedPricePm == null || derivedPricePm === '')) {
    const dayNum = Number(derivedPricePerDay) || 0;
    const half = Math.round(dayNum / 2);
    derivedPriceAm = String(half);
    derivedPricePm = String(dayNum - half);
  } else if (derivedPricePerDay != null && derivedPricePerDay !== '') {
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
  const allowedVideo = ['video/mp4','video/webm','video/ogg'];
  
  let uploaded: string[] = [];
  let uploadedVideos: string[] = [];
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
            console.warn(`⚠️ Image file rejected: ${file.name} - ${validation.error}`);
          }
        }
      }
      
      if (validImageFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validImageFiles, 'boats');
        uploaded.push(...urls);
      }
    } else if (singleFile) {
      const mime = (singleFile as any).type;
      if (allowed.includes(mime)) {
        const { validateImageFile } = await import('@/lib/security/file-validation');
        const validation = await validateImageFile(singleFile);
        if (validation.valid) {
          const result = await uploadMultipleToSupabase([singleFile], 'boats');
          if (result.length > 0) uploaded.push(...result);
        } else {
          console.warn(`⚠️ Image file rejected: ${singleFile.name} - ${validation.error}`);
        }
      }
    }
    
    // Upload vidéos avec validation
    if (videoFiles.length) {
      const { validateVideoFile } = await import('@/lib/security/file-validation');
      const validVideoFiles: File[] = [];
      
      for (const file of videoFiles) {
        const mime = (file as any).type;
        if (allowedVideo.includes(mime)) {
          const validation = await validateVideoFile(file);
          if (validation.valid) {
            validVideoFiles.push(file);
          } else {
            console.warn(`⚠️ Video file rejected: ${file.name} - ${validation.error}`);
          }
        }
      }
      
      if (validVideoFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(validVideoFiles, 'boats/videos');
        uploadedVideos.push(...urls);
      }
    }
  } catch (e) {
    console.error('Error uploading to Supabase Storage:', e);
    return NextResponse.json({ error: 'image_upload_failed' }, { status: 500 });
  }

  let finalImageUrl = imageUrl;
  if (uploaded.length) finalImageUrl = uploaded[0];

  // Fusion photoUrls existants + nouveaux uploads
  const listPhotos = toList(photoUrls);
  const existingPhotos = Array.isArray(listPhotos) ? listPhotos : [];
  let mergedPhotos = existingPhotos;
  if (uploaded.length) {
    mergedPhotos = Array.from(new Set([...(uploaded.length ? uploaded : []), ...existingPhotos]));
  } else if (uploaded.length) {
    mergedPhotos = uploaded;
  }

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
        imageUrl: finalImageUrl,
        available: available != null ? (typeof available === 'string' ? (available === 'true' || available === 'on') : Boolean(available)) : undefined,
        videoUrls: (() => { const arr = toList(videoUrls); const merged = Array.from(new Set([...(arr||[]), ...uploadedVideos])); return merged.length ? JSON.stringify(merged) : (arr ? null : undefined); })(),
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
    return NextResponse.json({ ok: true, imageUrl: finalImageUrl, photoUrls: mergedPhotos, videoUrls: (toList(videoUrls)||[]).concat(uploadedVideos) });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
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
