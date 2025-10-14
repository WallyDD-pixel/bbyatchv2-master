import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function POST(req:Request){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const titleFr = String(data.get('titleFr')||'').trim();
    const titleEn = String(data.get('titleEn')||'').trim();
    if(!titleFr || !titleEn) return NextResponse.json({ error:'missing_fields' },{ status:400 });
    const descFr = String(data.get('descFr')||'').trim()||null;
    const descEn = String(data.get('descEn')||'').trim()||null;

    let imageUrl = String(data.get('imageUrl')||'').trim()||null; // hidden fallback
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
      } catch(e){ /* ignore upload error, keep null */ }
    }

    const sortRaw = String(data.get('sort')||'0');
    const sort = parseInt(sortRaw,10)||0;
    const created = await (prisma as any).infoCard.create({ data:{ titleFr, titleEn, descFr, descEn, imageUrl, sort } });
    const redirectUrl = new URL(`/admin/info-cards?created=${created.id}`, req.url);
    return NextResponse.redirect(redirectUrl,303);
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
