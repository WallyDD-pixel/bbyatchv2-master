import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

export const runtime = 'nodejs';

async function ensureAdmin(){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function GET(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'bad_id' },{ status:400 });
  const row = await (prisma as any).legalPage.findUnique({ where:{ id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ page: row });
}

export async function PUT(req:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'bad_id' },{ status:400 });
  try{
    const body = await req.json().catch(()=>null);
    if(!body) return NextResponse.json({ error:'bad_request' },{ status:400 });
    const updated = await (prisma as any).legalPage.update({ where:{ id }, data: body });
    return NextResponse.json({ ok:true, page: updated });
  }catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }: { params:{ id:string } }){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'bad_id' },{ status:400 });
  try{
    await (prisma as any).legalPage.delete({ where:{ id } });
    return NextResponse.json({ ok:true });
  }catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function POST(req:Request, { params }: { params:{ id:string } }){
  // Form fallback for PUT/DELETE
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const id = parseInt(params.id,10); if(isNaN(id)) return NextResponse.json({ error:'bad_id' },{ status:400 });
  const data = await req.formData();
  const method = String(data.get('_method')||'').toUpperCase();
  if(method==='DELETE'){
    await (prisma as any).legalPage.delete({ where:{ id } });
    const redirectUrl = createRedirectUrl('/admin/legal-pages?deleted=1', req);
    return NextResponse.redirect(redirectUrl,303);
  }
  // PUT fallback multipart/x-www-form-urlencoded
  const payload:any = {
    slug: String(data.get('slug')||'').trim(),
    titleFr: String(data.get('titleFr')||'').trim(),
    titleEn: String(data.get('titleEn')||'').trim(),
    introFr: String(data.get('introFr')||'').trim() || null,
    introEn: String(data.get('introEn')||'').trim() || null,
    contentFr: String(data.get('contentFr')||'').trim() || null,
    contentEn: String(data.get('contentEn')||'').trim() || null,
    cancellationFr: String(data.get('cancellationFr')||'').trim() || null,
    cancellationEn: String(data.get('cancellationEn')||'').trim() || null,
    paymentFr: String(data.get('paymentFr')||'').trim() || null,
    paymentEn: String(data.get('paymentEn')||'').trim() || null,
    fuelDepositFr: String(data.get('fuelDepositFr')||'').trim() || null,
    fuelDepositEn: String(data.get('fuelDepositEn')||'').trim() || null,
  };
  await (prisma as any).legalPage.update({ where:{ id }, data: payload });
  const redirectUrl = createRedirectUrl(`/admin/legal-pages/${id}?updated=1`, req);
  return NextResponse.redirect(redirectUrl,303);
}
