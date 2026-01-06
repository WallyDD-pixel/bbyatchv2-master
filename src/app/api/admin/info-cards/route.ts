import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMultipleToSupabase } from '@/lib/storage';
import { createRedirectUrl } from '@/lib/redirect';

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
    const contentFr = String(data.get('contentFr')||'').trim()||null;
    const contentEn = String(data.get('contentEn')||'').trim()||null;
    const ctaUrl = String(data.get('ctaUrl')||'').trim()||null;
    const ctaLabelFr = String(data.get('ctaLabelFr')||'').trim()||null;
    const ctaLabelEn = String(data.get('ctaLabelEn')||'').trim()||null;

    let imageUrl = String(data.get('imageUrl')||'').trim()||null; // hidden fallback
    const file = data.get('imageFile') as File | null;
    if(file && file.size>0 && (file as any).arrayBuffer){
      try {
        const result = await uploadMultipleToSupabase([file], 'info-cards');
        if(result.length > 0){
          imageUrl = result[0];
        }
      } catch(e){
        console.error('Error uploading to Supabase Storage:', e);
        // ignore upload error, keep null
      }
    }

    const sortRaw = String(data.get('sort')||'0');
    const sort = parseInt(sortRaw,10)||0;
    const created = await (prisma as any).infoCard.create({ 
      data:{ 
        titleFr, titleEn, descFr, descEn, 
        contentFr, contentEn, ctaUrl, ctaLabelFr, ctaLabelEn,
        imageUrl, sort 
      } 
    });
    const redirectUrl = createRedirectUrl(`/admin/info-cards?created=${created.id}`, req);
    return NextResponse.redirect(redirectUrl,303);
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
