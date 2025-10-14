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
      const reservationId = session.metadata?.reservationId;
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
        }
      }
    }
  } catch (err) {
    console.error('Webhook handling error', err);
    return NextResponse.json({ error: 'process_error' }, { status: 500 });
  }

  // Répondre toujours 200 rapidement (idempotent)
  return new NextResponse('ok', { status: 200 });
}
