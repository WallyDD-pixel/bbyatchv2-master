import { prisma } from './prisma';

export type ReservationLike = {
  boatId?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  status?: string | null;
};

export function isActiveReservationStatus(status?: string | null): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s !== 'cancelled' && s !== 'canceled';
}

export function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function slotDateKey(date: Date | string): string {
  const d = new Date(date);
  return utcDateKey(d);
}

export function parseToUtcDay(date: Date | string): Date {
  if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const day = Number(m[3]);
      return new Date(Date.UTC(y, mo - 1, day, 0, 0, 0, 0));
    }
  }
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function eachUtcDayBetween(start: Date | string, end: Date | string): Date[] {
  const days: Date[] = [];
  let cur = parseToUtcDay(start);
  const last = parseToUtcDay(end);
  while (cur <= last) {
    days.push(new Date(cur));
    cur = new Date(cur.getTime() + 86400000);
  }
  return days;
}

/** boatId → dates réservées (YYYY-MM-DD UTC) */
export function buildReservedDatesByBoat(
  reservations: ReservationLike[]
): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const res of reservations) {
    if (!res.boatId || !isActiveReservationStatus(res.status)) continue;
    const set = map.get(res.boatId) ?? new Set<string>();
    for (const day of eachUtcDayBetween(res.startDate, res.endDate)) {
      set.add(utcDateKey(day));
    }
    map.set(res.boatId, set);
  }
  return map;
}

export function isBoatReservedOnDate(
  boatId: number,
  dateKey: string,
  reservedByBoat: Map<number, Set<string>>
): boolean {
  return reservedByBoat.get(boatId)?.has(dateKey) ?? false;
}

/**
 * Supprime tous les créneaux (bateau + expériences liées) pour les jours réservés.
 */
export async function clearBoatAvailabilityForReservation(
  boatId: number,
  startDate: Date | string,
  endDate: Date | string
): Promise<{ boatSlots: number; experienceSlots: number }> {
  const days = eachUtcDayBetween(startDate, endDate);
  if (days.length === 0) return { boatSlots: 0, experienceSlots: 0 };

  const dayStart = days[0];
  const dayEnd = new Date(days[days.length - 1].getTime() + 86400000 - 1);

  const [boatResult, expResult] = await Promise.all([
    prisma.availabilitySlot.deleteMany({
      where: { boatId, date: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.experienceAvailabilitySlot.deleteMany({
      where: { boatId, date: { gte: dayStart, lte: dayEnd } },
    }),
  ]);

  return { boatSlots: boatResult.count, experienceSlots: expResult.count };
}

/** Nettoie les créneaux orphelins encore présents sur des jours réservés. */
export async function syncAvailabilityWithReservations(
  reservations: ReservationLike[]
): Promise<{ boatSlots: number; experienceSlots: number }> {
  let boatSlots = 0;
  let experienceSlots = 0;
  for (const res of reservations) {
    if (!res.boatId || !isActiveReservationStatus(res.status)) continue;
    const cleared = await clearBoatAvailabilityForReservation(
      res.boatId,
      res.startDate,
      res.endDate
    );
    boatSlots += cleared.boatSlots;
    experienceSlots += cleared.experienceSlots;
  }
  return { boatSlots, experienceSlots };
}

/** À appeler après chaque nouvelle réservation confirmée. */
export async function blockAvailabilityForNewReservation(
  boatId: number | null | undefined,
  startDate: Date | string,
  endDate: Date | string
): Promise<void> {
  if (!boatId) return;
  try {
    const result = await clearBoatAvailabilityForReservation(boatId, startDate, endDate);
    if (result.boatSlots > 0 || result.experienceSlots > 0) {
      console.log(`[availability] Créneaux retirés pour bateau ${boatId}:`, result);
    }
  } catch (e) {
    console.error('[availability] Échec retrait créneaux réservation:', e);
  }
}
