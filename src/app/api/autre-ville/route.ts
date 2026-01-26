import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    // Récupérer les données du formulaire
    const ville = (form.get('ville') || '').toString().trim();
    const passagers = form.get('passagers')?.toString();
    const experience = (form.get('experience') || '').toString().trim();
    const part = (form.get('part') || '').toString();
    const startDate = (form.get('startDate') || '').toString();
    const endDate = (form.get('endDate') || '').toString();
    const message = (form.get('message') || '').toString().trim();
    const email = (form.get('email') || '').toString().trim();
    const tel = (form.get('tel') || '').toString().trim() || null;
    const boatId = form.get('boatId')?.toString();
    
    // Validation des champs requis
    if (!ville || !experience || !message || !email || !part || !startDate) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }
    
    // Construire un message structuré avec toutes les informations
    const structuredMessage = [
      `📍 Ville/Port: ${ville}`,
      `📅 Dates: ${startDate}${endDate && endDate !== startDate ? ` → ${endDate}` : ''}`,
      `⏰ Créneau: ${part === 'FULL' ? 'Journée entière' : part === 'AM' ? 'Matin' : 'Après-midi'}`,
      `👥 Nombre de personnes: ${passagers || 'Non spécifié'}`,
      `🎯 Type d'expérience: ${experience}`,
      boatId ? `🚤 Bateau sélectionné (ID): ${boatId}` : '',
      '',
      `💬 Message:`,
      message,
    ].filter(Boolean).join('\n');
    
    // Stocker dans ContactMessage avec sourcePage="autre-ville"
    console.log('Creating autre-ville contact message:', { ville, email, experience, part, startDate });
    const created = await (prisma as any).contactMessage.create({
      data: {
        name: ville, // Utiliser la ville comme nom pour faciliter l'identification
        email,
        phone: tel,
        message: structuredMessage,
        locale: 'fr', // Par défaut, peut être amélioré
        sourcePage: 'autre-ville',
      },
    });
    console.log('Autre-ville message created with ID:', created.id);
    
    // Envoyer un email à charter@bb-yachts.com pour notifier d'un nouveau message "autre"
    try {
      const { sendEmail } = await import('@/lib/email');
      const { newContactMessageEmail } = await import('@/lib/email-templates');
      
      const emailData = {
        name: ville,
        email,
        phone: tel || null,
        message: structuredMessage,
        sourcePage: 'autre-ville',
      };
      
      const { subject, html } = newContactMessageEmail(emailData, 'fr');
      
      await sendEmail({
        to: 'charter@bb-yachts.com',
        subject,
        html,
      });
    } catch (emailErr) {
      console.error('Error sending autre-ville notification email:', emailErr);
      // Ne pas bloquer la création du message si l'email échoue
    }
    
    // Redirection vers la page d'accueil avec un message de succès
    const redirectUrl = createRedirectUrl('/?autre-ville-sent=1', req);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (e: any) {
    console.error('Error saving autre-ville request:', e);
    return NextResponse.json({ ok: false, error: 'server_error', details: e?.message }, { status: 500 });
  }
}

