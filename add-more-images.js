const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMoreImages() {
  try {
    console.log('🖼️ Ajout d\'images supplémentaires...');

    // Mettre à jour le premier bateau avec plus d'images
    await prisma.usedBoat.update({
      where: { id: 1 },
      data: {
        mainImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1582719471137-c3967ffb1c42?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop'
        ])
      }
    });

    // Mettre à jour le deuxième bateau avec plus d'images
    await prisma.usedBoat.update({
      where: { id: 2 },
      data: {
        mainImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1566024287286-457247b70310?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
        ])
      }
    });

    console.log('✅ Images supplémentaires ajoutées !');
    console.log('- Bateau 1: 1 image principale + 5 images secondaires');
    console.log('- Bateau 2: 1 image principale + 4 images secondaires');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreImages();
