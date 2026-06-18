import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  buildReservedDatesByBoat,
  isBoatReservedOnDate,
  slotDateKey,
} from '@/lib/reservation-availability';
import { hasHalfDaySlot, isHalfDayPart } from '@/lib/part-labels';

// GET /api/availability/boats?from=YYYY-MM-DD&to=YYYY-MM-DD&part=FULL|AM|PM
// Retourne les bateaux disponibles sur TOUTE la plage demandée selon la logique de part :
//  - part=AM/PM : chaque jour doit avoir un slot de ce part OU un slot FULL
//  - part=FULL : chaque jour doit avoir soit un slot FULL soit (AM et PM présents)
// Fournit aussi des compteurs de slots dans la plage.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const part = searchParams.get('part') as 'FULL'|'AM'|'PM'|'HALF'|'SUNSET'|null;
  if (!from || !to || !part) return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  const partNorm = part === 'AM' || part === 'PM' ? 'HALF' : part;
  if (!['FULL','HALF','SUNSET'].includes(partNorm)) return NextResponse.json({ error: 'bad_part' }, { status: 400 });
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end)
    return NextResponse.json({ error: 'bad_range' }, { status: 400 });

  // Liste des jours requis
  const requiredDays: string[] = [];
  {
    let cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      requiredDays.push(`${y}-${m}-${d}`);
      cur = new Date(cur.getTime() + 86400000);
    }
  }

  try {
    interface Boat {
      id: number;
      name: string;
      slug: string;
      imageUrl: string;
      capacity: number;
      pricePerDay: number;
    }

    // type SlotPart = 'FULL' | 'AM' | 'PM' | 'HALF' | 'SUNSET';

    interface AvailabilitySlot {
      boatId: number;
      date: Date | string;
      part: string;
    }

    const [boats, slots, reservations]: [Boat[], AvailabilitySlot[], any[]] = await Promise.all([
      (prisma as any).boat.findMany({
      where: { available: true },
      orderBy: { id: 'asc' },
      select: { id:true, name:true, slug:true, imageUrl:true, capacity:true, pricePerDay:true }
      }),
      (prisma as any).availabilitySlot.findMany({
      where: { date: { gte: start, lte: end }, status: 'available' },
      select: { boatId: true, date: true, part: true }
      }),
      // Récupérer les réservations actives qui chevauchent la plage demandée
      (prisma as any).reservation.findMany({
        where: {
          startDate: { lte: end },
          endDate: { gte: start },
          status: { not: 'cancelled' }
        },
        select: { boatId: true, startDate: true, endDate: true, part: true }
      })
    ]);

    // Dates réservées par bateau (tous créneaux bloqués ces jours-là)
    const reservedByBoat = buildReservedDatesByBoat(reservations);

    // Map des slots par boatId -> date -> parts
    const byBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; HALF?: boolean; FULL?: boolean; SUNSET?: boolean }>> = {};
    for (const s of slots) {
      const key = slotDateKey(s.date);
      if (isBoatReservedOnDate(s.boatId, key, reservedByBoat)) continue;

      const boat = (byBoat[s.boatId] ||= {});
      const day = (boat[key] ||= {});
      (day as any)[s.part] = true;
      if (isHalfDayPart(s.part)) {
        day.HALF = true;
      }
    }

    interface Boat {
      id: number;
      name: string;
      slug: string;
      imageUrl: string;
      capacity: number;
      pricePerDay: number;
    }

    interface AvailabilitySlot {
      boatId: number;
      date: Date | string;
      part: string;
    }

    interface BoatsResult {
      id: number;
      name: string;
      slug: string;
      imageUrl: string;
      capacity: number;
      pricePerDay: number;
    }

    interface SlotsResult {
      boatId: number;
      date: Date | string;
      part: string;
    }

    // Add types to boats and slots
    // boats and slots are already defined above from Promise.all, just use them as Boat[] and AvailabilitySlot[]
    // Add types to boats and slots
    const typedBoats: Boat[] = boats as Boat[];
    const typedSlots: AvailabilitySlot[] = slots as AvailabilitySlot[];
    interface DayParts {
      AM?: boolean;
      PM?: boolean;
      FULL?: boolean;
      SUNSET?: boolean;
    }

    interface EligibleBoat extends Boat {
      fullCount: number;
      amCount: number;
      pmCount: number;
    }

    const eligible: EligibleBoat[] = boats.filter((b: Boat) => {
      const days = byBoat[b.id];
      if (!days) return false;
      for (const d of requiredDays) {
        const parts = days[d];
        if (!parts) return false;
        if (partNorm === 'HALF') {
          if (!hasHalfDaySlot(parts)) return false;
        } else if (partNorm === 'SUNSET') {
          if (!(parts.SUNSET || parts.FULL)) return false;
        } else if (partNorm === 'FULL') {
          // Assouplissement : si une seule journée (from==to) on accepte n'importe quel slot (FULL ou AM ou PM)
          if (requiredDays.length === 1) {
            if (!(parts.FULL || parts.AM || parts.PM)) return false;
          } else {
            if (!(parts.FULL || (parts.AM && parts.PM))) return false;
          }
        }
      }
      return true;
    }).map((b: Boat) => {
      // compteurs sur la plage (pour info, pas forcément critère)
      const days = byBoat[b.id];
      let fullCount = 0, amCount = 0, pmCount = 0;
      requiredDays.forEach(d => {
        const p = days?.[d];
        if (!p) return;
        if (p.FULL) fullCount++;
        if (p.AM) amCount++;
        if (p.PM) pmCount++;
      });
      return { ...b, fullCount, amCount, pmCount };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ boats: eligible, days: requiredDays.length });
  } catch (e) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
