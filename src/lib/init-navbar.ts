import { prisma } from './prisma';

export async function initializeDefaultNavbar() {
  try {
    // Vérifier si des éléments existent déjà
    const existingItems = await prisma.navbarItem.count();
    
    if (existingItems === 0) {
      // Créer les éléments par défaut
      const defaultItems = [
        {
          labelFr: 'Bateaux disponibles',
          labelEn: 'Available boats',
          href: '/?lang=fr#fleet',
          icon: '⛵',
          order: 0,
          visible: true,
          target: '_self'
        },
        {
          labelFr: 'Nos expériences',
          labelEn: 'Our experiences',
          href: '/?lang=fr#experiences',
          icon: '🌊',
          order: 1,
          visible: true,
          target: '_self'
        },
        {
          labelFr: 'Vente d\'occasion',
          labelEn: 'Used sale',
          href: '/used-sale?lang=fr',
          icon: '💼',
          order: 2,
          visible: true,
          target: '_self'
        },
        {
          labelFr: 'A propos',
          labelEn: 'About',
          href: '/about',
          icon: 'ℹ️',
          order: 3,
          visible: true,
          target: '_self'
        }
      ];

      await prisma.navbarItem.createMany({
        data: defaultItems
      });

      console.log('✅ Éléments de navigation par défaut créés');
    } else {
      console.log('ℹ️ Éléments de navigation déjà présents');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la navbar:', error);
  }
}
