import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';
import { validateEmail, validateName, validatePhone, sanitizeHtml } from '@/lib/security/validation';
import { checkContactRateLimit, getClientIP } from '@/lib/security/rate-limit';

export async function POST(req: Request){
  try {
    // Rate limiting
    const ip = getClientIP(req);
    const rateLimit = checkContactRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'rate_limit_exceeded', retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const nameRaw = (form.get('name')||'').toString();
    const emailRaw = (form.get('email')||'').toString();
    const phoneRaw = (form.get('phone')||'').toString();
    const messageRaw = (form.get('message')||'').toString();
    const usedBoatIdRaw = form.get('usedBoatId');
    const slug = (form.get('slug')||'').toString();
    const locale = (form.get('locale')||'').toString();

    // Validation des champs requis
    if(!nameRaw || !emailRaw || !messageRaw){
      return NextResponse.json({ ok:false, error:'missing_fields' }, { status:400 });
    }

    // Validation et sanitization
    const nameValidation = validateName(nameRaw, 200);
    if (!nameValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_name', details: nameValidation.error }, { status: 400 });
    }
    const name = nameValidation.sanitized!;

    const emailValidation = validateEmail(emailRaw);
    if (!emailValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_email', details: emailValidation.error }, { status: 400 });
    }
    const email = emailValidation.normalized!;

    const phoneValidation = validatePhone(phoneRaw || null);
    if (!phoneValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_phone', details: phoneValidation.error }, { status: 400 });
    }
    const phone = phoneValidation.normalized || null;

    // Sanitizer le message HTML
    const message = sanitizeHtml(messageRaw, 5000);
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
