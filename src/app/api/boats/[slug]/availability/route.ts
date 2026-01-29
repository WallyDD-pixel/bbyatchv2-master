import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/boats/[slug]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// Retourne les disponibilités pour un bateau spécifique
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const url = new URL(_req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  
  // Gérer params comme Promise (Next.js 16)
  const resolvedParams = params instanceof Promise ? await params : params;
  
  try {
    console.log(`[boat-availability] Request for boat: ${resolvedParams.slug}, from: ${from}, to: ${to}`);
    
    // Récupérer le bateau par slug
    const boat = await prisma.boat.findUnique({ 
      where: { slug: resolvedParams.slug }, 
      select: { id: true } 
    });
    
    if (!boat) {
      console.log(`[boat-availability] Boat not found: ${resolvedParams.slug}`);
      return NextResponse.json({ days: [] });
    }
    
    console.log(`[boat-availability] Boat found: id=${boat.id}`);
    
    if (!boat) {
      return NextResponse.json({ days: [] });
    }
    
    if (!from || !to) {
      return NextResponse.json({ error: 'missing_range' }, { status: 400 });
    }
    
    // Normaliser les dates en UTC pour correspondre au format de stockage
    const fromMatch = from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const toMatch = to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!fromMatch || !toMatch) {
      return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    }
    
    const [, fromYear, fromMonth, fromDay] = fromMatch.map(Number);
    const [, toYear, toMonth, toDay] = toMatch.map(Number);
    
    const start = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0));
    const end = new Date(Date.UTC(toYear, toMonth - 1, toDay, 23, 59, 59, 999));
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'bad_range' }, { status: 400 });
    }
    
    // Récupérer les réservations actives pour ce bateau
    const reservations = await (prisma as any).reservation.findMany({
      where: {
        boatId: boat.id,
        startDate: { lte: end },
        endDate: { gte: start },
        status: { not: 'cancelled' }
      },
      select: { startDate: true, endDate: true, part: true }
    });
    
    // Créer un Set des dates réservées pour ce bateau
    const reservedDates = new Set<string>();
    for (const res of reservations) {
      const resStart = new Date(res.startDate);
      const resEnd = new Date(res.endDate);
      let current = new Date(resStart);
      while (current <= resEnd) {
        const dateKey = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        reservedDates.add(dateKey);
        current = new Date(current.getTime() + 86400000);
      }
    }
    
    // Récupérer les slots pour ce bateau spécifique
    const slots: { date: Date; part: string }[] = await (prisma as any).availabilitySlot.findMany({
      where: { 
        boatId: boat.id,
        date: { gte: start, lte: end }, 
        status: 'available' 
      },
      select: { date: true, part: true }
    });
    
    // Filtrer les slots pour exclure les dates réservées
    const availableSlots = slots.filter(s => {
      const d = new Date(s.date);
      const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      return !reservedDates.has(dateKey);
    });
    
    console.log(`[boat-availability] Found ${slots.length} slots (${availableSlots.length} after filtering reserved dates) for boat ${boat.id} in range ${from} to ${to}`);
    if (availableSlots.length > 0) {
      console.log(`[boat-availability] Sample available slots:`, availableSlots.slice(0, 3).map(s => ({
        date: s.date.toISOString(),
        part: s.part
      })));
    }
    if (reservedDates.size > 0) {
      console.log(`[boat-availability] Reserved dates for this boat:`, Array.from(reservedDates));
    }
    
    // Regrouper par date -> parts (seulement les slots disponibles, non réservés)
    const byDate: Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean; SUNSET?: boolean; reserved?: boolean }> = {};
    for (const s of availableSlots) {
      const d = new Date(s.date);
      // Utiliser UTC pour extraire la date
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      (byDate[key] ||= {});
      (byDate[key] as any)[s.part] = true;
    }
    
    console.log(`[boat-availability] Dates with slots:`, Object.keys(byDate));
    
    // Ajouter aussi les dates réservées (sans slots) pour l'affichage en rouge
    for (const dateKey of reservedDates) {
      if (!byDate[dateKey]) {
        byDate[dateKey] = { reserved: true };
      } else {
        byDate[dateKey].reserved = true;
      }
    }
    
    // Convertir en format similaire à /api/availability/days
    // Le calendrier vérifie stats.full>0 || stats.amOnly>0 || stats.pmOnly>0
    const days = Object.entries(byDate).map(([date, parts]) => {
      const isReserved = !!parts.reserved;
      const hasFull = !!parts.FULL;
      const hasAM = !!parts.AM;
      const hasPM = !!parts.PM;
      const hasSunset = !!parts.SUNSET;
      const fullCapable = hasFull || (hasAM && hasPM);
      
      // Pour SUNSET, on peut le traiter comme disponible aussi
      const hasAnySlot = hasFull || hasAM || hasPM || hasSunset;
      
      return {
        date,
        any: hasAnySlot ? 1 : 0, // 1 si au moins un slot disponible
        full: fullCapable ? 1 : 0,
        amOnly: hasAM && !hasPM && !hasFull ? 1 : 0,
        pmOnly: hasPM && !hasAM && !hasFull ? 1 : 0,
        sunset: hasSunset ? 1 : 0,
        boats: hasAnySlot ? 1 : 0, // compat ancien champ
        reserved: isReserved // Indique si la date est réservée
      };
    }).sort((a,b)=>a.date.localeCompare(b.date));
    
    console.log(`[boat-availability] Returning ${days.length} days`);
    return NextResponse.json({ days });
  } catch (e) {
    console.error('Error fetching boat availability:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
