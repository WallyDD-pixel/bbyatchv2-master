import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRedirectUrl } from '@/lib/redirect';
import { validateEmail, validateName, validatePhone, sanitizeHtml } from '@/lib/security/validation';
import { checkContactRateLimit, getClientIP } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
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
    
    // Récupérer les données du formulaire
    const villeRaw = (form.get('ville') || '').toString();
    const passagers = form.get('passagers')?.toString();
    const experienceRaw = (form.get('experience') || '').toString();
    const part = (form.get('part') || '').toString();
    const startDate = (form.get('startDate') || '').toString();
    const endDate = (form.get('endDate') || '').toString();
    const messageRaw = (form.get('message') || '').toString();
    const emailRaw = (form.get('email') || '').toString();
    const telRaw = (form.get('tel') || '').toString();
    const boatId = form.get('boatId')?.toString();
    
    // Validation des champs requis
    if (!villeRaw || !experienceRaw || !messageRaw || !emailRaw || !part || !startDate) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    // Validation et sanitization
    const villeValidation = validateName(villeRaw, 200);
    if (!villeValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_ville', details: villeValidation.error }, { status: 400 });
    }
    const ville = villeValidation.sanitized!;

    const emailValidation = validateEmail(emailRaw);
    if (!emailValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_email', details: emailValidation.error }, { status: 400 });
    }
    const email = emailValidation.normalized!;

    const telValidation = validatePhone(telRaw || null);
    if (!telValidation.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_tel', details: telValidation.error }, { status: 400 });
    }
    const tel = telValidation.normalized || null;

    // Sanitizer les champs texte
    const experience = sanitizeHtml(experienceRaw, 200);
    const message = sanitizeHtml(messageRaw, 5000);
    
    // Validation des dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || (endDate && !dateRegex.test(endDate))) {
      return NextResponse.json({ ok: false, error: 'invalid_date' }, { status: 400 });
    }

    // Sanitizer les autres champs
    const sanitizedPassagers = passagers ? passagers.trim().slice(0, 10) : 'Non spécifié';
    const sanitizedBoatId = boatId ? boatId.trim().slice(0, 50) : null;

    // Construire un message structuré avec toutes les informations (sécurisé)
    const structuredMessage = [
      `📍 Ville/Port: ${ville}`,
      `📅 Dates: ${startDate}${endDate && endDate !== startDate ? ` → ${endDate}` : ''}`,
      `⏰ Créneau: ${part === 'FULL' ? 'Journée entière' : part === 'AM' || part === 'PM' || part === 'HALF' ? 'Demi-journée' : part}`,
      `👥 Nombre de personnes: ${sanitizedPassagers}`,
      `🎯 Type d'expérience: ${experience}`,
      sanitizedBoatId ? `🚤 Bateau sélectionné (ID): ${sanitizedBoatId}` : '',
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
    
    // Notification email → toujours l'adresse configurée dans Admin > Notifications
    try {
      const { sendEmail, getNotificationEmail } = await import('@/lib/email');
      const { newContactMessageEmail } = await import('@/lib/email-templates');

      const emailData = {
        name: ville,
        email,
        phone: tel || null,
        message: structuredMessage,
        sourcePage: 'autre-ville',
      };

      const { subject, html } = newContactMessageEmail(emailData, 'fr');
      const recipientEmail = await getNotificationEmail();

      await sendEmail({
        to: recipientEmail,
        subject,
        html,
        always: true,
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

