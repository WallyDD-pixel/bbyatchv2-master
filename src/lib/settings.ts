import { prisma } from '@/lib/prisma';

export async function getLabelsWithSettings(baseLabels: Record<string, string>) {
  try {
    const settings = await prisma.settings.findFirst({
      select: { waterToysUrl: true }
    });

    return {
      ...baseLabels,
      search_water_toys_url: settings?.waterToysUrl || 'https://example.com/water-toys'
    };
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
    return {
      ...baseLabels,
      search_water_toys_url: 'https://example.com/water-toys'
    };
  }
}
