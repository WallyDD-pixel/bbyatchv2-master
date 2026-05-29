import { prisma } from '@/lib/prisma';

/** Logo par défaut dans `public/` (BB SERVICES CHARTER) */
export const DEFAULT_SITE_LOGO = '/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png';

export async function getSiteLogoUrl(): Promise<string> {
  try {
    const settings = await prisma.settings.findFirst({
      select: { logoUrl: true },
    });
    const url = settings?.logoUrl?.trim();
    if (url) return url;
  } catch {
    // build / DB indisponible
  }
  return DEFAULT_SITE_LOGO;
}

export function resolveSiteLogoUrl(logoUrl: string | null | undefined): string {
  const url = logoUrl?.trim();
  return url || DEFAULT_SITE_LOGO;
}
