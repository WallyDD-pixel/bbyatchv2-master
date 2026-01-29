import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Empêche le cache et garantit l'exécution côté serveur
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log('[webhook] ===== WEBHOOK RECEIVED =====');
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('[webhook] ❌ Missing stripe-signature header');
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  // Récupère settings pour choisir la clé Stripe et le webhook secret adaptés
  const settings = await (prisma as any).settings.findFirst({ 
    where: { id: 1 }, 
    select: { 
      stripeMode: true, 
      stripeTestSk: true, 
      stripeLiveSk: true, 
      stripeTestWebhookSecret: true,
      stripeLiveWebhookSecret: true,
      platformCommissionPct: true 
    } 
  });
  const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
  const secretKey = mode === 'live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
  const webhookSecret = mode === 'live' ? (settings as any)?.stripeLiveWebhookSecret : (settings as any)?.stripeTestWebhookSecret;
  
  // Fallback sur la variable d'environnement si le secret n'est pas dans la base
  const finalWebhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!finalWebhookSecret) {
    console.error(`[webhook] ❌ Missing webhook secret for mode ${mode} (check settings or STRIPE_WEBHOOK_SECRET env var)`);
    return NextResponse.json({ error: 'missing_webhook_secret' }, { status: 500 });
  }
  
  if (!secretKey) {
    console.error('[webhook] ❌ Missing Stripe secret key in settings');
    return NextResponse.json({ error: 'missing_stripe_key' }, { status: 500 });
  }

  console.log(`[webhook] Mode: ${mode}, Secret key present: ${!!secretKey}, Webhook secret present: ${!!finalWebhookSecret}`);

  const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });

  let rawBody: string;
  try {
    rawBody = await req.text();
    console.log(`[webhook] Body length: ${rawBody.length} bytes`);
  } catch {
    console.error('[webhook] ❌ Failed to read request body');
    return NextResponse.json({ error: 'read_body_failed' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, finalWebhookSecret);
    console.log(`[webhook] ✅ Event verified: ${event.type} (id: ${event.id})`);
  } catch (err: any) {
    console.error('[webhook] ❌ Invalid signature:', err?.message);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    console.log(`[webhook] Processing event type: ${event.type}`);
    
    if (event.type === 'checkout.session.completed') {
      console.log('[webhook] Processing checkout.session.completed');
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Vérifier si le paiement a bien été effectué
      if (session.payment_status !== 'paid') {
        console.log(`[webhook] ⚠️ Session ${session.id} n'est pas payée (status: ${session.payment_status})`);
        return new NextResponse('ok', { status: 200 });
      }
      
      // Récupérer les données de la réservation depuis les metadata Stripe
      const metadata = session.metadata;
      if (!metadata || !metadata.userId || !metadata.boatId) {
        console.error('[webhook] ❌ Metadata manquantes pour créer la réservation');
        return new NextResponse('ok', { status: 200 });
      }
      
      // Vérifier si la réservation existe déjà (au cas où le webhook serait appelé plusieurs fois)
      const existingReservation = await prisma.reservation.findFirst({
        where: { stripeSessionId: session.id },
        select: { id: true, depositPaidAt: true }
      });
      
      if (existingReservation) {
        console.log(`[webhook] ✅ Réservation ${existingReservation.id} existe déjà pour cette session`);
        // Mettre à jour le statut si nécessaire
        if (!existingReservation.depositPaidAt) {
          await prisma.reservation.update({
            where: { id: existingReservation.id },
            data: {
              depositPaidAt: new Date(),
              status: 'deposit_paid',
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
              stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
            }
          });
        }
        return new NextResponse('ok', { status: 200 });
      }
      
      // Créer la réservation maintenant que le paiement est confirmé
      console.log('[webhook] Création de la réservation après paiement confirmé');
      const reservation = await prisma.reservation.create({
        data: {
          userId: metadata.userId,
          boatId: parseInt(metadata.boatId, 10),
          reference: metadata.reference,
          startDate: new Date(metadata.startDate),
          endDate: new Date(metadata.endDate),
          part: metadata.part,
          passengers: metadata.passengers ? parseInt(metadata.passengers, 10) : null,
          totalPrice: parseFloat(metadata.totalPrice),
          depositAmount: parseFloat(metadata.depositAmount),
          remainingAmount: parseFloat(metadata.remainingAmount),
          depositPercent: parseInt(metadata.depositPercent, 10),
          status: 'deposit_paid',
          locale: metadata.locale || 'fr',
          currency: metadata.currency || 'eur',
          metadata: metadata.metadata,
          stripeSessionId: session.id,
          depositPaidAt: new Date(),
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
          commissionAmount: settings?.platformCommissionPct ? Math.round(parseFloat(metadata.totalPrice) * (settings.platformCommissionPct / 100)) : undefined,
        }
      });
      
      console.log(`[webhook] ✅ Réservation créée: ${reservation.id} (${reservation.reference})`);
      
      // Envoyer une notification pour la nouvelle réservation
      try {
        const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
        const { newReservationEmail, paymentReceivedEmail } = await import('@/lib/email-templates');
        
        const user = await prisma.user.findUnique({
          where: { id: metadata.userId },
          select: { name: true, firstName: true, lastName: true, email: true, phone: true }
        });
        const boat = await prisma.boat.findUnique({
          where: { id: parseInt(metadata.boatId, 10) },
          select: { name: true, capacity: true, lengthM: true, speedKn: true, skipperRequired: true, options: { select: { id: true, label: true } } }
        });
        
        if (user && boat) {
          const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Client';
          const locale = (metadata.locale as 'fr' | 'en') || 'fr';
          const meta = metadata.metadata ? JSON.parse(metadata.metadata) : {};
          const experienceTitle = meta.experienceTitleFr || meta.experienceTitleEn || undefined;
          
          // Récupérer les noms des options sélectionnées
          const optionIds = meta.optionIds && Array.isArray(meta.optionIds) ? meta.optionIds : [];
          const optionNames = boat.options
            .filter(opt => optionIds.includes(opt.id))
            .map(opt => opt.label)
            .filter(Boolean);
          
          const reservationData = {
            id: reservation.id,
            reference: reservation.reference,
            boatName: boat.name,
            userName,
            userEmail: user.email || '',
            userPhone: user.phone || null,
            startDate: metadata.startDate.split('T')[0],
            endDate: metadata.endDate.split('T')[0],
            part: metadata.part,
            passengers: reservation.passengers,
            totalPrice: reservation.totalPrice,
            depositAmount: reservation.depositAmount,
            remainingAmount: reservation.remainingAmount,
            status: reservation.status,
            experienceTitle,
            waterToys: meta.waterToys === true || meta.waterToys === 'true',
            childrenCount: meta.childrenCount !== undefined ? meta.childrenCount : null,
            specialNeeds: meta.specialNeeds || null,
            wantsExcursion: meta.wantsExcursion === true || meta.wantsExcursion === 'true',
            departurePort: meta.departurePort || null,
            optionNames,
            boatCapacity: boat.capacity || null,
            boatLength: boat.lengthM || null,
            boatSpeed: boat.speedKn || null,
            skipperRequired: boat.skipperRequired || false,
            skipperPrice: meta.effectiveSkipperPrice ? parseFloat(meta.effectiveSkipperPrice) : null,
            currency: reservation.currency || 'eur',
            locale,
          };
          
          const notificationEmail = await getNotificationEmail();
          
          // Récupérer le logo depuis les settings
          const settings = await prisma.settings.findFirst({ select: { logoUrl: true } });
          const logoUrl = (settings as any)?.logoUrl || null;
          
          // Notification nouvelle réservation avec facture en pièce jointe
          if (await isNotificationEnabled('reservation')) {
            const { subject, html } = await newReservationEmail(reservationData, locale, logoUrl);
            
            // Générer la facture PDF en pièce jointe
            const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf');
            const invoicePDF = await generateInvoicePDF(reservation.id);
            
            const attachments = invoicePDF ? [{
              filename: `Facture_${reservation.reference || reservation.id}.pdf`,
              content: invoicePDF,
              contentType: 'application/pdf',
            }] : undefined;
            
            await sendEmail({ 
              to: notificationEmail, 
              subject, 
              html,
              attachments,
            });
          }
          
          // Notification paiement reçu avec facture en pièce jointe
          if (await isNotificationEnabled('paymentReceived') && reservation.depositAmount) {
            // paymentReceivedEmail n'a pas besoin de logo pour l'instant, mais on pourrait l'ajouter
            const { subject, html } = paymentReceivedEmail(reservationData, reservation.depositAmount, locale);
            
            // Générer la facture PDF en pièce jointe
            const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf');
            const invoicePDF = await generateInvoicePDF(reservation.id);
            
            const attachments = invoicePDF ? [{
              filename: `Facture_${reservation.reference || reservation.id}.pdf`,
              content: invoicePDF,
              contentType: 'application/pdf',
            }] : undefined;
            
            await sendEmail({ 
              to: notificationEmail, 
              subject, 
              html,
              attachments,
            });
          }
          
          // Envoyer aussi un email au client avec la facture
          if (user.email) {
            const { subject: clientSubject, html: clientHtml } = await newReservationEmail(reservationData, locale, logoUrl);
            const { generateInvoicePDF } = await import('@/lib/generate-invoice-pdf');
            const invoicePDF = await generateInvoicePDF(reservation.id);
            
            const attachments = invoicePDF ? [{
              filename: `Facture_${reservation.reference || reservation.id}.pdf`,
              content: invoicePDF,
              contentType: 'application/pdf',
            }] : undefined;
            
            await sendEmail({ 
              to: user.email, 
              subject: locale === 'fr' 
                ? `Confirmation de votre réservation - ${reservationData.boatName}`
                : `Your booking confirmation - ${reservationData.boatName}`,
              html: clientHtml,
              attachments,
            });
          }
        }
      } catch (emailErr) {
        console.error('Error sending webhook notification emails:', emailErr);
        // Ne pas bloquer le webhook si l'email échoue
      }
    } else if (
      event.type === 'checkout.session.async_payment_failed' || 
      event.type === 'checkout.session.expired'
    ) {
      console.log(`[webhook] Processing cancellation event: ${event.type}`);
      // Si le paiement est annulé/échoué, aucune réservation n'a été créée, donc rien à supprimer
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[webhook] Session ${session.id} annulée/échouée/expirée - aucune réservation à supprimer (réservation créée uniquement après paiement confirmé)`);
    } else {
      console.log(`[webhook] ℹ️ Event type non géré: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook] ❌ Webhook handling error:', err);
    return NextResponse.json({ error: 'process_error' }, { status: 500 });
  }

  // Répondre toujours 200 rapidement (idempotent)
  console.log('[webhook] ===== WEBHOOK PROCESSED SUCCESSFULLY =====');
  return new NextResponse('ok', { status: 200 });
}
