import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { getServerSession } from '@/lib/auth';

export async function POST(req: Request){
  try {
    const body = await req.json();
    const { boatSlug, start, end, part, pax, locale='fr', waterToys, children, specialNeeds, excursion } = body || {};
    console.log('[deposit] Request received:', { boatSlug, start, end, part, pax });
    if(!boatSlug || !start || !part) {
      console.log('[deposit] Missing params:', { boatSlug: !!boatSlug, start: !!start, part: !!part });
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }
    
    // Traiter les données supplémentaires
    const waterToysBool = waterToys === '1' || waterToys === true;
    const childrenCount = children || undefined;
    const specialNeedsStr = specialNeeds ? (typeof specialNeeds === 'string' ? specialNeeds : String(specialNeeds)) : undefined;
    const wantsExcursionBool = excursion === '1' || excursion === true;
    // Session utilisateur (avant calculs pour avoir userRole)
    const session = await getServerSession() as any;
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
    if(!boat) {
      console.log('[deposit] Boat not found:', boatSlug);
      return NextResponse.json({ error: 'boat_not_found' }, { status: 404 });
    }
    console.log('[deposit] Boat found:', boat.id, boat.name);
    
    // Debug: Vérifier tous les slots pour ce bateau autour de la date demandée
    // Normaliser la date de recherche en UTC
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const debugDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
    const debugStart = new Date(debugDateUTC.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 jours avant
    const debugEnd = new Date(debugDateUTC.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 jours après
    
    // Vérifier TOUS les slots pour ce bateau (pas seulement les 50 premiers)
    const allSlots = await prisma.availabilitySlot.findMany({
      where: {
        boatId: boat.id,
        status: 'available'
      },
      select: { id: true, date: true, part: true },
      orderBy: { date: 'asc' }
    });
    
    // Vérifier aussi les slots de TOUS les bateaux pour la date demandée
    const allBoatsSlotsForDate = await prisma.availabilitySlot.findMany({
      where: {
        date: { gte: debugStart, lte: debugEnd },
        status: 'available'
      },
      select: { id: true, boatId: true, date: true, part: true },
      orderBy: { date: 'asc' }
    });
    
    // Récupérer les noms des bateaux pour les logs
    const boatIds = [...new Set(allBoatsSlotsForDate.map(s => s.boatId))];
    const boatsInfo = await prisma.boat.findMany({
      where: { id: { in: boatIds } },
      select: { id: true, name: true }
    });
    const boatNamesMap = new Map(boatsInfo.map(b => [b.id, b.name]));
    
    console.log(`[deposit] Debug: Total slots for boat ${boat.id} (${boat.name}):`, allSlots.length);
    console.log(`[deposit] Debug: All slots for date ${start} across ALL boats:`, allBoatsSlotsForDate.length);
    if (allBoatsSlotsForDate.length > 0) {
      console.log(`[deposit] Debug: Slots by boat for date ${start}:`, allBoatsSlotsForDate.map(s => ({
        boatId: s.boatId,
        boatName: boatNamesMap.get(s.boatId) || 'unknown',
        date: s.date.toISOString(),
        dateStr: s.date.toISOString().split('T')[0],
        part: s.part
      })));
    } else {
      console.log(`[deposit] Debug: NO SLOTS FOUND for date ${start} for ANY boat! This means slots need to be created in the admin calendar.`);
    }
    
    // Analyser les dates pour voir s'il y a une différence entre janvier et mars
    const januarySlots = allSlots.filter(s => {
      const d = new Date(s.date);
      return d.getUTCMonth() === 0; // Janvier = mois 0
    });
    const marchSlots = allSlots.filter(s => {
      const d = new Date(s.date);
      return d.getUTCMonth() === 2; // Mars = mois 2
    });
    
    console.log(`[deposit] Debug: January slots (${januarySlots.length}):`, januarySlots.slice(0, 5).map(s => ({
      date: s.date.toISOString(),
      dateStr: s.date.toISOString().split('T')[0],
      part: s.part
    })));
    console.log(`[deposit] Debug: March slots (${marchSlots.length}):`, marchSlots.slice(0, 5).map(s => ({
      date: s.date.toISOString(),
      dateStr: s.date.toISOString().split('T')[0],
      part: s.part
    })));
    
    const debugSlots = await prisma.availabilitySlot.findMany({
      where: {
        boatId: boat.id,
        date: { gte: debugStart, lte: debugEnd },
        status: 'available'
      },
      select: { id: true, date: true, part: true },
      orderBy: { date: 'asc' }
    });
    console.log(`[deposit] Debug slots for boat ${boat.id} (${boat.name}) around ${start} (UTC range: ${debugStart.toISOString()} to ${debugEnd.toISOString()}):`, debugSlots.map(s => ({ 
      date: s.date.toISOString(), 
      part: s.part,
      dateStr: s.date.toISOString().split('T')[0]
    })));
    // Dates validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if(!dateRegex.test(start) || (end && !dateRegex.test(end))) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    
    // Normaliser les dates en UTC pour correspondre aux slots (stockés en UTC à minuit)
    // Réutiliser les variables déjà déclarées pour le debug (ligne 43)
    const s = debugDateUTC; // Déjà en UTC depuis le debug
    
    const endDateStr = (part==='FULL' || part==='SUNSET') && end ? end : start;
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const e = new Date(Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0, 0));
    
    if(e < s) return NextResponse.json({ error: 'invalid_range' }, { status: 400 });
    let days = 1;
    if(part==='FULL' || part==='SUNSET'){
      days = Math.round((e.getTime()-s.getTime())/86400000)+1;
      if(days>6) return NextResponse.json({ error: 'too_long' }, { status: 400 });
    } else if(end && end!==start){
      return NextResponse.json({ error: 'halfday_range' }, { status: 400 });
    }
    
    // Calcul du skipper
    // Pour les agences : skipper seulement si explicitement demandé (needsSkipper)
    // Pour les autres : skipper obligatoire si skipperRequired
    const skipperDays = (part==='FULL' || part==='SUNSET') ? Math.max(days, 1) : 1;
    let skipperTotal = 0;
    if (userRole === 'agency') {
      // Agence : skipper seulement si demandé explicitement
      const needsSkipper = body.skipper === '1' || body.skipper === true || body.needsSkipper === true;
      if (needsSkipper && boat?.skipperPrice) {
        skipperTotal = boat.skipperPrice * skipperDays; // HT sans TVA pour agence
      }
    } else {
      // Utilisateur normal : skipper obligatoire si requis
      if (boat?.skipperRequired && boat?.skipperPrice) {
        skipperTotal = boat.skipperPrice * skipperDays;
      }
    }
    const effectiveSkipperPrice = skipperTotal;

    // Vérification dynamique de chevauchement (Option 1)
    // Conflit si plage de dates recouvre et si parties incompatibles (FULL avec tout, AM avec FULL ou AM, etc.)
    // IMPORTANT: Pour les agences, on permet quand même la demande (sera examinée par l'admin)
    // On vérifie uniquement pour les réservations directes (non-agence)
    if(userRole !== 'agency') {
      // Log pour debug
      console.log(`[deposit] Checking overlap for boat ${boat.id}, dates: ${s.toISOString()} to ${e.toISOString()}, part: ${part}`);
      
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
        select: { 
          id: true, 
          reference: true, 
          startDate: true, 
          endDate: true, 
          part: true, 
          status: true,
          userId: true,
          createdAt: true
        }
      });
      
      if(overlap){
        // Récupérer les infos utilisateur pour le log
        const user = await prisma.user.findUnique({ 
          where: { id: overlap.userId }, 
          select: { email: true, name: true } 
        }).catch(() => null);
        
        console.log(`[deposit] Overlap found! Conflicting reservation:`, {
          id: overlap.id,
          reference: overlap.reference,
          startDate: overlap.startDate.toISOString(),
          endDate: overlap.endDate.toISOString(),
          part: overlap.part,
          status: overlap.status,
          userId: overlap.userId,
          userEmail: user?.email || 'unknown',
          userName: user?.name || 'unknown',
          createdAt: overlap.createdAt.toISOString()
        });
        return NextResponse.json({ 
          error: 'slot_unavailable',
          conflictingReservation: {
            id: overlap.id,
            reference: overlap.reference,
            status: overlap.status
          }
        }, { status: 409 });
      } else {
        console.log(`[deposit] No overlap found, slot is available`);
      }
    }

    // Vérification de disponibilité pour tous les jours de la plage
    // IMPORTANT: Pour les agences, on saute cette vérification (demande sera examinée par l'admin)
    if(userRole !== 'agency') {
      // Fonction helper pour normaliser une date au début de la journée en UTC
      // Les slots sont stockés en UTC à minuit (ex: 2026-01-31T00:00:00.000Z)
      // On doit donc chercher en UTC pour correspondre exactement
      const normalizeDate = (dateStr: string): { start: Date, end: Date } => {
        // Parser la date directement depuis la chaîne YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // Créer les dates en UTC à minuit pour correspondre au stockage des slots
        const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        
        console.log(`[deposit] Normalizing date ${dateStr} -> UTC start: ${start.toISOString()}, end: ${end.toISOString()}`);
        
        // Vérifier que les dates sont valides
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error(`[deposit] ERROR: Invalid date parsed from ${dateStr}`);
        }
        
        return { start, end };
      };

      if(part==='FULL' || part==='SUNSET'){
        // Pour les réservations multi-jours, vérifier tous les jours
        // Travailler directement avec les chaînes de dates en UTC pour correspondre au stockage des slots
        const requiredDays: string[] = [];
        const endDateStr = end || start;
        
        // Parser les dates directement depuis les chaînes (format YYYY-MM-DD)
        // Réutiliser debugDateUTC pour startDateObj (déjà calculé en UTC)
        const startDateObj = debugDateUTC;
        const [endYear2, endMonth2, endDay2] = endDateStr.split('-').map(Number);
        const endDateObj = new Date(Date.UTC(endYear2, endMonth2 - 1, endDay2, 0, 0, 0, 0));
        
        let currentDateObj = new Date(startDateObj);
        while(currentDateObj <= endDateObj){
          // Extraire la date en UTC pour correspondre au format de stockage
          const year = currentDateObj.getUTCFullYear();
          const month = String(currentDateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(currentDateObj.getUTCDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          requiredDays.push(dateStr);
          // Ajouter un jour (86400000 ms = 24 heures)
          currentDateObj = new Date(currentDateObj.getTime() + 86400000);
        }
        
        // Vérifier chaque jour
        for(const dateStr of requiredDays){
          const { start: dayStart, end: dayEnd } = normalizeDate(dateStr);
          
          // Chercher tous les slots pour ce bateau dans une plage plus large pour le débogage
          const allSlotsDebug = await prisma.availabilitySlot.findMany({ 
            where: { 
              boatId: boat.id, 
              status: 'available' 
            }, 
            select: { part: true, date: true },
            take: 10,
            orderBy: { date: 'desc' }
          });
          console.log(`[deposit] Debug: Last 10 slots for boat ${boat.id}:`, allSlotsDebug.map(s => ({ part: s.part, date: s.date.toISOString() })));
          
          // Rechercher les slots pour cette date
          // dayStart et dayEnd sont déjà en UTC à minuit et fin de journée
          const daySlots = await prisma.availabilitySlot.findMany({ 
            where: { 
              boatId: boat.id, 
              date: { gte: dayStart, lte: dayEnd }, 
              status: 'available' 
            }, 
            select: { part: true, date: true } 
          });
          console.log(`[deposit] Checking slots for boat ${boat.id} on ${dateStr} (range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}): found ${daySlots.length} slot(s)`, daySlots.map(s => ({ part: s.part, date: s.date.toISOString() })));
          
          // Si aucun slot trouvé, vérifier tous les slots du bateau pour cette date (debug)
          if (daySlots.length === 0) {
            const allBoatSlots = await prisma.availabilitySlot.findMany({ 
              where: { 
                boatId: boat.id,
                status: 'available' 
              }, 
              select: { part: true, date: true },
              orderBy: { date: 'asc' }
            });
            console.log(`[deposit] DEBUG: All available slots for boat ${boat.id} (${allBoatSlots.length} total):`, allBoatSlots.slice(0, 20).map(s => ({ part: s.part, date: s.date.toISOString().split('T')[0] })));
          }
          const partsSet = new Set(daySlots.map(s=>s.part));
          const hasFullEquivalent = partsSet.has('FULL') || (partsSet.has('AM') && partsSet.has('PM'));
          if(!hasFullEquivalent){
            console.log(`[deposit] Slot unavailable for boat ${boat.id} on ${dateStr}, parts found:`, Array.from(partsSet));
            return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
          }
        }
      } else {
        // Pour les demi-journées, vérifier seulement le jour de départ
        const { start: dayStart, end: dayEnd } = normalizeDate(start);
        
        // Rechercher les slots pour cette date
        // dayStart et dayEnd sont déjà en UTC à minuit et fin de journée
        const startSlots = await prisma.availabilitySlot.findMany({ 
          where: { 
            boatId: boat.id, 
            date: { gte: dayStart, lte: dayEnd }, 
            status: 'available' 
          }, 
          select: { part: true, date: true } 
        });
        console.log(`[deposit] Checking slots for boat ${boat.id} on ${start} (range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}): found ${startSlots.length} slot(s)`, startSlots.map(s => ({ part: s.part, date: s.date.toISOString() })));
        
        // Si aucun slot trouvé, vérifier tous les slots du bateau pour cette date (debug)
        if (startSlots.length === 0) {
          const allBoatSlots = await prisma.availabilitySlot.findMany({ 
            where: { 
              boatId: boat.id,
              status: 'available' 
            }, 
            select: { part: true, date: true },
            orderBy: { date: 'asc' }
          });
          console.log(`[deposit] DEBUG: All available slots for boat ${boat.id} (${allBoatSlots.length} total):`, allBoatSlots.slice(0, 20).map(s => ({ part: s.part, date: s.date.toISOString().split('T')[0] })));
        }
        const partsSet = new Set(startSlots.map(s=>s.part));
        if(part==='AM' && !(partsSet.has('AM') || partsSet.has('FULL'))){
          console.log(`[deposit] Slot unavailable for boat ${boat.id} on ${start} for AM, parts found:`, Array.from(partsSet));
          return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
        }
        if(part==='PM' && !(partsSet.has('PM') || partsSet.has('FULL'))){
          console.log(`[deposit] Slot unavailable for boat ${boat.id} on ${start} for PM, parts found:`, Array.from(partsSet));
          return NextResponse.json({ error: 'slot_unavailable' }, { status: 400 });
        }
      }
    }
    // Prix selon rôle (agence ou normal)
    // Calcul du prix agence : prix public - 20% sur la coque nue (hors taxe)
    const calculateAgencyPrice = (publicPrice: number): number => {
      return Math.round(publicPrice * 0.8); // -20% sur la coque nue
    };
    
    const boatWithPrices = await (prisma as any).boat.findUnique({ where: { slug: boatSlug }, select: { pricePerDay:true, priceAm:true, pricePm:true, priceSunset:true, priceAgencyPerDay:true, priceAgencyAm:true, priceAgencyPm:true, priceAgencySunset:true, options: { select:{ id:true, label:true, price:true } } } });
    let total: number|null = null;
    if(userRole === 'agency') {
      // Prix agence : utiliser prix agence défini ou calculer automatiquement (-20%)
      if(part==='FULL') {
        total = boatWithPrices?.priceAgencyPerDay 
          ? boatWithPrices.priceAgencyPerDay * days 
          : calculateAgencyPrice(boatWithPrices?.pricePerDay || 0) * days;
      } else if(part==='AM') {
        total = boatWithPrices?.priceAgencyAm ?? (boatWithPrices?.priceAm ? calculateAgencyPrice(boatWithPrices.priceAm) : calculateAgencyPrice(Math.round((boatWithPrices?.pricePerDay || 0) / 2)));
      } else if(part==='PM') {
        total = boatWithPrices?.priceAgencyPm ?? (boatWithPrices?.pricePm ? calculateAgencyPrice(boatWithPrices.pricePm) : calculateAgencyPrice(Math.round((boatWithPrices?.pricePerDay || 0) / 2)));
      } else if(part==='SUNSET') {
        total = boatWithPrices?.priceAgencySunset ?? (boatWithPrices?.priceSunset ? calculateAgencyPrice(boatWithPrices.priceSunset) : null);
      }
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
    
    // IMPORTANT: Le skipper et le carburant sont payés sur place
    // L'acompte de 20% ne s'applique QUE sur le prix du bateau + options (sans skipper ni carburant)
    const basePriceForDeposit = total + optionsTotal; // Prix bateau + options (sans skipper)
    const grandTotal = basePriceForDeposit + skipperTotal; // Total incluant skipper pour référence

    // Settings (pour pourcentage acompte)
    const settings = await prisma.settings.findFirst({ where:{ id:1 }, select:{ stripeMode:true, stripeTestSk:true, stripeLiveSk:true, platformCommissionPct:true, currency:true } });
    // Champ depositPercent supprimé de Settings : valeur fixe 20% (adapter si réintroduit)
    const depositPct = 0.20;
    // L'acompte est calculé uniquement sur le prix du bateau + options (sans skipper ni carburant)
    const deposit = Math.round(basePriceForDeposit * depositPct);
    // Le reste à payer = prix bateau + options - acompte (sans skipper ni carburant, payés sur place)
    const remaining = basePriceForDeposit - deposit;
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
              needsSkipper: body.skipper === '1' || body.skipper === true || body.needsSkipper === true,
              effectiveSkipperPrice: boat.skipperRequired && (body.skipper === '1' || body.skipper === true || body.needsSkipper === true) ? effectiveSkipperPrice : null,
            }),
        }
      });
      
      // Envoyer un email à charter@bb-yachts.com pour notifier d'une nouvelle demande agence
      try {
        const userEmail = (session?.user as any)?.email || '';
        const userName = (session?.user as any)?.name || userEmail;
        const emailBody = `Nouvelle demande de réservation agence reçue

ID: ${agencyReq.id}
Utilisateur: ${userName} (${userEmail})
Bateau: ${boat.name}
Dates: ${start}${end && end !== start ? ` → ${end}` : ''}
Créneau: ${part}
Passagers: ${pax || '—'}
Prix total: ${grandTotal.toLocaleString('fr-FR')} €

Détails complets disponibles dans le tableau de bord admin.
`;
        
        // Envoyer une notification par email pour la nouvelle demande d'agence
        const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
        const { newAgencyRequestEmail } = await import('@/lib/email-templates');
        
        if (await isNotificationEnabled('agencyRequest')) {
          // Récupérer les informations complètes de l'utilisateur
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, name: true, email: true }
          });
          
          const emailData = {
            id: agencyReq.id,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'Agence' : userEmail,
            userEmail: user?.email || userEmail,
            boatName: boat.name,
            startDate: start,
            endDate: end || start,
            part,
            passengers: pax ? Number(pax) : undefined,
            totalPrice: grandTotal,
            status: agencyReq.status,
          };
          
          const { subject, html } = newAgencyRequestEmail(emailData, locale as 'fr' | 'en');
          
          await sendEmail({
            to: 'charter@bb-yachts.com',
            subject,
            html,
          });
        }
      } catch (emailErr) {
        console.error('Error sending notification email for agency request:', emailErr);
        // Ne pas bloquer la création de la demande si l'email échoue
      }
      
      return NextResponse.json({ status: 'agency_request_created', requestId: agencyReq.id });
    }

    // Flux normal (utilisateur ou admin) => Stripe SANS créer la réservation
    // La réservation sera créée uniquement après paiement confirmé (dans le webhook ou la page de succès)
    const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
    const secretKey = mode==='live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if(!secretKey) return NextResponse.json({ error: 'stripe_key_missing' }, { status: 500 });
    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });
    const lineName = locale==='fr' ? `Acompte ${boat.name}` : `Deposit ${boat.name}`;
    
    // Préparer toutes les données nécessaires pour créer la réservation après paiement
    const reservationMetadata = {
      userId,
      boatId: String(boat.id),
      reference,
      startDate: s.toISOString(),
      endDate: e.toISOString(),
      part,
      passengers: pax ? String(pax) : '',
      totalPrice: String(grandTotal),
      depositAmount: String(deposit),
      remainingAmount: String(remaining),
      depositPercent: String(Math.round(depositPct*100)),
      locale,
      currency,
      // Metadata JSON stringifié
      metadata: JSON.stringify({
        waterToys: waterToysBool,
        childrenCount,
        specialNeeds: specialNeedsStr,
        wantsExcursion: wantsExcursionBool,
        optionIds: selectedOptionIds,
        boatCapacity: boat.capacity,
        boatLength: boat.lengthM,
        boatSpeed: boat.speedKn,
        departurePort: body.departurePort || 'Port à définir',
        bookingDate: new Date().toISOString(),
        userRole: userRole,
        skipperRequired: boat.skipperRequired,
        effectiveSkipperPrice: boat.skipperRequired ? effectiveSkipperPrice : null,
      }),
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: locale==='fr' ? 'fr' : 'en',
      line_items: [
        { price_data: { currency, unit_amount: deposit * 100, product_data: { name: lineName } }, quantity: 1 }
      ],
      metadata: reservationMetadata, // Toutes les données nécessaires pour créer la réservation après paiement
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}${locale === 'en' ? '&lang=en' : ''}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/checkout/cancel${locale === 'en' ? '?lang=en' : ''}`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expire après 30 minutes
    });

    console.log('[deposit] Stripe session créée, réservation sera créée après paiement confirmé');

    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (e:any) {
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
