import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

export async function POST(req: Request){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any).role !== 'admin') return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const id = parseInt(String(data.get('id')), 10);
    if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    await (prisma as any).usedBoat.delete({ where: { id } });
    const redirectUrl = createRedirectUrl('/admin/used-boats?deleted=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
