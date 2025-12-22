import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/availability/days?from=YYYY-MM-DD&to=YYYY-MM-DD
// Retourne pour chaque jour :
//  - any: nb de bateaux ayant au moins un slot (AM/PM/FULL)
//  - full: nb de bateaux réservable journée (slot FULL ou AM+PM)
//  - amOnly: nb de bateaux uniquement matin (AM sans PM ni FULL)
//  - pmOnly: nb de bateaux uniquement après-midi (PM sans AM ni FULL)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'missing_range' }, { status: 400 });
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  try {
    const [slots, reservations] = await Promise.all([
      (prisma as any).availabilitySlot.findMany({
        where: { date: { gte: start, lte: end }, status: 'available' },
        select: { date: true, boatId: true, part: true }
      }),
      (prisma as any).reservation.findMany({
        where: { 
          startDate: { lte: end }, 
          endDate: { gte: start }, 
          status: { not: 'canceled' } 
        },
        select: { startDate: true, endDate: true }
      })
    ]);
    
    // Extraire les dates de début et de fin des réservations
    const reservationStartDates = new Set<string>();
    const reservationEndDates = new Set<string>();
    for (const res of reservations) {
      const startDate = new Date(res.startDate);
      const endDate = new Date(res.endDate);
      const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;
      const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
      reservationStartDates.add(startKey);
      reservationEndDates.add(endKey);
    }
    
    // Regrouper par boatId -> date -> parts
    const byBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean }>> = {};
    for (const s of slots) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      (byBoat[s.boatId] ||= {});
      (byBoat[s.boatId][key] ||= {});
      (byBoat[s.boatId][key] as any)[s.part] = true;
    }
    // Agrégation par date
    const dateStats: Record<string, { any:Set<number>; full:Set<number>; amOnly:Set<number>; pmOnly:Set<number> }> = {};
    for (const boatIdStr of Object.keys(byBoat)) {
      const boatId = Number(boatIdStr);
      for (const date of Object.keys(byBoat[boatId])) {
        const parts = byBoat[boatId][date];
        (dateStats[date] ||= { any:new Set(), full:new Set(), amOnly:new Set(), pmOnly:new Set() });
        const ds = dateStats[date];
        ds.any.add(boatId);
        const hasFull = !!parts.FULL;
        const hasAM = !!parts.AM;
        const hasPM = !!parts.PM;
        const fullCapable = hasFull || (hasAM && hasPM);
        if (fullCapable) {
          ds.full.add(boatId);
        } else {
          if (hasAM) ds.amOnly.add(boatId);
          if (hasPM) ds.pmOnly.add(boatId);
        }
      }
    }
    const days = Object.entries(dateStats).map(([date, s]) => ({
      date,
      any: s.any.size,
      full: s.full.size,
      amOnly: s.amOnly.size,
      pmOnly: s.pmOnly.size,
      boats: s.any.size, // compat ancien champ
      isReservationStart: reservationStartDates.has(date),
      isReservationEnd: reservationEndDates.has(date),
    })).sort((a,b)=>a.date.localeCompare(b.date));
    return NextResponse.json({ days });
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
