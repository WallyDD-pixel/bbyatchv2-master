/** Libellés créneaux — plus de « Matin » / « Après-midi » côté produit. */

export type SlotPartCode = 'FULL' | 'HALF' | 'SUNSET' | 'AM' | 'PM';

/** Anciens codes AM/PM encore en base ou en URL. */
export function isHalfDayPart(part?: string | null): boolean {
  const p = part?.trim().toUpperCase();
  return p === 'HALF' || p === 'AM' || p === 'PM';
}

export function isHalfDaySlotPart(part?: string | null): boolean {
  return isHalfDayPart(part);
}

export function normalizeSearchPartCode(part?: string | null): SlotPartCode | 'FULL' | 'SUNSET' {
  const p = part?.trim().toUpperCase();
  if (p === 'SUNSET') return 'SUNSET';
  if (p === 'FULL') return 'FULL';
  if (isHalfDayPart(p)) return 'HALF';
  return 'FULL';
}

export function formatPartLabel(
  part: string | null | undefined,
  locale: 'fr' | 'en' = 'fr'
): string {
  const p = part?.trim().toUpperCase();
  if (p === 'FULL') return locale === 'fr' ? 'Journée complète' : 'Full day';
  if (p === 'SUNSET') return 'Sunset';
  if (isHalfDayPart(p)) return locale === 'fr' ? 'Demi-journée' : 'Half day';
  return part?.trim() || '—';
}

export function formatPartLabelShort(
  part: string | null | undefined,
  locale: 'fr' | 'en' = 'fr'
): string {
  const p = part?.trim().toUpperCase();
  if (p === 'FULL') return locale === 'fr' ? 'Journée complète (8h)' : 'Full day (8h)';
  if (p === 'SUNSET') return locale === 'fr' ? 'Sunset (2h)' : 'Sunset (2h)';
  if (isHalfDayPart(p)) return locale === 'fr' ? 'Demi-journée (4h)' : 'Half day (4h)';
  return formatPartLabel(part, locale);
}

export function hasHalfDaySlot(parts: {
  AM?: boolean;
  PM?: boolean;
  HALF?: boolean;
  FULL?: boolean;
}): boolean {
  return !!(parts.FULL || parts.HALF || parts.AM || parts.PM);
}
