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
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({ error: 'bad_range' }, { status: 400 });
  try {
    const slots: { date: Date; boatId: number; part: string }[] = await (prisma as any).availabilitySlot.findMany({
      where: { date: { gte: start, lte: end }, status: 'available' },
      select: { date: true, boatId: true, part: true }
    });
    // Regrouper par boatId -> date -> parts (utiliser UTC pour extraire les dates)
    const byBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean }>> = {};
    for (const s of slots) {
      const d = new Date(s.date);
      // Utiliser UTC pour correspondre au format de stockage
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
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
    })).sort((a,b)=>a.date.localeCompare(b.date));
    return NextResponse.json({ days });
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
