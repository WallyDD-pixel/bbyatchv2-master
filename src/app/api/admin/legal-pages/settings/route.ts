import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

async function ensureAdmin(){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any).role !== 'admin') return null;
  return session.user;
}

export async function GET(){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const s = await prisma.settings.findFirst();
  return NextResponse.json({ settings: s });
}

export async function POST(req: Request){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const data = await req.formData();
  const legalBaseSlug = String(data.get('legalBaseSlug')||'').trim() || null;
  const legalTermsSlug = String(data.get('legalTermsSlug')||'').trim() || null;
  const legalPrivacySlug = String(data.get('legalPrivacySlug')||'').trim() || null;
  const updated = await (prisma as any).settings.update({
    where: { id: 1 },
    data: { legalBaseSlug, legalTermsSlug, legalPrivacySlug }
  }).catch(async()=>{
    // si Settings pas encore créé
    return (prisma as any).settings.create({ data: { id:1, legalBaseSlug, legalTermsSlug, legalPrivacySlug }});
  });
  return NextResponse.json({ ok:true, settings: updated });
}
