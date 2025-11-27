import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Récupérer le bateau
    const boat = await prisma.boat.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!boat) {
      return NextResponse.json({ error: 'Bateau non trouvé' }, { status: 404 });
    }

    // Récupérer les expériences associées à ce bateau
    const boatExperiences = await prisma.boatExperience.findMany({
      where: { boatId: boat.id },
      include: {
        experience: {
          select: {
            id: true,
            slug: true,
            titleFr: true,
            titleEn: true,
            descFr: true,
            descEn: true,
            timeFr: true,
            timeEn: true,
            imageUrl: true,
            hasFixedTimes: true,
            fixedDepartureTime: true,
            fixedReturnTime: true
          }
        }
      }
    });

    const experiences = boatExperiences.map(be => ({
      ...be.experience,
      price: be.price
    }));

    return NextResponse.json({ experiences });
  } catch (error) {
    console.error('Erreur lors de la récupération des expériences:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
