import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

export async function POST(req: Request){
  try {
    const form = await req.formData();
    const name = (form.get('name')||'').toString().slice(0,200).trim();
    const email = (form.get('email')||'').toString().slice(0,320).trim();
    const phone = (form.get('phone')||'').toString().slice(0,50).trim() || null;
    const message = (form.get('message')||'').toString().slice(0,5000).trim();
    const usedBoatIdRaw = form.get('usedBoatId');
    const slug = (form.get('slug')||'').toString();
    const locale = (form.get('locale')||'').toString();
    if(!name || !email || !message){
      return NextResponse.json({ ok:false, error:'missing_fields' }, { status:400 });
    }
    let usedBoatId: number | undefined = undefined;
    if(usedBoatIdRaw){ const n = Number(usedBoatIdRaw); if(Number.isInteger(n)) usedBoatId = n; }
    await (prisma as any).contactMessage.create({ data:{ name, email, phone, message, usedBoatId, locale, sourcePage: slug || 'contact' } });
    // Si c'est un message depuis la page contact (pas de slug), rediriger vers /contact
    const redirectPath = slug && usedBoatId 
      ? `/used-sale/${slug}?sent=1`
      : `/contact?sent=1${locale ? `&lang=${locale}` : ''}`;
    const redirectUrl = createRedirectUrl(redirectPath, req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch(e){
    console.error(e);
    return NextResponse.json({ ok:false, error:'server_error' }, { status:500 });
  }
}
