import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request){
  try {
    const form = await req.formData();
    const name = (form.get('name')||'').toString().slice(0,200).trim();
    const email = (form.get('email')||'').toString().slice(0,320).trim();
    const message = (form.get('message')||'').toString().slice(0,5000).trim();
    const usedBoatIdRaw = form.get('usedBoatId');
    const slug = (form.get('slug')||'').toString();
    const locale = (form.get('locale')||'').toString();
    if(!name || !email || !message){
      return NextResponse.json({ ok:false, error:'missing_fields' }, { status:400 });
    }
    let usedBoatId: number | undefined = undefined;
    if(usedBoatIdRaw){ const n = Number(usedBoatIdRaw); if(Number.isInteger(n)) usedBoatId = n; }
    await (prisma as any).contactMessage.create({ data:{ name, email, message, usedBoatId, locale, sourcePage: slug || undefined } });
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const url = `${proto}://${host}/used-sale/${slug}?sent=1`;
    return NextResponse.redirect(url);
  } catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:'server_error' }, { status:500 });
  }
}
