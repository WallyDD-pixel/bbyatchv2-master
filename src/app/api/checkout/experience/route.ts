import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import Stripe from 'stripe';
import type { ExperienceCheckoutBody, DayPart, SettingsStripe } from '@/types/domain';
import type { Session } from 'next-auth';

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => undefined) as Partial<ExperienceCheckoutBody> | undefined;
    const expSlug = raw?.expSlug?.trim();
    const part: DayPart = (raw?.part ?? 'FULL') as DayPart;
    const locale = (raw?.locale === 'en' ? 'en' : 'fr');
    // Normaliser boatId number
    const boatId = raw?.boatId != null ? Number(raw.boatId) : NaN;
    const start = raw?.start;
    const end = raw?.end;

    if (!expSlug || !start || Number.isNaN(boatId) || !part) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    const experience = await prisma.experience.findUnique({
      where: { slug: expSlug },
      select: { id: true, slug: true, titleFr: true, titleEn: true }
    });
    if (!experience) return NextResponse.json({ error: 'experience_not_found' }, { status: 404 });

    const boat = await prisma.boat.findUnique({ where: { id: boatId } });
    if (!boat) return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });

    const boatExp = await prisma.boatExperience.findUnique({
      where: { boatId_experienceId: { boatId: boat.id, experienceId: experience.id } },
      select: { price: true }
    });
    if (!boatExp?.price) return NextResponse.json({ error: 'price_missing' }, { status: 400 });

    // Récupérer les options sélectionnées et calculer leur prix total
    const optionIds = Array.isArray(raw?.optionIds) ? raw.optionIds.map(id => Number(id)) : [];
    const boatOptions = await prisma.boatOption.findMany({
      where: { boatId: boat.id, id: { in: optionIds } },
      select: { id: true, label: true, price: true }
    });
    const optionsTotal = boatOptions.reduce((sum, opt) => sum + (opt.price || 0), 0);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || (end && !dateRegex.test(end))) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    const s = new Date(`${start}T00:00:00`);
    const effectiveEnd = part === 'FULL' && end ? end : start;
    const e = new Date(`${effectiveEnd}T00:00:00`);
    if (e < s) return NextResponse.json({ error: 'invalid_range' }, { status: 400 });

    let days = 1;
    if (part === 'FULL') {
      days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      if (days > 6) return NextResponse.json({ error: 'too_long' }, { status: 400 });
    }

    // Vérification de la disponibilité (MVP: jour de départ uniquement)
    const slot = await prisma.experienceAvailabilitySlot.findFirst({
      where: {
        experienceId: experience.id,
        date: { gte: s, lte: s },
        status: 'available',
        OR: [{ part: 'FULL' }, { part }, { part: 'AM' }, { part: 'PM' }]
      },
      select: { id: true, part: true }
    });
    if (!slot) return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });

    const basePrice = boatExp.price;
    const basePriceForDays = part === 'FULL' ? basePrice * days : Math.round(basePrice * 0.55);
    // Total = prix base (bateau + expérience) + options
    const total = basePriceForDays + optionsTotal;

    const settings = await prisma.settings.findFirst({
      where: { id: 1 },
      select: { stripeMode: true, stripeTestSk: true, stripeLiveSk: true, currency: true }
    });

    // TODO: stocker depositPercent dans Settings si besoin; valeur fixe 20% pour l'instant
    const depositPct = 0.20; // 20%
    const deposit = Math.round(total * depositPct);
    const remaining = total - deposit;
    const currency = (settings?.currency || 'eur').toLowerCase();

    const session: Session | null = await getServerSession(auth);
    if (!session?.user?.email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 401 });

    // Récupérer les données supplémentaires du formulaire
    const departurePort = raw?.departurePort?.trim() || undefined;
    const preferredTime = raw?.preferredTime?.trim() || undefined;
    const children = Array.isArray(raw?.children) ? raw.children : undefined;
    const specialRequest = raw?.specialRequest?.trim() || undefined;

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        boatId: boat.id,
        startDate: s,
        endDate: e,
        part,
        totalPrice: total,
        depositAmount: deposit,
        remainingAmount: remaining,
        depositPercent: Math.round(depositPct * 100),
        status: 'pending_deposit',
        locale,
        currency,
        metadata: JSON.stringify({
          experienceId: experience.id,
          expSlug: experience.slug,
          experienceTitleFr: experience.titleFr,
          experienceTitleEn: experience.titleEn,
          optionIds, // Sauvegarder les IDs des options sélectionnées
          departurePort,
          preferredTime,
          children,
          specialRequest
        })
      }
    });

    const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
    const secretKey = mode === 'live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if (!secretKey) return NextResponse.json({ error: 'stripe_key_missing' }, { status: 500 });

    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });

    const lineName = locale === 'fr'
      ? `Acompte expérience: ${experience.titleFr}`
      : `Experience deposit: ${experience.titleEn || experience.titleFr}`;

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/booking/experience/success?res=${reservation.id}`;
    const cancelUrl = `${baseUrl}/booking/experience?exp=${encodeURIComponent(expSlug)}&boat=${boat.id}&start=${start}&end=${end}&part=${part}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: locale === 'fr' ? 'fr' : 'en',
      line_items: [{
        price_data: { currency, unit_amount: deposit * 100, product_data: { name: lineName } },
        quantity: 1
      }],
      metadata: {
        reservationId: reservation.id,
        experienceId: String(experience.id),
        boatId: String(boat.id),
        part,
        start,
        end: end || start
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    await prisma.reservation.update({ where: { id: reservation.id }, data: { stripeSessionId: checkoutSession.id } });
    
    // Envoyer une notification par email pour la nouvelle réservation d'expérience
    try {
      const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
      const { newReservationEmail } = await import('@/lib/email-templates');
      
      if (await isNotificationEnabled('reservation')) {
        const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, firstName: true, lastName: true, email: true } });
        const userName = userData?.name || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Client';
        
        const emailData = {
          id: reservation.id,
          reference: reservation.reference,
          boatName: boat.name,
          userName,
          userEmail: userData?.email || '',
          startDate: start,
          endDate: end || start,
          part,
          passengers: undefined,
          totalPrice: reservation.totalPrice,
          depositAmount: reservation.depositAmount,
          status: reservation.status,
          experienceTitle: locale === 'fr' ? experience.titleFr : experience.titleEn,
        };
        
        const { subject, html } = newReservationEmail(emailData, locale as 'fr' | 'en');
        const notificationEmail = await getNotificationEmail();
        
        await sendEmail({
          to: notificationEmail,
          subject,
          html,
        });
      }
    } catch (emailErr) {
      console.error('Error sending experience reservation notification email:', emailErr);
      // Ne pas bloquer la création de la réservation si l'email échoue
    }
    
    return NextResponse.json({ url: checkoutSession.url, reservationId: reservation.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
