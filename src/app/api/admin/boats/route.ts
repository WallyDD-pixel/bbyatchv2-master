import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMultipleToSupabase } from "@/lib/storage";
import { createRedirectUrl } from "@/lib/redirect";

export async function POST(req: Request) {
  const session = (await getServerSession()) as any;
  if (!session?.user || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: any = null;
  const ct = req.headers.get("content-type") || "";
  let singleImageFile: File | null = null;
  const multiImageFiles: File[] = [];
  const videoFiles: File[] = [];
  if (ct.includes("application/json")) {
    payload = await req.json().catch(() => null);
  } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const fd = await req.formData();
    // Récupération fichiers multiples (name = imageFiles)
    fd.forEach((value, key) => {
      if (key === 'imageFiles' && value instanceof File) multiImageFiles.push(value);
      if (key === 'videoFiles' && value instanceof File) videoFiles.push(value);
    });
    // Ancienne compat: imageFile (simple)
    singleImageFile = (fd.get('imageFile') as File) || null;
    payload = Object.fromEntries(fd.entries());
  }
  if (!payload) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  let { slug, name, city, capacity, speedKn, enginePower, lengthM, pricePerDay, priceAm, pricePm, priceSunset, priceAgencyPerDay, priceAgencyAm, priceAgencyPm, priceAgencySunset, imageUrl, available, videoUrls, photoUrls, avantagesFr, avantagesEn, optionsInclusesFr, optionsInclusesEn, skipperRequired, skipperPrice } = payload || {};
  if (!name) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const slugify = (str: string) => str.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-');
  if (!slug || !slug.trim()) slug = slugify(name || '');
  if (!slug) slug = 'boat-' + Date.now();
  // Vérifie unicité et incrémente si nécessaire
  let finalSlug = slug;
  let c = 1;
  while (await (prisma as any).boat.findUnique({ where: { slug: finalSlug } })) {
    c += 1;
    finalSlug = `${slug}-${c}`;
    if (c > 50) break; // garde-fou
  }

  // Upload images et vidéos vers Supabase Storage
  const savedImageUrls: string[] = [];
  const savedVideoUrls: string[] = [];
  const allowedImages = ['image/jpeg','image/png','image/webp','image/gif'];
  const allowedVideos = ['video/mp4','video/webm','video/ogg'];
  
  try {
    // Upload images
    if (multiImageFiles.length) {
      const imageFiles = multiImageFiles.filter(f => {
        const mime = (f as any).type;
        return allowedImages.includes(mime);
      });
      if (imageFiles.length > 0) {
        const urls = await uploadMultipleToSupabase(imageFiles, 'boats');
        savedImageUrls.push(...urls);
      }
    } else if (singleImageFile) {
      const mime = (singleImageFile as any).type;
      if (allowedImages.includes(mime)) {
        const result = await uploadMultipleToSupabase([singleImageFile], 'boats');
        if (result.length > 0) savedImageUrls.push(...result);
      }
    }
    
    // Upload vidéos
    if (videoFiles.length) {
      const validVideos = videoFiles.filter(f => {
        const mime = (f as any).type;
        return allowedVideos.includes(mime);
      });
      if (validVideos.length > 0) {
        const urls = await uploadMultipleToSupabase(validVideos, 'boats/videos');
        savedVideoUrls.push(...urls);
      }
    }
  } catch (e) {
    console.error('Error uploading to Supabase Storage:', e);
    return NextResponse.json({ error: 'image_upload_failed' }, { status: 500 });
  }
  let finalImageUrl: string | null = null;
  if (savedImageUrls.length) finalImageUrl = savedImageUrls[0]; else finalImageUrl = imageUrl ?? null;

  const toBool = (v: any) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "on" || v === "true";
    return true;
  };
  const toList = (v: any) => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return [];
      if (s.startsWith("[") && s.endsWith("]")) {
        try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; }
      }
      return s.split(",").map((x) => x.trim()).filter(Boolean);
    }
    return [];
  };

  // Combine photoUrls existantes + nouvelles (sans doublons)
  const existingPhotos = toList(photoUrls);
  const allPhotos = Array.from(new Set([...savedImageUrls, ...existingPhotos]));
  const existingVideos = toList(videoUrls);
  const videoArray = Array.from(new Set([...savedVideoUrls, ...existingVideos]));

  // Prépare données JSON stringifiées
  const photoArray = allPhotos;

  // Préparation dérivation prix partiels si manquants
  const dayNum = pricePerDay != null && pricePerDay !== "" ? Number(pricePerDay) : 0;
  const hasAm = priceAm != null && priceAm !== "";
  const hasPm = pricePm != null && pricePm !== "";
  if (dayNum > 0) {
    if (!hasAm && !hasPm) {
      const half = Math.round(dayNum / 2);
      priceAm = String(half);
      pricePm = String(dayNum - half);
    } else if (!hasAm && hasPm) {
      const pmVal = Number(pricePm);
      priceAm = String(Math.max(dayNum - pmVal, 0));
    } else if (hasAm && !hasPm) {
      const amVal = Number(priceAm);
      pricePm = String(Math.max(dayNum - amVal, 0));
    }
  }

  // Gérer la relation avec City
  let cityId: number | null = null;
  if (city && city.trim()) {
    try {
      // Chercher la ville existante
      let existingCity = await (prisma as any).city.findUnique({ where: { name: city.trim() } });
      if (!existingCity) {
        // Créer la ville si elle n'existe pas
        existingCity = await (prisma as any).city.create({ data: { name: city.trim() } });
      }
      cityId = existingCity.id;
    } catch (e) {
      console.error('Error handling city:', e);
      // Continue sans ville si erreur
    }
  }

  try {
    const created = await (prisma as any).boat.create({
      data: {
        slug: finalSlug,
        name,
        cityId: cityId,
        capacity: capacity != null && capacity !== "" ? Number(capacity) : 0,
        speedKn: speedKn != null && speedKn !== "" ? Number(speedKn) : 0, // Champ requis
        enginePower: enginePower != null && enginePower !== "" ? Number(enginePower) : null,
        lengthM: lengthM != null && lengthM !== "" ? Number(lengthM) : null,
        pricePerDay: dayNum,
        priceAm: priceAm != null && priceAm !== "" ? Number(priceAm) : null,
        pricePm: pricePm != null && pricePm !== "" ? Number(pricePm) : null,
        priceSunset: priceSunset != null && priceSunset !== "" ? Number(priceSunset) : null,
        priceAgencyPerDay: priceAgencyPerDay != null && priceAgencyPerDay !== "" ? Number(priceAgencyPerDay) : null,
        priceAgencyAm: priceAgencyAm != null && priceAgencyAm !== "" ? Number(priceAgencyAm) : null,
        priceAgencyPm: priceAgencyPm != null && priceAgencyPm !== "" ? Number(priceAgencyPm) : null,
        priceAgencySunset: priceAgencySunset != null && priceAgencySunset !== "" ? Number(priceAgencySunset) : null,
        skipperRequired: skipperRequired != null ? toBool(skipperRequired) : true, // Par défaut true
        skipperPrice: skipperPrice != null && skipperPrice !== "" ? Number(skipperPrice) : 350,
        imageUrl: finalImageUrl,
        available: available != null ? toBool(available) : true,
        videoUrls: videoArray.length ? JSON.stringify(videoArray) : null,
        photoUrls: photoArray.length ? JSON.stringify(photoArray) : null,
        avantagesFr: avantagesFr != null && avantagesFr !== "" ? String(avantagesFr).trim() : null,
        avantagesEn: avantagesEn != null && avantagesEn !== "" ? String(avantagesEn).trim() : null,
        optionsInclusesFr: optionsInclusesFr != null && optionsInclusesFr !== "" ? String(optionsInclusesFr).trim() : null,
        optionsInclusesEn: optionsInclusesEn != null && optionsInclusesEn !== "" ? String(optionsInclusesEn).trim() : null,
        options: {
          create: (() => { const labels = payload['optionLabel[]'] || payload['optionLabel']; const prices = payload['optionPrice[]'] || payload['optionPrice']; const lblArr = Array.isArray(labels)? labels: labels? [labels]: []; const prArr = Array.isArray(prices)? prices: prices? [prices]: []; return lblArr.map((l:any,i:number)=> ({ label: String(l).trim(), price: prArr[i]!=null && prArr[i]!=='' ? Number(prArr[i]) : null })).filter((o:any)=> o.label); })()
        }
      },
      include: { options: true }
    });
    const isForm = ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded");
    if (isForm) {
      // Redirection après création :
      // - Si APP_BASE_URL est défini (ex: https://preprod.bbservicescharter.com),
      //   on l'utilise pour éviter les redirections vers localhost:xxxx.
      // - Sinon on retombe sur l'origin de la requête.
      // Redirection avec URL correcte (évite localhost)
      const redirectUrl = createRedirectUrl(`/admin/boats?created=${created.slug}`, req);
      return NextResponse.redirect(redirectUrl, 303);
    }
    return NextResponse.json({
      ok: true,
      id: created.id,
      slug: created.slug,
      imageUrl: finalImageUrl,
      photoUrls: photoArray,
      videoUrls: videoArray,
    });
  } catch (e: any) {
    console.error('Error creating boat:', e);
    if (e?.code === "P2002") return NextResponse.json({ error: "slug_unique" }, { status: 409 });
    return NextResponse.json({ error: "server_error", details: e?.message || String(e) }, { status: 500 });
  }
}
