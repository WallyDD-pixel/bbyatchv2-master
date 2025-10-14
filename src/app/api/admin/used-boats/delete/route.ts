import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const id = String(data.get('id'));
    await (prisma as any).usedBoat.delete({ where:{ id }});
    const redirectUrl = new URL('/admin/used-boats?deleted=1', req.url);
    return NextResponse.redirect(redirectUrl);
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
