import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Évite une requête Prisma à chaque page (layout) — réduit latence et risque de 502. */
export const getCachedSiteSettings = unstable_cache(
  async () => {
    try {
      return await prisma.settings.findFirst();
    } catch {
      return null;
    }
  },
  ['site-settings-v1'],
  { revalidate: 120, tags: ['site-settings'] }
);
