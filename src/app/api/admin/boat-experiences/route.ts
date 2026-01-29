import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession() as any;
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boatId = searchParams.get('boatId');
    const experienceId = searchParams.get('experienceId');

    if (boatId) {
      // Récupérer les expériences liées à un bateau
      const boatExperiences = await prisma.boatExperience.findMany({
        where: { boatId: Number(boatId) },
        include: {
          experience: {
            select: {
              id: true,
              slug: true,
              titleFr: true,
              titleEn: true,
              descFr: true,
              descEn: true,
              imageUrl: true
            }
          }
        }
      });
      return NextResponse.json({ boatExperiences });
    }

    if (experienceId) {
      // Récupérer les bateaux liés à une expérience
      const experienceBoats = await prisma.boatExperience.findMany({
        where: { experienceId: Number(experienceId) },
        include: {
          boat: {
            select: {
              id: true,
              slug: true,
              name: true,
              imageUrl: true,
              capacity: true
            }
          }
        }
      });
      return NextResponse.json({ experienceBoats });
    }

    // Récupérer tous les liens
    const allLinks = await prisma.boatExperience.findMany({
      include: {
        boat: {
          select: {
            id: true,
            slug: true,
            name: true,
            imageUrl: true
          }
        },
        experience: {
          select: {
            id: true,
            slug: true,
            titleFr: true,
            titleEn: true,
            imageUrl: true
          }
        }
      }
    });

    return NextResponse.json({ links: allLinks });
  } catch (error) {
    console.error('Erreur lors de la récupération des liens:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession() as any;
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boatId, experienceId, price } = await request.json();

    if (!boatId || !experienceId) {
      return NextResponse.json({ error: 'boatId et experienceId requis' }, { status: 400 });
    }

    // Vérifier que le bateau et l'expérience existent
    const boat = await prisma.boat.findUnique({ where: { id: Number(boatId) } });
    const experience = await prisma.experience.findUnique({ where: { id: Number(experienceId) } });

    if (!boat || !experience) {
      return NextResponse.json({ error: 'Bateau ou expérience non trouvé' }, { status: 404 });
    }

    // Créer ou mettre à jour le lien
    const link = await prisma.boatExperience.upsert({
      where: {
        boatId_experienceId: {
          boatId: Number(boatId),
          experienceId: Number(experienceId)
        }
      },
      update: {
        price: price ? Number(price) : null
      },
      create: {
        boatId: Number(boatId),
        experienceId: Number(experienceId),
        price: price ? Number(price) : null
      },
      include: {
        boat: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        experience: {
          select: {
            id: true,
            titleFr: true,
            titleEn: true,
            slug: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      link,
      message: 'Lien créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du lien:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession() as any;
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boatId = searchParams.get('boatId');
    const experienceId = searchParams.get('experienceId');

    if (!boatId || !experienceId) {
      return NextResponse.json({ error: 'boatId et experienceId requis' }, { status: 400 });
    }

    await prisma.boatExperience.delete({
      where: {
        boatId_experienceId: {
          boatId: Number(boatId),
          experienceId: Number(experienceId)
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Lien supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du lien:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
