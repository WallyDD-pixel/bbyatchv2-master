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
    const sourcePage = slug || 'contact';
    await (prisma as any).contactMessage.create({ data:{ name, email, phone, message, usedBoatId, locale, sourcePage } });
    
    // Envoyer une notification par email pour tous les messages de contact
    // Pour les messages "autre" (autre-ville) ou depuis la page contact, envoyer à charter@bb-yachts.com
    const isOtherMessage = sourcePage === 'autre-ville' || sourcePage === 'contact';
    
    try {
      const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
      const { newContactMessageEmail } = await import('@/lib/email-templates');
      
      if (await isNotificationEnabled('contactMessage')) {
        const emailData = {
          name,
          email,
          phone: phone || null,
          message,
          sourcePage: sourcePage || null,
        };
        
        const { subject, html } = newContactMessageEmail(emailData, (locale as 'fr' | 'en') || 'fr');
        
        // Pour les messages "autre" ou depuis contact, envoyer directement à charter@bb-yachts.com
        const recipientEmail = isOtherMessage ? 'charter@bb-yachts.com' : await getNotificationEmail();
        
        await sendEmail({
          to: recipientEmail,
          subject,
          html,
        });
      }
    } catch (emailErr) {
      console.error('Error sending contact message notification email:', emailErr);
      // Ne pas bloquer l'enregistrement du message si l'email échoue
    }
    
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
