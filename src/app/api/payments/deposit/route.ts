import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';

export async function POST(req: Request){
  try {
    const body = await req.json();
    const { boatSlug, start, end, part, pax, locale='fr' } = body || {};
    if(!boatSlug || !start || !part) return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    const boat = await prisma.boat.findUnique({ where: { slug: boatSlug } });
    if(!boat) return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });
    // Dates validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateRegex.test(start) || (end && !dateRegex.test(end))) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    const s = new Date(start+'T00:00:00');
    const e = new Date((part==='FULL' && end? end : start)+'T00:00:00');
    if(e < s) return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    let days = 1;
    if(part==='FULL'){
      days = Math.round((e.getTime()-s.getTime())/86400000)+1;
      if(days>6) return NextResponse.json({ error: 'too_long' }, { status: 400 });
    } else if(end && end!==start){
      return NextResponse.json({ error: 'halfday_range' }, { status: 400 });
    }

    // Vérification dynamique de chevauchement (Option 1)
    // Conflit si plage de dates recouvre et si parties incompatibles (FULL avec tout, AM avec FULL ou AM, etc.)
    const overlap = await prisma.reservation.findFirst({
      where: {
        boatId: boat.id,
        status: { not: 'cancelled' },
        startDate: { lte: e },
        endDate: { gte: s },
        OR: [
          { part: 'FULL' },
          { part: part },
          ...(part === 'FULL' ? [{ part: 'AM' }, { part: 'PM' }] : []),
          { part: null }
        ]
      },
      select: { id: true }
    });
    if(overlap){
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });
    }

    // Slot dispo jour départ (logique existante conservée)
    const startSlots = await prisma.availabilitySlot.findMany({ where: { boat: { slug: boatSlug }, date: { gte: s, lte: s }, status: 'available' }, select: { part: true } });
    const partsSet = new Set(startSlots.map(s=>s.part));
    const hasFullEquivalent = partsSet.has('FULL') || (partsSet.has('AM') && partsSet.has('PM'));
    if(part==='FULL' && !hasFullEquivalent) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    if(part==='AM' && !(partsSet.has('AM') || partsSet.has('FULL'))) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    if(part==='PM' && !(partsSet.has('PM') || partsSet.has('FULL'))) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    // Prix
    let total: number|null = null;
    if(part==='FULL') total = boat.pricePerDay * days; // même si FULL reconstruit via AM+PM
    else if(part==='AM') total = boat.priceAm ?? null;
    else if(part==='PM') total = boat.pricePm ?? null;
    if(total==null) return NextResponse.json({ error: 'price_missing' }, { status: 400 });
    // Settings (pour pourcentage acompte)
  const settings = await prisma.settings.findFirst({ where:{ id:1 }, select:{ stripeMode:true, stripeTestSk:true, stripeLiveSk:true, platformCommissionPct:true, currency:true } });
  // Champ depositPercent supprimé de Settings : valeur fixe 20% (adapter si réintroduit)
  const depositPct = 0.20;
    const deposit = Math.round(total * depositPct);
    const remaining = total - deposit;
    const currency = (settings?.currency || 'eur').toLowerCase();
    // Session utilisateur
    const session = await getServerSession(auth as any) as any;
    let userId: string | null = null;
    let userRole: string | null = null;
    if(session?.user?.email){
      const u = await prisma.user.findUnique({ where:{ email: session.user.email }, select:{ id:true, role:true } });
      userId = u?.id || null;
      userRole = u?.role || null;
    }
    if(!userId){
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    // NOUVEAU: si rôle agence => création d'une AgencyRequest (pas de Stripe)
    if(userRole === 'agency'){
      const agencyReq = await prisma.agencyRequest.create({
        data: {
          userId,
            boatId: boat.id,
            startDate: s,
            endDate: e,
            part,
            passengers: pax? Number(pax): undefined,
            totalPrice: total,
            currency,
            locale,
        }
      });
      return NextResponse.json({ status: 'agency_request_created', requestId: agencyReq.id });
    }

    // Flux normal (utilisateur ou admin) => réservation + Stripe
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        boatId: boat.id,
        startDate: s,
        endDate: e,
        part,
        passengers: pax? Number(pax): undefined,
        totalPrice: total,
        depositAmount: deposit,
        remainingAmount: remaining,
        depositPercent: Math.round(depositPct*100),
        status: 'pending_deposit',
        locale,
        currency,
      }
    });
    const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
    const secretKey = mode==='live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if(!secretKey) return NextResponse.json({ error: 'stripe_key_missing' }, { status: 500 });
  const stripe = new Stripe(secretKey, { apiVersion: '2025-07-30.basil' });
    const lineName = locale==='fr' ? `Acompte ${boat.name}` : `Deposit ${boat.name}`;
    const successUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/success?res=${reservation.id}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout?boat=${boat.slug}&start=${start}${part==='FULL' && end? '&end='+end:''}&part=${part}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: locale==='fr' ? 'fr' : 'en',
      line_items: [
        { price_data: { currency, unit_amount: deposit * 100, product_data: { name: lineName } }, quantity: 1 }
      ],
      metadata: { reservationId: reservation.id, boatId: String(boat.id), part, start, end: end || start },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await prisma.reservation.update({ where:{ id: reservation.id }, data:{ stripeSessionId: checkoutSession.id } });

    return NextResponse.json({ url: checkoutSession.url, reservationId: reservation.id });
  } catch (e:any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
