import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';

export async function POST(req: Request){
  try {
    const body = await req.json();
    const { boatSlug, start, end, part, pax, locale='fr', waterToys, children, specialNeeds, excursion } = body || {};
    if(!boatSlug || !start || !part) return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    
    // Traiter les données supplémentaires
    const waterToysBool = waterToys === '1' || waterToys === true;
    const childrenCount = children || undefined;
    const specialNeedsStr = specialNeeds ? (typeof specialNeeds === 'string' ? specialNeeds : String(specialNeeds)) : undefined;
    const wantsExcursionBool = excursion === '1' || excursion === true;
    // Session utilisateur (avant calculs pour avoir userRole)
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

    const boat = await (prisma as any).boat.findUnique({ where: { slug: boatSlug }, select: { id: true, name: true, slug: true, skipperRequired: true, skipperPrice: true, capacity: true, lengthM: true, speedKn: true } });
    if(!boat) return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });
    // Dates validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateRegex.test(start) || (end && !dateRegex.test(end))) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    const s = new Date(start+'T00:00:00');
    const e = new Date(((part==='FULL' || part==='SUNSET') && end? end : start)+'T00:00:00');
    if(e < s) return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    let days = 1;
    if(part==='FULL' || part==='SUNSET'){
      days = Math.round((e.getTime()-s.getTime())/86400000)+1;
      if(days>6) return NextResponse.json({ error: 'too_long' }, { status: 400 });
    } else if(end && end!==start){
      return NextResponse.json({ error: 'halfday_range' }, { status: 400 });
    }
    
    // Calcul du skipper (minimum 1 jour)
    const skipperDays = (part==='FULL' || part==='SUNSET') ? Math.max(days, 1) : 1;
    const skipperTotal = (boat?.skipperRequired && boat?.skipperPrice) ? boat.skipperPrice * skipperDays : 0;
    const effectiveSkipperPrice = boat?.skipperRequired && boat?.skipperPrice ? boat.skipperPrice * skipperDays : 0;

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
          ...((part === 'FULL' || part === 'SUNSET') ? [{ part: 'AM' }, { part: 'PM' }] : []),
          { part: null }
        ]
      },
      select: { id: true }
    });
    if(overlap){
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });
    }

    // Slot dispo jour départ (logique existante conservée)
    // Utiliser boatId directement pour éviter les problèmes de relation imbriquée avec PostgreSQL
    // Pour PostgreSQL/Supabase, utiliser une comparaison de date exacte en créant une date à minuit UTC
    // Format: YYYY-MM-DD devient Date à minuit UTC
    const startDateOnly = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0));
    const endDateOnly = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999));
    
    const startSlots = await prisma.availabilitySlot.findMany({ 
      where: { 
        boatId: boat.id, 
        date: { gte: startDateOnly, lte: endDateOnly }, 
        status: 'available' 
      }, 
      select: { part: true, date: true } 
    });
    
    // Log pour debug (à retirer en production)
    console.log('[Deposit] Checking slots for boatId:', boat.id, 'date:', start, 'found:', startSlots.length, 'slots:', startSlots);
    const partsSet = new Set(startSlots.map(s=>s.part));
    const hasFullEquivalent = partsSet.has('FULL') || (partsSet.has('AM') && partsSet.has('PM'));
    if((part==='FULL' || part==='SUNSET') && !hasFullEquivalent) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    if(part==='AM' && !(partsSet.has('AM') || partsSet.has('FULL'))) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    if(part==='PM' && !(partsSet.has('PM') || partsSet.has('FULL'))) return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
    // Prix selon rôle (agence ou normal)
    const boatWithPrices = await (prisma as any).boat.findUnique({ where: { slug: boatSlug }, select: { pricePerDay:true, priceAm:true, pricePm:true, priceSunset:true, priceAgencyPerDay:true, priceAgencyAm:true, priceAgencyPm:true, priceAgencySunset:true, options: { select:{ id:true, label:true, price:true } } } });
    let total: number|null = null;
    if(userRole === 'agency') {
      // Prix agence
      if(part==='FULL') total = (boatWithPrices?.priceAgencyPerDay ?? boatWithPrices?.pricePerDay) * days;
      else if(part==='AM') total = boatWithPrices?.priceAgencyAm ?? boatWithPrices?.priceAm ?? null;
      else if(part==='PM') total = boatWithPrices?.priceAgencyPm ?? boatWithPrices?.pricePm ?? null;
      else if(part==='SUNSET') total = boatWithPrices?.priceAgencySunset ?? boatWithPrices?.priceSunset ?? null;
    } else {
      // Prix normal
      if(part==='FULL') total = boatWithPrices?.pricePerDay * days;
      else if(part==='AM') total = boatWithPrices?.priceAm ?? null;
      else if(part==='PM') total = boatWithPrices?.pricePm ?? null;
      else if(part==='SUNSET') total = boatWithPrices?.priceSunset ?? null;
    }
    if(total==null) return NextResponse.json({ error: 'price_missing' }, { status: 400 });

    // Options sélectionnées
    let selectedOptionIds: number[] = [];
    if (body.opts) {
      selectedOptionIds = String(body.opts).split(',').map(x=> Number(x.trim())).filter(x=> !isNaN(x));
    }
    const selectedOptions = (boatWithPrices?.options||[]).filter((o:any)=> selectedOptionIds.includes(o.id));
    const optionsTotal = selectedOptions.reduce((sum:number,o:any)=> sum + (o.price || 0), 0);
    const grandTotal = total + optionsTotal + skipperTotal;

    // Settings (pour pourcentage acompte)
    const settings = await prisma.settings.findFirst({ where:{ id:1 }, select:{ stripeMode:true, stripeTestSk:true, stripeLiveSk:true, platformCommissionPct:true, currency:true } });
    // Champ depositPercent supprimé de Settings : valeur fixe 20% (adapter si réintroduit)
    const depositPct = 0.20;
    const deposit = Math.round(grandTotal * depositPct);
    const remaining = grandTotal - deposit;
    const currency = (settings?.currency || 'eur').toLowerCase();

    // Générer une référence unique
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = userRole === 'agency' ? `AGE-${year}${month}-${randomSuffix}` : `RES-${year}${month}-${randomSuffix}`;

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
            totalPrice: grandTotal,
            currency,
            locale,
            metadata: JSON.stringify({
              waterToys: waterToysBool,
              childrenCount,
              specialNeeds: specialNeedsStr,
              wantsExcursion: wantsExcursionBool,
              optionIds: selectedOptionIds,
              // Informations supplémentaires pour la facturation
              boatCapacity: boat.capacity,
              boatLength: boat.lengthM,
              boatSpeed: boat.speedKn,
              departurePort: body.departurePort || 'Port à définir',
              bookingDate: new Date().toISOString(),
              userRole: userRole,
              skipperRequired: boat.skipperRequired,
              effectiveSkipperPrice: boat.skipperRequired ? effectiveSkipperPrice : null,
            }),
        }
      });
      return NextResponse.json({ status: 'agency_request_created', requestId: agencyReq.id });
    }

    // Flux normal (utilisateur ou admin) => réservation + Stripe
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        boatId: boat.id,
        reference,
        startDate: s,
        endDate: e,
        part,
        passengers: pax? Number(pax): undefined,
        totalPrice: grandTotal,
        depositAmount: deposit,
        remainingAmount: remaining,
        depositPercent: Math.round(depositPct*100),
        status: 'pending_deposit',
        locale,
        currency,
        metadata: JSON.stringify({
          waterToys: waterToysBool,
          childrenCount,
          specialNeeds: specialNeedsStr,
          wantsExcursion: wantsExcursionBool,
          optionIds: selectedOptionIds, // Stocker les IDs des options sélectionnées
          // Informations supplémentaires pour la facturation
          boatCapacity: boat.capacity,
          boatLength: boat.lengthM,
          boatSpeed: boat.speedKn,
          departurePort: body.departurePort || 'Port à définir',
          bookingDate: new Date().toISOString(),
          userRole: userRole,
          skipperRequired: boat.skipperRequired,
          effectiveSkipperPrice: boat.skipperRequired ? effectiveSkipperPrice : null,
        }),
      }
    });
    const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
    const secretKey = mode==='live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if(!secretKey) return NextResponse.json({ error: 'stripe_key_missing' }, { status: 500 });
  const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });
    const lineName = locale==='fr' ? `Acompte ${boat.name}` : `Deposit ${boat.name}`;
    const successUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/success?res=${reservation.id}`;
    const cancelUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout?boat=${boat.slug}&start=${start}${(part==='FULL' || part==='SUNSET') && end? '&end='+end:''}&part=${part}`;

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
