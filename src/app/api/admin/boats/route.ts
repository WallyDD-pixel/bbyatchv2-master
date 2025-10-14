import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const session = (await getServerSession(auth as any)) as any;
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

  let { slug, name, city, capacity, speedKn, fuel, enginePower, pricePerDay, priceAm, pricePm, imageUrl, available, videoUrls, photoUrls } = payload || {};
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

  // Upload images (multi prioritaire). Première = imageUrl principale
  const savedImageUrls: string[] = [];
  const savedVideoUrls: string[] = [];
  const allowedImages = ['image/jpeg','image/png','image/webp','image/gif'];
  const allowedVideos = ['video/mp4','video/webm','video/ogg'];
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (multiImageFiles.length > 0 || singleImageFile) {
    try { await fs.promises.mkdir(uploadDir, { recursive: true }); } catch {}
  }
  const handleSaveMedia = async (file: File) => {
    const mime = (file as any).type;
    const isImage = allowedImages.includes(mime);
    const isVideo = allowedVideos.includes(mime);
    if (!isImage && !isVideo) return null;
    const safeName = (file as any).name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safeName;
    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const max = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB vidéo, 5MB image
    if (buffer.length > max) return null;
    await fs.promises.writeFile(filePath, buffer);
    return '/uploads/' + fileName;
  };
  try {
    if (multiImageFiles.length) {
      for (const f of multiImageFiles) {
        const url = await handleSaveMedia(f);
        if (url) savedImageUrls.push(url);
      }
    } else if (singleImageFile) {
      const url = await handleSaveMedia(singleImageFile);
      if (url) savedImageUrls.push(url);
    }
    if (videoFiles.length) {
      for (const vf of videoFiles) {
        const vurl = await handleSaveMedia(vf);
        if (vurl) savedVideoUrls.push(vurl);
      }
    }
  } catch (e) {
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

  try {
    const created = await (prisma as any).boat.create({
      data: {
        slug: finalSlug,
        name,
        city: city ?? null,
        capacity: capacity != null && capacity !== "" ? Number(capacity) : 0,
        speedKn: speedKn != null && speedKn !== "" ? Number(speedKn) : 0,
        fuel: fuel != null && fuel !== "" ? Number(fuel) : null,
        enginePower: enginePower != null && enginePower !== "" ? Number(enginePower) : null,
        pricePerDay: dayNum,
        priceAm: priceAm != null && priceAm !== "" ? Number(priceAm) : null,
        pricePm: pricePm != null && pricePm !== "" ? Number(pricePm) : null,
        imageUrl: finalImageUrl,
        available: available != null ? toBool(available) : true,
        videoUrls: videoArray.length ? JSON.stringify(videoArray) : null,
        photoUrls: photoArray.length ? JSON.stringify(photoArray) : null,
        options: {
          create: (() => { const labels = payload['optionLabel[]'] || payload['optionLabel']; const prices = payload['optionPrice[]'] || payload['optionPrice']; const lblArr = Array.isArray(labels)? labels: labels? [labels]: []; const prArr = Array.isArray(prices)? prices: prices? [prices]: []; return lblArr.map((l:any,i:number)=> ({ label: String(l).trim(), price: prArr[i]!=null && prArr[i]!=='' ? Number(prArr[i]) : null })).filter((o:any)=> o.label); })()
        }
      },
      include: { options: true }
    });
    const isForm = ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded");
    if (isForm) {
      return NextResponse.redirect(new URL(`/admin/boats?created=${created.slug}`, req.url), 303);
    }
    return NextResponse.json({ ok: true, id: created.id, slug: created.slug, imageUrl: finalImageUrl, photoUrls: photoArray, videoUrls: videoArray });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "slug_unique" }, { status: 409 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
