import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let navbarItems = await prisma.navbarItem.findMany({
      where: { visible: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        labelFr: true,
        labelEn: true,
        href: true,
        icon: true,
        target: true
      }
    });

    // Toujours inclure "Contactez-nous" s'il n'est pas déjà dans la liste
    const hasContact = navbarItems.some((item: { href?: string | null }) => item.href && item.href.includes('/contact'));
    if (!hasContact) {
      navbarItems = [...navbarItems, {
        id: 999,
        labelFr: 'Contactez-nous',
        labelEn: 'Contact us',
        href: '/contact',
        icon: '✉️',
        target: '_self'
      }];
    }

    return NextResponse.json({ navbarItems });
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments de navbar:', error);
    // En cas d'erreur, retourner les éléments par défaut
    const defaultItems = [
      { id: 1, labelFr: 'Bateaux disponibles', labelEn: 'Available boats', href: '/?lang=fr#fleet', icon: '⛵', target: '_self' },
      { id: 2, labelFr: 'Nos expériences', labelEn: 'Our experiences', href: '/?lang=fr#experiences', icon: '🌊', target: '_self' },
      { id: 3, labelFr: 'Vente d\'occasion', labelEn: 'Used sale', href: '/used-sale?lang=fr', icon: '💼', target: '_self' },
      { id: 4, labelFr: 'A propos', labelEn: 'About', href: '/about', icon: 'ℹ️', target: '_self' },
      { id: 5, labelFr: 'Contactez-nous', labelEn: 'Contact us', href: '/contact', icon: '✉️', target: '_self' }
    ];
    return NextResponse.json({ navbarItems: defaultItems });
  }
}
