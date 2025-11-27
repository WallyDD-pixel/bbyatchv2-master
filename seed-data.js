const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('🌱 Création des données de test...');

    // 1. Créer un utilisateur admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Administrateur',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      }
    });
    console.log('✅ Admin créé:', admin.email);

    // 2. Créer quelques villes
    const nice = await prisma.city.upsert({
      where: { name: 'Nice' },
      update: {},
      create: { name: 'Nice' }
    });

    const cannes = await prisma.city.upsert({
      where: { name: 'Cannes' },
      update: {},
      create: { name: 'Cannes' }
    });

    console.log('✅ Villes créées: Nice, Cannes');

    // 3. Créer des settings par défaut
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        experiencesHeadlineFr: 'Nos Expériences',
        experiencesHeadlineEn: 'Our Experiences',
        experiencesTitleFr: 'Découvrez la Méditerranée',
        experiencesTitleEn: 'Discover the Mediterranean',
        mainSliderTitle: 'BB YACHTS',
        mainSliderSubtitle: 'Location de yachts sur la Côte d\'Azur',
        aboutUsTitle: 'À propos de nous',
        aboutUsText: 'Spécialistes de la location de yachts depuis plus de 10 ans.',
        platformCommissionPct: 20,
        currency: 'eur',
        defaultSkipperPrice: 350
      }
    });
    console.log('✅ Settings créés');

    // 4. Créer quelques bateaux d'occasion avec des images d'exemple
    const usedBoat1 = await prisma.usedBoat.upsert({
      where: { slug: 'bb-yachts-44-benma' },
      update: {},
      create: {
        slug: 'bb-yachts-44-benma',
        titleFr: 'BB Yachts 44 Benma',
        titleEn: 'BB Yachts 44 Benma',
        summaryFr: 'Magnifique yacht de 44 pieds en excellent état',
        summaryEn: 'Beautiful 44-foot yacht in excellent condition',
        descriptionFr: 'Ce superbe yacht BB Yachts 44 Benma offre un confort exceptionnel avec ses finitions haut de gamme. Parfait pour la croisière en Méditerranée.',
        descriptionEn: 'This superb BB Yachts 44 Benma offers exceptional comfort with its high-end finishes. Perfect for cruising in the Mediterranean.',
        year: 2018,
        lengthM: 13.4,
        engineHours: 450,
        engines: '2x Volvo IPS 400',
        fuelType: 'diesel',
        priceEur: 295000,
        status: 'listed',
        mainImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1582719471137-c3967ffb1c42?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop'
        ]),
        videoUrls: JSON.stringify([
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ]),
        sort: 1
      }
    });

    const usedBoat2 = await prisma.usedBoat.upsert({
      where: { slug: 'azimut-55-prestige' },
      update: {},
      create: {
        slug: 'azimut-55-prestige',
        titleFr: 'Azimut 55 Prestige',
        titleEn: 'Azimut 55 Prestige',
        summaryFr: 'Yacht de luxe italien, design moderne',
        summaryEn: 'Italian luxury yacht, modern design',
        descriptionFr: 'L\'Azimut 55 Prestige combine élégance italienne et performance. Idéal pour des sorties en mer inoubliables.',
        descriptionEn: 'The Azimut 55 Prestige combines Italian elegance and performance. Ideal for unforgettable sea trips.',
        year: 2020,
        lengthM: 16.8,
        engineHours: 280,
        engines: '2x MAN V8 1200',
        fuelType: 'diesel',
        priceEur: 485000,
        status: 'listed',
        mainImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1566024287286-457247b70310?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop'
        ]),
        sort: 2
      }
    });

    console.log('✅ Bateaux d\'occasion créés:', usedBoat1.titleFr, usedBoat2.titleFr);

    // 5. Créer quelques bateaux de location
    const boat1 = await prisma.boat.upsert({
      where: { slug: 'sunseeker-manhattan-52' },
      update: {},
      create: {
        slug: 'sunseeker-manhattan-52',
        name: 'Sunseeker Manhattan 52',
        cityId: nice.id,
        capacity: 12,
        speedKn: 28,
        fuel: 1200,
        enginePower: 800,
        lengthM: 15.8,
        pricePerDay: 1200,
        priceAm: 650,
        pricePm: 750,
        priceSunset: 450,
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
        ]),
        avantagesFr: 'Yacht de luxe • Flybridge spacieux • Équipement haut de gamme',
        avantagesEn: 'Luxury yacht • Spacious flybridge • High-end equipment',
        optionsInclusesFr: 'Carburant • Skipper • Équipement de sécurité',
        optionsInclusesEn: 'Fuel • Skipper • Safety equipment',
        skipperRequired: true,
        skipperPrice: 350,
        available: true
      }
    });

    console.log('✅ Bateau de location créé:', boat1.name);

    // 6. Créer une expérience
    const experience = await prisma.experience.upsert({
      where: { slug: 'coucher-soleil-cannes' },
      update: {},
      create: {
        slug: 'coucher-soleil-cannes',
        titleFr: 'Coucher de soleil à Cannes',
        titleEn: 'Sunset in Cannes',
        descFr: 'Admirez un magnifique coucher de soleil depuis la baie de Cannes',
        descEn: 'Admire a beautiful sunset from the bay of Cannes',
        timeFr: '2 heures',
        timeEn: '2 hours',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        photoUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
        ]),
        hasFixedTimes: true,
        fixedDepartureTime: '19:00',
        fixedReturnTime: '21:00'
      }
    });

    console.log('✅ Expérience créée:', experience.titleFr);

    console.log('🎉 Données de test créées avec succès !');
    console.log('');
    console.log('📋 Résumé:');
    console.log('- Admin: admin@example.com / admin123');
    console.log('- 2 bateaux d\'occasion avec images');
    console.log('- 1 bateau de location');
    console.log('- 1 expérience');
    console.log('- Villes: Nice, Cannes');

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
