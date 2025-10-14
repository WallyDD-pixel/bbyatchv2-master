import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';

async function ensureAdmin() {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } }).catch(() => null);
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const { id: idStr } = ctx.params;
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

  const { slug, name, city, capacity, speedKn, fuel, enginePower, pricePerDay, priceAm, pricePm, imageUrl, available, videoUrls, photoUrls } = body || {};
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

  // Gestion upload
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (newFiles.length || singleFile || videoFiles.length) { await fs.promises.mkdir(uploadDir, { recursive: true }).catch(()=>{}); }
  const allowedVideo = ['video/mp4','video/webm','video/ogg'];
  const saveFile = async (file: File) => {
    const mime = (file as any).type;
    const isImg = allowed.includes(mime);
    const isVid = allowedVideo.includes(mime);
    if (!isImg && !isVid) return null;
    const safeName = (file as any).name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + safeName;
    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const max = isVid ? 100*1024*1024 : 5*1024*1024;
    if (buffer.length > max) return null;
    await fs.promises.writeFile(filePath, buffer);
    return '/uploads/' + fileName;
  };
  let uploaded: string[] = [];
  let uploadedVideos: string[] = [];
  try {
    if (newFiles.length) {
      for (const f of newFiles) { const u = await saveFile(f); if (u) uploaded.push(u); }
    } else if (singleFile) {
      const u = await saveFile(singleFile); if (u) uploaded.push(u);
    }
    if (videoFiles.length) {
      for (const vf of videoFiles) { const vu = await saveFile(vf); if (vu) uploadedVideos.push(vu); }
    }
  } catch (e) {
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

  try {
    await (prisma as any).boat.update({
      where: { id },
      data: {
        slug,
        name,
        city,
        capacity: capacity != null && capacity !== '' ? Number(capacity) : undefined,
        speedKn: speedKn != null && speedKn !== '' ? Number(speedKn) : undefined,
        fuel: fuel != null && fuel !== '' ? Number(fuel) : undefined,
        enginePower: enginePower != null && enginePower !== '' ? Number(enginePower) : undefined,
        pricePerDay: derivedPricePerDay != null && derivedPricePerDay !== '' ? Number(derivedPricePerDay) : undefined,
        priceAm: derivedPriceAm != null && derivedPriceAm !== '' ? Number(derivedPriceAm) : undefined,
        pricePm: derivedPricePm != null && derivedPricePm !== '' ? Number(derivedPricePm) : undefined,
        imageUrl: finalImageUrl,
        available: available != null ? (typeof available === 'string' ? (available === 'true' || available === 'on') : Boolean(available)) : undefined,
        videoUrls: (() => { const arr = toList(videoUrls); const merged = Array.from(new Set([...(arr||[]), ...uploadedVideos])); return merged.length ? JSON.stringify(merged) : (arr ? null : undefined); })(),
        photoUrls: mergedPhotos.length ? JSON.stringify(mergedPhotos) : null,
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

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const { id: idStr } = ctx.params;
  const id = Number(idStr);
  try {
    await (prisma as any).boat.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
