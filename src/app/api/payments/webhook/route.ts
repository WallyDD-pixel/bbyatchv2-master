import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Empêche le cache et garantit l'exécution côté serveur
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'missing_webhook_secret' }, { status: 500 });
  }

  // Récupère settings pour choisir la clé Stripe adaptée
  const settings = await prisma.settings.findFirst({ where: { id: 1 }, select: { stripeMode: true, stripeTestSk: true, stripeLiveSk: true, platformCommissionPct: true } });
  const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
  const secretKey = mode === 'live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
  if (!secretKey) {
    return NextResponse.json({ error: 'missing_stripe_key' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2025-07-30.basil' });

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'read_body_failed' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Invalid signature', err?.message);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Vérifier que le paiement est bien réussi
      if (session.payment_status !== 'paid') {
        console.log('[Webhook] Payment not completed, status:', session.payment_status);
        return new NextResponse('ok', { status: 200 });
      }
      
      const metadata = session.metadata || {};
      
      // Si reservationId existe, c'est l'ancien système (mise à jour)
      const reservationId = metadata.reservationId;
      if (reservationId) {
        const existing = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { depositPaidAt: true, totalPrice: true } });
        if (existing && !existing.depositPaidAt) {
          let commissionAmount: number | undefined;
          if (settings?.platformCommissionPct && existing.totalPrice) {
            commissionAmount = Math.round(existing.totalPrice * (settings.platformCommissionPct / 100));
          }
          await prisma.reservation.update({
            where: { id: reservationId },
            data: {
              depositPaidAt: new Date(),
              status: 'deposit_paid',
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
              stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
              commissionAmount,
            }
          });
          console.log('[Webhook] Updated existing reservation:', reservationId);
        }
      } else {
        // Nouveau système : créer la réservation à partir des métadonnées Stripe
        const userId = metadata.userId;
        const boatId = metadata.boatId ? parseInt(metadata.boatId, 10) : null;
        const reference = metadata.reference;
        
        if (!userId || !boatId || !reference) {
          console.error('[Webhook] Missing required metadata:', { userId, boatId, reference });
          return new NextResponse('ok', { status: 200 });
        }
        
        // Vérifier qu'une réservation avec cette référence n'existe pas déjà (idempotence)
        const existing = await prisma.reservation.findFirst({
          where: { reference },
          select: { id: true }
        });
        
        if (existing) {
          console.log('[Webhook] Reservation already exists with reference:', reference);
          return new NextResponse('ok', { status: 200 });
        }
        
        // Créer la réservation avec toutes les données des métadonnées
        const startDate = new Date(metadata.startDate);
        const endDate = new Date(metadata.endDate);
        const totalPrice = parseFloat(metadata.totalPrice || '0');
        const depositAmount = parseFloat(metadata.depositAmount || '0');
        const remainingAmount = parseFloat(metadata.remainingAmount || '0');
        const depositPercent = parseInt(metadata.depositPercent || '20', 10);
        const passengers = metadata.passengers ? parseInt(metadata.passengers, 10) : undefined;
        
        // Reconstruire le metadata JSON
        const reservationMetadata = {
          waterToys: metadata.waterToys === 'true',
          childrenCount: metadata.childrenCount || undefined,
          specialNeeds: metadata.specialNeeds || undefined,
          wantsExcursion: metadata.wantsExcursion === 'true',
          optionIds: metadata.optionIds ? metadata.optionIds.split(',').map((id: string) => parseInt(id, 10)).filter((id: number) => !isNaN(id)) : [],
          boatCapacity: parseInt(metadata.boatCapacity || '0', 10),
          boatLength: metadata.boatLength ? parseFloat(metadata.boatLength) : null,
          boatSpeed: parseFloat(metadata.boatSpeed || '0'),
          departurePort: metadata.departurePort || 'Port à définir',
          bookingDate: metadata.bookingDate || new Date().toISOString(),
          userRole: metadata.userRole || null,
          skipperRequired: metadata.skipperRequired === 'true',
          effectiveSkipperPrice: metadata.effectiveSkipperPrice ? parseFloat(metadata.effectiveSkipperPrice) : null,
        };
        
        let commissionAmount: number | undefined;
        if (settings?.platformCommissionPct && totalPrice) {
          commissionAmount = Math.round(totalPrice * (settings.platformCommissionPct / 100));
        }
        
        const reservation = await prisma.reservation.create({
          data: {
            userId,
            boatId,
            reference,
            startDate,
            endDate,
            part: metadata.part as 'FULL' | 'AM' | 'PM' | 'SUNSET' | null,
            passengers,
            totalPrice,
            depositAmount,
            remainingAmount,
            depositPercent,
            status: 'deposit_paid',
            depositPaidAt: new Date(),
            locale: metadata.locale || 'fr',
            currency: metadata.currency || 'eur',
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
            commissionAmount,
            metadata: JSON.stringify(reservationMetadata),
          }
        });
        
        console.log('[Webhook] Created new reservation:', reservation.id, 'reference:', reference);
      }
    }
  } catch (err) {
    console.error('Webhook handling error', err);
    return NextResponse.json({ error: 'process_error' }, { status: 500 });
  }

  // Répondre toujours 200 rapidement (idempotent)
  return new NextResponse('ok', { status: 200 });
}
