import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any)?.role !== 'admin') return null;
  return session.user;
}

async function handleUpdate(req:Request, id:number, ctype:string){
  let slug:string|undefined, titleFr:string|undefined, titleEn:string|undefined, descFr:string|undefined, descEn:string|undefined, timeFr:string|undefined, timeEn:string|undefined, imageUrl:string|undefined;
  if(ctype.includes('multipart/form-data')){
    const data = await req.formData();
    slug = String(data.get('slug')||'').trim();
    titleFr = String(data.get('titleFr')||'').trim();
    titleEn = String(data.get('titleEn')||'').trim();
    descFr = String(data.get('descFr')||'').trim();
    descEn = String(data.get('descEn')||'').trim();
    timeFr = String(data.get('timeFr')||'').trim()||undefined;
    timeEn = String(data.get('timeEn')||'').trim()||undefined;
    imageUrl = String(data.get('imageUrl')||'').trim()||undefined;
    const imageFile = data.get('imageFile') as File | null;
    if(imageFile && (imageFile as any).arrayBuffer){
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(),'public','uploads');
      if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{ recursive:true });
      const buf = Buffer.from(await imageFile.arrayBuffer());
      const ext = (imageFile.name.split('.').pop()||'jpg').toLowerCase();
      const fname = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir,fname), buf);
      imageUrl = `/uploads/${fname}`;
    }
  } else {
    const body = await req.json().catch(()=>null); if(!body) return { error:true, resp: NextResponse.json({ error:'bad_request' },{ status:400 }) };
    ({ slug, titleFr, titleEn, descFr, descEn, timeFr, timeEn, imageUrl } = body);
  }
  if(!titleFr || !titleEn) return { error:true, resp: NextResponse.json({ error:'missing_fields' },{ status:400 }) };
  const existing = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!existing) return { error:true, resp: NextResponse.json({ error:'not_found' },{ status:404 }) };
  if(slug && slug !== existing.slug){
    const taken = await (prisma as any).experience.findUnique({ where:{ slug } });
    if(taken) return { error:true, resp: NextResponse.json({ error:'slug_taken' },{ status:409 }) };
  }
  const updated = await (prisma as any).experience.update({ where:{ id }, data:{ slug: slug||existing.slug, titleFr, titleEn, descFr: descFr??'', descEn: descEn??'', timeFr: timeFr??null, timeEn: timeEn??null, imageUrl: imageUrl??existing.imageUrl } });
  return { error:false, updated };
}

export async function GET(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  const row = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ experience: row });
}

export async function PUT(req:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    const r = await handleUpdate(req,id,ctype);
    if(r.error) return r.resp;
    return NextResponse.json({ ok:true, experience: r.updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    await (prisma as any).experience.delete({ where:{ id } });
    return NextResponse.json({ ok:true });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function POST(req:Request, { params }: { params:{ id:string } }){
  // Method override pour formulaires HTML (PUT / DELETE)
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const ctype = req.headers.get('content-type')||'';
    if(ctype.includes('multipart/form-data')){
      const data = await req.formData();
      const method = String(data.get('_method')||'').toUpperCase();
      if(method==='DELETE'){
        await (prisma as any).experience.delete({ where:{ id } });
        const url = new URL('/admin/experiences?deleted=1', req.url);
        return NextResponse.redirect(url,303);
      }
      // Repasser req (pas réutilisable) -> recréer formData lecture: on a déjà data
      // Simpler: reconstruire update en utilisant data déjà lue
      // On recrée un faux Request si nécessaire mais ici on peut dupliquer logique
      let slug = String(data.get('slug')||'').trim();
      let titleFr = String(data.get('titleFr')||'').trim();
      let titleEn = String(data.get('titleEn')||'').trim();
      let descFr = String(data.get('descFr')||'').trim();
      let descEn = String(data.get('descEn')||'').trim();
      let timeFr = String(data.get('timeFr')||'').trim()||undefined;
      let timeEn = String(data.get('timeEn')||'').trim()||undefined;
      let imageUrl = String(data.get('imageUrl')||'').trim()||undefined;
      const imageFile = data.get('imageFile') as File | null;
      if(imageFile && (imageFile as any).arrayBuffer){
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(),'public','uploads');
        if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{ recursive:true });
        const buf = Buffer.from(await imageFile.arrayBuffer());
        const ext = (imageFile.name.split('.').pop()||'jpg').toLowerCase();
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir,fname), buf);
        imageUrl = `/uploads/${fname}`;
      }
      if(!titleFr || !titleEn){
        return NextResponse.json({ error:'missing_fields' },{ status:400 });
      }
      const existing = await (prisma as any).experience.findUnique({ where:{ id } });
      if(!existing) return NextResponse.json({ error:'not_found' },{ status:404 });
      if(slug && slug !== existing.slug){
        const taken = await (prisma as any).experience.findUnique({ where:{ slug } });
        if(taken) return NextResponse.json({ error:'slug_taken' },{ status:409 });
      }
      await (prisma as any).experience.update({ where:{ id }, data:{ slug: slug||existing.slug, titleFr, titleEn, descFr: descFr??'', descEn: descEn??'', timeFr: timeFr??null, timeEn: timeEn??null, imageUrl: imageUrl??existing.imageUrl } });
      const url = new URL(`/admin/experiences/${id}?updated=1`, req.url);
      return NextResponse.redirect(url,303);
    }
    return NextResponse.json({ error:'unsupported' },{ status:400 });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
