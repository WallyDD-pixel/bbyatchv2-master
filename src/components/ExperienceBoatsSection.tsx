import Image from "next/image";
import Link from "next/link";
import { type Locale } from "@/i18n/messages";
import { prisma } from "@/lib/prisma";

interface ExperienceBoat {
  boatId: number;
  boatName: string;
  boatSlug: string;
  boatImageUrl: string | null;
  boatCapacity: number | null;
  boatSpeedKn: number | null;
  experienceId: number;
  experienceSlug: string;
  experienceTitle: string;
  experienceImageUrl: string | null;
  experienceDesc: string;
  price: number | null;
  date: string;
}

export default async function ExperienceBoatsSection({ locale }: { locale: Locale }) {
  // Récupérer les prochaines dates avec des disponibilités d'expériences
  const now = new Date();
  const dateStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  // Chercher les disponibilités pour les 90 prochains jours
  const dateEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 90, 23, 59, 59, 999));

  let experienceBoats: ExperienceBoat[] = [];

  try {
    // Récupérer les slots d'expériences disponibles pour les prochaines dates
    const experienceSlots = await (prisma as any).experienceAvailabilitySlot.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
        status: 'available',
        boatId: { not: null } // Seulement les slots liés à un bateau
      },
      select: {
        id: true,
        experienceId: true,
        boatId: true,
        date: true,
        part: true
      },
      orderBy: {
        date: 'asc' // Trier par date croissante
      }
    });

    if (experienceSlots.length === 0) {
      return null; // Pas de slots disponibles, ne pas afficher la section
    }

    // Récupérer les IDs uniques d'expériences et de bateaux
    const experienceIds = [...new Set(experienceSlots.map((s: any) => s.experienceId))];
    const boatIds = [...new Set(experienceSlots.map((s: any) => s.boatId).filter(Boolean))];

    // Récupérer les expériences et bateaux avec plus d'informations
    const [experiences, boats] = await Promise.all([
      (prisma as any).experience.findMany({
        where: { id: { in: experienceIds } },
        select: { id: true, slug: true, titleFr: true, titleEn: true, imageUrl: true, descFr: true, descEn: true }
      }),
      (prisma as any).boat.findMany({
        where: { id: { in: boatIds }, available: true },
        select: { id: true, name: true, slug: true, imageUrl: true, capacity: true, speedKn: true }
      })
    ]);

    // Récupérer les prix des combinaisons bateau-expérience
    const boatExperiences = await (prisma as any).boatExperience.findMany({
      where: {
        boatId: { in: boatIds },
        experienceId: { in: experienceIds }
      },
      select: { boatId: true, experienceId: true, price: true }
    });

    // Créer un map pour les prix
    const priceMap = new Map<string, number | null>();
    for (const be of boatExperiences) {
      priceMap.set(`${be.boatId}-${be.experienceId}`, be.price);
    }

    // Construire la liste des combinaisons bateau-expérience disponibles
    // Utiliser une clé unique incluant la date pour permettre plusieurs dates
    const combinations = new Map<string, ExperienceBoat>();
    
    for (const slot of experienceSlots) {
      if (!slot.boatId) continue;
      
      // Extraire la date du slot
      const slotDate = new Date(slot.date);
      const dateStr = `${slotDate.getUTCFullYear()}-${String(slotDate.getUTCMonth() + 1).padStart(2, '0')}-${String(slotDate.getUTCDate()).padStart(2, '0')}`;
      
      // Clé unique incluant la date pour permettre plusieurs dates pour la même combinaison
      const key = `${slot.boatId}-${slot.experienceId}-${dateStr}`;
      if (combinations.has(key)) continue; // Déjà ajouté
      
      const boat = boats.find((b: any) => b.id === slot.boatId);
      const experience = experiences.find((e: any) => e.id === slot.experienceId);
      
      if (!boat || !experience) continue;
      
      const price = priceMap.get(`${slot.boatId}-${slot.experienceId}`) || null;
      
      combinations.set(key, {
        boatId: boat.id,
        boatName: boat.name,
        boatSlug: boat.slug,
        boatImageUrl: boat.imageUrl,
        boatCapacity: boat.capacity,
        boatSpeedKn: boat.speedKn,
        experienceId: experience.id,
        experienceSlug: experience.slug,
        experienceTitle: locale === 'fr' ? experience.titleFr : experience.titleEn,
        experienceImageUrl: experience.imageUrl,
        experienceDesc: locale === 'fr' ? experience.descFr : experience.descEn,
        price,
        date: dateStr
      });
    }

    experienceBoats = Array.from(combinations.values());
    
    // Limiter à 3 expériences maximum pour ne pas surcharger la page
    experienceBoats = experienceBoats.slice(0, 3);
  } catch (e) {
    console.error('Error loading experience boats:', e);
    return null;
  }

  if (experienceBoats.length === 0) {
    return null; // Pas de combinaisons disponibles
  }

  return (
    <section className="w-full max-w-6xl mx-auto mt-12 sm:mt-16 px-2 sm:px-0">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-black/90">
          {locale === 'fr' ? 'Profitez de nos expériences' : 'Enjoy our experiences'}
        </h2>
        <p className="mt-2 sm:mt-3 text-lg sm:text-xl text-black/70">
          {locale === 'fr' 
            ? 'Découvrez nos prochaines disponibilités' 
            : 'Discover our upcoming availability'}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {experienceBoats.map((item, i) => {
          // Rediriger vers la page de sélection d'expérience avec la date pré-remplie
          const experienceUrl = `/experiences/${encodeURIComponent(item.experienceSlug)}?date=${item.date}&boat=${item.boatId}${locale === 'en' ? '&lang=en' : ''}`;
          
          // Formater la date pour l'affichage
          const itemDate = new Date(item.date + 'T00:00:00');
          const formattedDate = itemDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          
          // Afficher les deux images si disponibles (expérience en grand, bateau en petit)
          const experienceImageUrl = item.experienceImageUrl;
          const boatImageUrl = item.boatImageUrl;
          const hasBothImages = experienceImageUrl && boatImageUrl;
          
          return (
            <article key={i} className="group rounded-2xl bg-white shadow-lg border border-black/10 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <Link href={experienceUrl} className="block relative h-56 sm:h-64 md:h-72 bg-gradient-to-b from-black/10 to-black/5 overflow-hidden">
                {/* Image principale de l'expérience */}
                {experienceImageUrl ? (
                  <Image 
                    src={experienceImageUrl} 
                    alt={item.experienceTitle} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                ) : boatImageUrl ? (
                  <Image 
                    src={boatImageUrl} 
                    alt={item.boatName} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#e5e7eb,transparent)]" />
                )}
                
                {/* Image du bateau en overlay si les deux images sont disponibles */}
                {hasBothImages && boatImageUrl && (
                  <div className="absolute top-3 right-3 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white shadow-xl z-10">
                    <Image 
                      src={boatImageUrl} 
                      alt={item.boatName} 
                      fill 
                      className="object-cover" 
                    />
                  </div>
                )}
                
                {/* Overlay gradient pour améliorer la lisibilité */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Badge avec le nom du bateau en haut à gauche */}
                <div className="absolute top-3 left-3 z-10">
                  <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-black/80 uppercase tracking-wide">
                      {item.boatName}
                    </span>
                  </div>
                </div>
                
                {/* Date en bas de l'image */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
                    <p className="text-sm font-extrabold text-black/90">
                      {formattedDate}
                    </p>
                    {item.price && item.price > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-1">
                        À partir de {item.price.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="absolute inset-0 ring-0 ring-[color:var(--primary)]/0 group-hover:ring-4 transition" />
              </Link>
              
              <div className="p-4 sm:p-6 flex flex-col flex-1">
                {/* Description de l'expérience */}
                {item.experienceDesc && (
                  <p className="text-xs sm:text-sm text-black/70 mb-3 line-clamp-2">
                    {item.experienceDesc}
                  </p>
                )}
                
                {/* Texte principal */}
                <p className="text-base sm:text-lg font-extrabold tracking-tight text-black/90 mb-4">
                  {locale === 'fr' 
                    ? `Profitez d'un événement exclusif` 
                    : `Enjoy an exclusive event`}
                </p>
                
                {/* Bouton de réservation */}
                <Link 
                  href={experienceUrl}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow-md"
                >
                  {locale === 'fr' ? 'Réserver maintenant' : 'Book now'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
