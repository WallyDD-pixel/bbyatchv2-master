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
    console.log('[Deposit] Checking for overlapping reservations...', { boatId: boat.id, startDate: s.toISOString(), endDate: e.toISOString(), part });
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
      select: { id: true, startDate: true, endDate: true, part: true, status: true, reference: true }
    });
    if(overlap){
      console.log('[Deposit] OVERLAP FOUND:', JSON.stringify(overlap));
      return NextResponse.json({ error: 'slot_unavailable', overlap: overlap }, { status: 409 });
    }
    console.log('[Deposit] No overlapping reservations found ✓');

    // Vérification de disponibilité pour TOUS les jours de la plage (pas seulement le jour de départ)
    // Pour une réservation FULL/SUNSET sur plusieurs jours, il faut vérifier chaque jour
    const allDays: Date[] = [];
    let currentDate = new Date(s);
    while (currentDate <= e) {
      allDays.push(new Date(currentDate));
      currentDate = new Date(currentDate.getTime() + 86400000); // +1 jour
    }
    
    console.log('[Deposit] Checking availability for', allDays.length, 'days:', allDays.map(d => d.toISOString().split('T')[0]));
    
    // Récupérer tous les slots disponibles pour la plage de dates complète
    const startDateRange = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
    const endDateRange = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
    
    const allSlots = await prisma.availabilitySlot.findMany({ 
      where: { 
        boatId: boat.id, 
        date: { gte: startDateRange, lte: endDateRange }, 
        status: 'available' 
      }, 
      select: { part: true, date: true, boatId: true } 
    });
    
    console.log('[Deposit] Found', allSlots.length, 'slots in date range');
    console.log('[Deposit] Slots details:', JSON.stringify(allSlots.map(s => ({ 
      part: s.part, 
      date: new Date(s.date).toISOString().split('T')[0],
      dateRaw: s.date.toString()
    }))));
    console.log('[Deposit] Boat ID:', boat.id, 'Boat slug:', boatSlug);
    
    // Vérifier chaque jour de la plage
    for (const day of allDays) {
      const dayStr = day.toISOString().split('T')[0];
      
      const daySlots = allSlots.filter(slot => {
        const slotDate = new Date(slot.date);
        // Comparer les dates en format YYYY-MM-DD pour éviter les problèmes de timezone
        const slotDateStr = slotDate.toISOString().split('T')[0];
        return slotDateStr === dayStr;
      });
      
      const dayPartsSet = new Set(daySlots.map(s => s.part));
      const dayHasFullEquivalent = dayPartsSet.has('FULL') || (dayPartsSet.has('AM') && dayPartsSet.has('PM'));
      
      console.log('[Deposit] Day', dayStr, '- slots:', daySlots.length, 'parts:', Array.from(dayPartsSet));
      
      // Vérifier que ce jour a la disponibilité requise
      if (part === 'FULL' || part === 'SUNSET') {
        if (!dayHasFullEquivalent) {
          console.log('[Deposit] Day', dayStr, 'does not have FULL equivalent');
          return NextResponse.json({ error: 'slot_unavailable', day: dayStr }, { status: 400 });
        }
      } else if (part === 'AM') {
        if (!(dayPartsSet.has('AM') || dayPartsSet.has('FULL'))) {
          console.log('[Deposit] Day', dayStr, 'does not have AM or FULL');
          return NextResponse.json({ error: 'slot_unavailable', day: dayStr }, { status: 400 });
        }
      } else if (part === 'PM') {
        if (!(dayPartsSet.has('PM') || dayPartsSet.has('FULL'))) {
          console.log('[Deposit] Day', dayStr, 'does not have PM or FULL');
          return NextResponse.json({ error: 'slot_unavailable', day: dayStr }, { status: 400 });
        }
      }
    }
    
    console.log('[Deposit] All days are available ✓');
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

    console.log('[Deposit] Price calculation - total:', total, 'optionsTotal:', optionsTotal, 'skipperTotal:', skipperTotal, 'grandTotal:', grandTotal);
    
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
    console.log('[Deposit] Creating reservation...', { userId, boatId: boat.id, startDate: s, endDate: e, part, grandTotal, deposit });
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
    console.log('[Deposit] Reservation created:', reservation.id);
    
    // Pour la préproduction, forcer le mode test
    // En production, utiliser le mode des settings
    const isPreprod = process.env.NODE_ENV === 'production' && (process.env.NEXTAUTH_URL?.includes('preprod') || process.env.NEXTAUTH_URL?.includes('localhost'));
    const mode = isPreprod ? 'test' : (settings?.stripeMode === 'live' ? 'live' : 'test');
    
    console.log('[Deposit] Stripe mode:', mode, 'Settings mode:', settings?.stripeMode, 'isPreprod:', isPreprod);
    
    const secretKey = mode==='live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if(!secretKey) {
      console.error('[Deposit] Stripe key missing for mode:', mode);
      console.error('[Deposit] Available keys - Test:', !!settings?.stripeTestSk, 'Live:', !!settings?.stripeLiveSk);
      return NextResponse.json({ error: 'stripe_key_missing' }, { status: 500 });
    }
    
    console.log('[Deposit] Using Stripe key (first 20 chars):', secretKey.substring(0, 20) + '...');
    console.log('[Deposit] Creating Stripe checkout session...');
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

    console.log('[Deposit] Stripe checkout session created:', checkoutSession.id);
    
    await prisma.reservation.update({ where:{ id: reservation.id }, data:{ stripeSessionId: checkoutSession.id } });
    
    console.log('[Deposit] Reservation updated with Stripe session ID');
    console.log('[Deposit] Returning checkout URL:', checkoutSession.url);

    return NextResponse.json({ url: checkoutSession.url, reservationId: reservation.id });
  } catch (e:any) {
    console.error('[Deposit API Error]', e);
    console.error('[Deposit API Error Stack]', e?.stack);
    console.error('[Deposit API Error Message]', e?.message);
    return NextResponse.json({ 
      error: 'server_error', 
      message: process.env.NODE_ENV === 'development' ? e?.message : undefined,
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 });
  }
}
