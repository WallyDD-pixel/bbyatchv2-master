import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // NOTE Préprod: pour un jeu de données plus léger, créer un script séparé (ex: seed.preprod.ts)
  // et limiter le nombre d'entrées. Ce seed complet est surtout pour dev local.
  // seed settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      experiencesHeadlineFr: "Vivez une expérience inoubliable",
      experiencesHeadlineEn: "Live an unforgettable experience",
      experiencesTitleFr: "Nos expériences à vivre",
      experiencesTitleEn: "Experiences to enjoy",
    },
  });

  // experiences
  const count = await prisma.experience.count();
  if (count === 0) {
    await prisma.experience.createMany({
      data: [
        {
          slug: "festival-pyro-cannes-2025",
          titleFr: "Festival Pyrotechnique de Cannes et Mandelieu 2025",
          titleEn: "Cannes & Mandelieu Fireworks Festival 2025",
          descFr:
            "Tarifs locations festival pyrotechnique - Charter îles de Lerins. Package incluant : Fuel - Skipper - 1 Bouteille de champagne (10 PAX + 1 Skipper)",
          descEn:
            "Festival charter package to Lerins Islands. Includes fuel, skipper and a bottle of champagne (10 PAX + skipper).",
          timeFr: "20H30 - 23H00",
          timeEn: "8:30 PM - 11:00 PM",
          imageUrl: null,
        },
        {
          slug: "experience-croisiere",
          titleFr: "Expérience croisière",
          titleEn: "Cruise experience",
          descFr:
            "Profitez d'une expérience croisière soit le matin, soit l'après-midi soit à la journée complète",
          descEn: "Enjoy a cruise either in the morning, afternoon or full day.",
          timeFr: "Demi-journée (Matin ou après-midi)",
          timeEn: "Half day (Morning or Afternoon)",
          imageUrl: null,
        },
        {
          slug: "croisieres-sunset",
          titleFr: "CROISIERES SUNSET",
          titleEn: "SUNSET CRUISES",
          descFr:
            "Profitez des derniers rayons du soleil au large en toute sérénité. Pendant 2 heures, en famille ou entre amis, loin de l’agitation. Nos packages inclus champagne et carburant.",
          descEn:
            "Enjoy the last rays of sunshine at sea. 2 hours with friends or family, away from the crowds. Champagne and fuel included.",
          timeFr: "2025 / 20H30 - 23H00",
          timeEn: "2025 / 8:30 PM - 11:00 PM",
          imageUrl:
            "https://images.unsplash.com/photo-1501973801540-537f08ccae7b?q=80&w=1600&auto=format&fit=crop",
        },
      ],
    });
  }

  // boats
  const boatCount = await (prisma as any).boat.count();
  if (boatCount === 0) {
    await (prisma as any).boat.createMany({
      data: [
        {
          slug: "bb-yachts-44-benma",
          name: "BB Yachts 44 (Benma)",
          city: "Cannes",
          capacity: 11,
          speedKn: 25,
          fuel: 1300,
          enginePower: 425,
          pricePerDay: 2850,
          imageUrl:
            "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=1600&auto=format&fit=crop&q=80",
        },
        {
          slug: "ranieri-cayman-38-hera",
          name: "Ranieri Cayman 38 (Hera)",
          city: "Cannes",
          capacity: 11,
          speedKn: 30,
          fuel: 1300,
          enginePower: 350,
          pricePerDay: 1300,
          imageUrl:
            "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1600&auto=format&fit=crop",
        },
        {
          slug: "the-boat",
          name: "The boat",
          city: "Antibes",
          capacity: 9,
          speedKn: 25,
          fuel: 120,
          enginePower: 250,
          pricePerDay: 450,
          imageUrl:
            "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?q=80&w=1600&auto=format&fit=crop",
        },
      ],
    });
  }

  // Force-fix a broken Unsplash URL if data already exists
  await (prisma as any).boat.updateMany({
    where: {
      slug: "bb-yachts-44-benma",
      // only update if the old broken id is still present
      imageUrl: { contains: "1e59f0a67ffd" },
    },
    data: {
      imageUrl:
        "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?w=1600&auto=format&fit=crop&q=80",
    },
  });

  // gallery
  const galleryCount = await (prisma as any).galleryImage.count();
  if (galleryCount === 0) {
    await (prisma as any).galleryImage.createMany({
      data: [
        {
          imageUrl:
            "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Coucher de soleil en mer",
          titleEn: "Sunset at sea",
        },
        {
          imageUrl:
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Navigation côtière",
          titleEn: "Coastal cruising",
        },
        {
          imageUrl:
            "https://images.unsplash.com/photo-1475669698648-2f144fcaaeb1?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Ambiance à bord",
          titleEn: "Onboard vibes",
        },
        {
          imageUrl:
            "https://images.unsplash.com/photo-1468413253725-0d5181091126?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Mouillage aux îles",
          titleEn: "Anchorage at the islands",
        },
      ],
    });
  }

  // info cards
  const infoCount = await (prisma as any).infoCard.count();
  if (infoCount === 0) {
    await (prisma as any).infoCard.createMany({
      data: [
        {
          imageUrl:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Skipper professionnel",
          titleEn: "Professional skipper",
          descFr: "Navigatez en toute sécurité avec un capitaine expérimenté.",
          descEn: "Sail safely with an experienced captain.",
          sort: 1,
        },
        {
          imageUrl:
            "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Carburant inclus",
          titleEn: "Fuel included",
          descFr: "Des packages tout compris pour profiter sans surprise.",
          descEn: "All-inclusive packages for a worry-free day.",
          sort: 2,
        },
        {
          imageUrl:
            "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=1600&auto=format&fit=crop&q=80",
          titleFr: "Champagne à bord",
          titleEn: "Champagne onboard",
          descFr: "Célébrez vos moments avec une bouteille offerte.",
          descEn: "Celebrate moments with a complimentary bottle.",
          sort: 3,
        },
      ],
    });
  }

  // legal pages (seed par défaut)
  const legalCount = await (prisma as any).legalPage.count().catch(()=>0);
  if (legalCount === 0) {
    await (prisma as any).legalPage.create({
      data: {
        slug: 'conditions-paiement-location',
        titleFr: 'Conditions & Paiement',
        titleEn: 'Charter & Payment Terms',
        introFr: 'Toutes les informations relatives aux conditions de réservation, de paiement, d’annulation, de carburant et de dépôt de garantie.',
        introEn: 'All information regarding booking conditions, payment, cancellation, fuel and security deposit.',
        contentFr: 'Merci de lire attentivement ces conditions avant de confirmer votre réservation.',
        contentEn: 'Please read these terms carefully before confirming your booking.',
        cancellationFr: 'Politique d’annulation: jusqu’à 14 jours avant, remboursement à 100%. Moins de 14 jours: dépôt non remboursable.',
        cancellationEn: 'Cancellation policy: up to 14 days before, 100% refund. Less than 14 days: deposit non-refundable.',
        paymentFr: 'Modalités de paiement: acompte à la réservation, solde 48h avant le départ (CB, virement).',
        paymentEn: 'Payment modalities: deposit at booking, balance 48h before departure (card, wire).',
        fuelDepositFr: 'Carburant & dépôt: carburant inclus selon package. Dépôt de garantie selon bateau.',
        fuelDepositEn: 'Fuel & deposit: fuel included per package. Security deposit depends on the boat.',
      }
    });
  }

  // Admin user (créé si absent)
  const adminEmail = "admin@bbyachts.local";
  const adminPassword = "Admin123!"; // à changer en prod
  const hash = await bcrypt.hash(adminPassword, 10);
  await (prisma as any).user.upsert({
    where: { email: adminEmail },
    update: { role: "admin" },
    create: {
      email: adminEmail,
      name: "Admin",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      password: hash,
      emailVerified: new Date(),
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
