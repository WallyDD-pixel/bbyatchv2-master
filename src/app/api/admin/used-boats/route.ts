import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(){
  try {
    const rows = await (prisma as any).usedBoat.findMany({ orderBy:[{ sort:'asc' }, { createdAt:'desc' }] });
    return NextResponse.json({ boats: rows });
  } catch(e:any){
    return NextResponse.json({ error: 'server_error', details: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    // Champs requis (sans slug désormais)
    const required = ['titleFr','year','lengthM','priceEur'];
    for(const f of required){ if(!data.get(f)) return NextResponse.json({ error:'missing_'+f },{ status:400 }); }

    // Fonction de slugify
    const slugify = (str:string)=> (str||'').toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu,'')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'') || 'item';

    const rawTitleFr = String(data.get('titleFr')).trim();
    const baseSlug = slugify(rawTitleFr);

    // Gestion fichiers images (si fournis)
    const imageFiles = data.getAll('images') as File[];
    const savedUrls: string[] = [];
    if(imageFiles && imageFiles.length){
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(),'public','uploads');
      if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{ recursive:true });
      for(const file of imageFiles){
        if(!(file as any).arrayBuffer) continue;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const fpath = path.join(uploadsDir, fname);
        (await import('fs')).writeFileSync(fpath, buffer);
        savedUrls.push(`/uploads/${fname}`);
      }
    }

    const payloadBase:any = {
      titleFr: rawTitleFr,
      titleEn: String(data.get('titleEn')||data.get('titleFr')||'').trim(),
      year: parseInt(String(data.get('year')),10),
      lengthM: parseFloat(String(data.get('lengthM'))),
      priceEur: parseInt(String(data.get('priceEur')),10),
      engines: data.get('engines')? String(data.get('engines')).trim(): null,
      engineHours: data.get('engineHours')? parseInt(String(data.get('engineHours')),10): null,
      fuelType: data.get('fuelType')? String(data.get('fuelType')).trim(): null,
      mainImage: savedUrls[0] || null,
      summaryFr: data.get('summaryFr')? String(data.get('summaryFr')).trim(): null,
      summaryEn: (data.get('summaryEn')? String(data.get('summaryEn')): String(data.get('summaryFr')||'')).trim() || null,
      descriptionFr: data.get('descriptionFr')? String(data.get('descriptionFr')).trim(): null,
      descriptionEn: (data.get('descriptionEn')? String(data.get('descriptionEn')): String(data.get('descriptionFr')||'')).trim() || null,
      status: data.get('status')? String(data.get('status')): 'listed',
      sort: data.get('sort')? parseInt(String(data.get('sort')),10): 0,
      photoUrls: savedUrls.length>1 ? JSON.stringify(savedUrls.slice(1)) : null,
    };

    // Tentatives de création avec suffixe si collision
    let attempt = 1;
    while(attempt <= 50){
      const slugCandidate = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        const created = await (prisma as any).usedBoat.create({ data: { ...payloadBase, slug: slugCandidate } });
        const redirectUrl = new URL(`/admin/used-boats?created=${created.id}`, req.url);
        return NextResponse.redirect(redirectUrl);
      } catch(e:any){
        if(e?.code === 'P2002' && e?.meta?.target?.includes('slug')){ attempt++; continue; }
        throw e; // autre erreur
      }
    }
    return NextResponse.json({ error:'server_error', details:'slug_generation_failed' },{ status:500 });
  } catch(e:any){
    console.error(e);
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
