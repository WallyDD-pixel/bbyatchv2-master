export type BookingPart = 'FULL' | 'HALF' | 'SUNSET' | 'AM' | 'PM';
export type SearchPart = 'FULL' | 'HALF' | 'SUNSET' | 'AM' | 'PM';

export function parseSearchPart(raw?: string | null): SearchPart {
  const p = raw?.trim().toUpperCase();
  // AM/PM → demi-journée (terminologie produit)
  if (p === 'AM' || p === 'PM' || p === 'HALF') return 'HALF';
  if (p === 'FULL' || p === 'SUNSET') return p;
  return 'FULL';
}

export function parseBookingPart(raw?: string | null): BookingPart {
  const p = raw?.trim().toUpperCase();
  if (p === 'HALF' || p === 'AM' || p === 'PM') return 'HALF';
  if (p === 'FULL' || p === 'SUNSET') return p;
  return 'FULL';
}

export type BoatPrices = {
  pricePerDay?: number | null;
  priceAm?: number | null;
  pricePm?: number | null;
  priceSunset?: number | null;
  priceAgencyPerDay?: number | null;
  priceAgencyAm?: number | null;
  priceAgencyPm?: number | null;
  priceAgencySunset?: number | null;
};

function positivePrice(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return !isNaN(n) && n > 0 ? n : null;
}

export function getHalfDayPrice(b: BoatPrices): number | null {
  return positivePrice(b.priceAm) ?? positivePrice(b.pricePm);
}

const agencyDiscount = (publicPrice: number) => Math.round(publicPrice * 0.8);

/** Prix coque pour un créneau donné (sans options ni skipper). */
export function getBoatPriceForPart(
  b: BoatPrices,
  part: SearchPart | BookingPart,
  nbJours = 1,
  isAgency = false
): number | null {
  const day = positivePrice(b.pricePerDay);
  const half = getHalfDayPrice(b);
  const sunset = positivePrice(b.priceSunset);
  const days = Math.max(nbJours, 1);

  if (isAgency) {
    const agencyDay = positivePrice(b.priceAgencyPerDay);
    const agencyHalf = positivePrice(b.priceAgencyAm) ?? positivePrice(b.priceAgencyPm);
    const agencySunset = positivePrice(b.priceAgencySunset);

    if (part === 'FULL') {
      return agencyDay != null ? agencyDay * days : day != null ? agencyDiscount(day) * days : null;
    }
    if (part === 'SUNSET') {
      return agencySunset ?? (sunset != null ? agencyDiscount(sunset) : null);
    }
    if (part === 'HALF' || part === 'AM' || part === 'PM') {
      return agencyHalf ?? (half != null ? agencyDiscount(half) : null);
    }
    return null;
  }

  if (part === 'FULL') return day != null ? day * days : null;
  if (part === 'SUNSET') return sunset;
  if (part === 'HALF' || part === 'AM' || part === 'PM') return half;
  return null;
}

/** Créneau à réserver selon la recherche — ne pas upgrader vers FULL si AM/PM/SUNSET dispo. */
export function resolveBookingPart(
  searchPart: SearchPart,
  available?: { FULL?: boolean; AM?: boolean; PM?: boolean; HALF?: boolean; SUNSET?: boolean }
): BookingPart {
  const ap = available ?? {};
  const halfAvail = !!(ap.HALF || ap.AM || ap.PM);

  if (searchPart === 'FULL') {
    if (ap.FULL) return 'FULL';
    if (halfAvail) return 'HALF';
    return 'FULL';
  }
  if (searchPart === 'SUNSET') {
    if (ap.SUNSET) return 'SUNSET';
    return 'SUNSET';
  }
  if (searchPart === 'HALF' || searchPart === 'AM' || searchPart === 'PM') {
    if (ap.HALF || ap.AM || ap.PM) return 'HALF';
    if (ap.FULL) return 'FULL';
    return 'HALF';
  }
  return 'FULL';
}

/** Part utilisée pour afficher le prix sur la carte résultat. */
export function getDisplayPricePart(searchPart: SearchPart, bookingPart: BookingPart): SearchPart | BookingPart {
  if (searchPart === 'SUNSET') return 'SUNSET';
  if (searchPart === 'HALF' || searchPart === 'AM' || searchPart === 'PM') {
    return bookingPart === 'FULL' ? 'FULL' : 'HALF';
  }
  if (searchPart === 'FULL') return 'FULL';
  return bookingPart;
}

export function getBookingPartLabel(
  t: Record<string, string>,
  part: SearchPart | BookingPart
): string {
  if (part === 'FULL') return t.search_part_full;
  if (part === 'SUNSET') return t.search_part_sunset;
  if (part === 'HALF' || part === 'AM' || part === 'PM') {
    return t.search_part_half ?? t.search_part_am;
  }
  return t.search_part_full;
}
