/**
 * Script pour nettoyer les images invalides de la base de donnees
 * Usage: node scripts/clean-invalid-images.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidImages() {
  console.log('Recherche des images invalides...\n');

  try {
    // Recuperer toutes les images de la galerie
    const galleryImages = await prisma.galleryImage.findMany();
    console.log(`Trouve ${galleryImages.length} image(s) dans la galerie`);

    const invalidImages = [];
    
    for (const img of galleryImages) {
      if (!img.imageUrl) {
        invalidImages.push({ type: 'gallery', id: img.id, reason: 'URL vide' });
        continue;
      }
      
      // Verifier les URLs locales invalides
      if (img.imageUrl.includes('/uploads/') || img.imageUrl.startsWith('/uploads/')) {
        invalidImages.push({ type: 'gallery', id: img.id, reason: 'URL locale invalide (/uploads/)' });
        continue;
      }
      
      // Verifier les URLs Supabase malformees
      if (img.imageUrl.includes('supabase') && !img.imageUrl.includes('storage')) {
        invalidImages.push({ type: 'gallery', id: img.id, reason: 'URL Supabase malformee' });
      }
    }

    if (invalidImages.length === 0) {
      console.log('Aucune image invalide trouvee !');
      return;
    }

    console.log(`\nTrouve ${invalidImages.length} image(s) invalide(s):\n`);
    invalidImages.forEach(img => {
      console.log(`  - ${img.type} ID ${img.id}: ${img.reason}`);
    });

    console.log('\nSuppression des images invalides...');
    
    for (const img of invalidImages) {
      if (img.type === 'gallery') {
        await prisma.galleryImage.delete({ where: { id: img.id } });
        console.log(`  Supprime: GalleryImage ID ${img.id}`);
      }
    }

    console.log(`\n${invalidImages.length} image(s) supprimee(s) avec succes !`);
    
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executer le script
cleanInvalidImages()
  .then(() => {
    console.log('\nNettoyage termine !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErreur fatale:', error);
    process.exit(1);
  });
