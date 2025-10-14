import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin(){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any)?.role!=='admin') return null;
  return session.user;
}

export async function GET(_:Request, { params }:{ params:{ id:string }}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const row = await (prisma as any).agencyRequest.findUnique({ where:{ id: params.id } });
  if(!row) return NextResponse.json({ error:'not_found' },{ status:404 });
  return NextResponse.json({ request: row });
}

export async function PATCH(req:Request, { params }:{ params:{ id:string }}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  const body = await req.json().catch(()=>null);
  if(!body) return NextResponse.json({ error:'bad_request' },{ status:400 });
  const { status } = body;
  try {
    const updated = await (prisma as any).agencyRequest.update({ where:{ id: params.id }, data:{ status } });
    return NextResponse.json({ ok:true, request: updated });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}

export async function DELETE(_:Request, { params }:{ params:{ id:string }}){
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try { await (prisma as any).agencyRequest.delete({ where:{ id: params.id } }); return NextResponse.json({ ok:true }); }
  catch(e:any){ return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 }); }
}

export async function POST(req:Request, { params }:{ params:{ id:string }}){
  // method override via form
  if(!(await ensureAdmin())) return NextResponse.json({ error:'unauthorized' },{ status:401 });
  try {
    const data = await req.formData();
    const method = String(data.get('_method')||'').toUpperCase();
    if(method==='DELETE'){
      await (prisma as any).agencyRequest.delete({ where:{ id: params.id } });
      const url = new URL('/admin/agency-requests?deleted=1', req.url);
      return NextResponse.redirect(url,303);
    }
    if(method==='PATCH'){
      const status = String(data.get('status')||'').trim();
      await (prisma as any).agencyRequest.update({ where:{ id: params.id }, data:{ status } });
      const url = new URL(`/admin/agency-requests/${params.id}?updated=1`, req.url);
      return NextResponse.redirect(url,303);
    }
    return NextResponse.json({ error:'unsupported' },{ status:400 });
  } catch(e:any){
    return NextResponse.json({ error:'server_error', details:e?.message },{ status:500 });
  }
}
