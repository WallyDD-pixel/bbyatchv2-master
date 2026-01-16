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
    
    // Envoyer un email à charter@bb-yachts.com pour les messages "autre" (sans usedBoatId, donc page contact générale)
    if (!usedBoatId && (sourcePage === 'contact' || sourcePage === 'autre' || slug === 'autre')) {
      try {
        const emailBody = `Nouveau message de contact reçu

Nom: ${name}
Email: ${email}
Téléphone: ${phone || 'Non renseigné'}
Message:
${message}

Source: ${sourcePage}
Date: ${new Date().toLocaleString('fr-FR')}
`;
        
        // Envoyer via API route d'email (à créer ou utiliser service externe)
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'charter@bb-yachts.com',
            subject: `Nouveau message de contact - ${name}`,
            text: emailBody,
          }),
        }).catch(err => console.error('Error sending email:', err));
      } catch (emailErr) {
        console.error('Error sending notification email for contact message:', emailErr);
        // Ne pas bloquer la création du message si l'email échoue
      }
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
