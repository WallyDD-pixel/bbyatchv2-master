import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

export const runtime = 'nodejs';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function GET(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  const row = await (prisma as any).infoCard.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ card: row });
}

export async function PUT(req:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const body = await req.json().catch(()=>null);
    if(!body) return NextResponse.json({ error:'bad_request' },{ status:400 });
    const { titleFr, titleEn, descFr, descEn, imageUrl, sort } = body;
    if(!titleFr || !titleEn) return NextResponse.json({ error:'missing_fields' },{ status:400 });
    const updated = await (prisma as any).infoCard.update({ where:{ id }, data:{ titleFr, titleEn, descFr: descFr??null, descEn: descEn??null, imageUrl: imageUrl??null, sort: typeof sort==='number'? sort: 0 } });
    return NextResponse.json({ ok:true, card: updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try { await (prisma as any).infoCard.delete({ where:{ id } }); return NextResponse.json({ ok:true }); }
  catch(e:any){ return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 }); }
}

export async function POST(req:Request, { params }: { params:{ id:string } }){
  // override via formulaire HTML
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'invalid_id' },{ status:400 });
  try {
    const data = await req.formData();
    const method = String(data.get('_method')||'').toUpperCase();
    if(method==='DELETE'){
      await (prisma as any).infoCard.delete({ where:{ id } });
      const redirectUrl = createRedirectUrl('/admin/info-cards?deleted=1', req);
      return NextResponse.redirect(redirectUrl,303);
    }
    // PUT fallback multipart
    const titleFr = String(data.get('titleFr')||'').trim();
    const titleEn = String(data.get('titleEn')||'').trim();
    if(!titleFr || !titleEn) return NextResponse.json({ error:'missing_fields' },{ status:400 });
    const descFr = String(data.get('descFr')||'').trim()||null;
    const descEn = String(data.get('descEn')||'').trim()||null;
    let imageUrl = String(data.get('imageUrl')||'').trim()||null; // hidden current value
    const file = data.get('imageFile') as File | null;
    if(file && file.size>0 && (file as any).arrayBuffer){
      try {
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(),'public','uploads');
        if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir,{ recursive:true });
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
        const fname = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir,fname), buf);
        imageUrl = `/uploads/${fname}`;
      } catch(e){ /* ignore */ }
    }
    const sort = parseInt(String(data.get('sort')||'0'),10)||0;
    await (prisma as any).infoCard.update({ where:{ id }, data:{ titleFr, titleEn, descFr, descEn, imageUrl, sort } });
    const redirectUrl = createRedirectUrl(`/admin/info-cards/${id}?updated=1`, req);
    return NextResponse.redirect(redirectUrl,303);
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
