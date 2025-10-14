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

export async function GET(){
  if(!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await (prisma as any).legalPage.findMany({ orderBy:{ id:'asc' } }).catch(()=>[]);
  return NextResponse.json({ pages: rows });
}

export async function POST(req: Request){
  if(!(await ensureAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try{
    const data = await req.formData();
    const slug = String(data.get('slug')||'').trim();
    const titleFr = String(data.get('titleFr')||'').trim();
    const titleEn = String(data.get('titleEn')||'').trim();
    if(!slug || !titleFr || !titleEn) return NextResponse.json({ error:'missing_fields' }, { status:400 });
    const payload:any = {
      slug, titleFr, titleEn,
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
    await (prisma as any).legalPage.create({ data: payload });
    const url = new URL('/admin/legal-pages?created=1', req.url);
    return NextResponse.redirect(url, 303);
  }catch(e:any){
    return NextResponse.json({ error:'server_error', details: e?.message }, { status: 500 });
  }
}
