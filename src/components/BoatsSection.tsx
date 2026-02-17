import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";
import { getServerSession } from "@/lib/auth";

// Type minimal local pour éviter les any implicites tant que Prisma Client n'est pas rechargé par TS
type Boat = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
  capacity: number;
  enginePower?: number | null;
  year?: number | null;
  lengthM?: number | null;
  pricePerDay: number;
  priceAm?: number | null;
  pricePm?: number | null;
  priceSunset?: number | null;
  priceAgencyPerDay?: number | null;
  priceAgencyAm?: number | null;
  priceAgencyPm?: number | null;
  priceAgencySunset?: number | null;
  skipperRequired?: boolean | null;
  imageUrl?: string | null;
};

export default async function BoatsSection({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  // Vérifier si l'utilisateur est une agence
  const session = await getServerSession() as any;
  let isAgency = false;
  if (session?.user?.email) {
    try {
      const user = await prisma.user.findUnique({ 
        where: { email: session.user.email }, 
        select: { role: true } 
      });
      isAgency = user?.role === 'agency';
    } catch {}
  }

  // Fonction pour calculer le prix agence (-20% sur la coque nue)
  const calculateAgencyPrice = (publicPrice: number): number => {
    return Math.round(publicPrice * 0.8);
  };

  // Récup args recherche depuis URL (côté serveur)
  // On ne restreint pas par ville volontairement
  // NOTE: Les cookies ou searchParams ne sont pas accessibles côté serveur via next/navigation ici.
  // On lit le paramètre 'pax' via les headers personnalisés (x-url) si disponible.
  let paxFilter: number | null = null;
  try {
    const url = (global as any).headers?.().get('x-url') || '';
    if (url) {
      const u = new URL(url, 'http://localhost');
      const pax = u.searchParams.get('pax');
      if (pax) paxFilter = Number(pax) || null;
    }
  } catch {}

  const where: any = { available: true };
  if (paxFilter) where.capacity = { gte: paxFilter };
  const boats: Boat[] = await (prisma as any).boat.findMany({ 
    where, 
    orderBy: { id: "asc" }, 
    select: { 
      id:true, slug:true, name:true, city:true, capacity:true, enginePower:true, year:true, lengthM:true, 
      pricePerDay:true, priceAm:true, pricePm:true, priceSunset:true,
      priceAgencyPerDay:true, priceAgencyAm:true, priceAgencyPm:true, priceAgencySunset:true,
      skipperRequired:true,
      imageUrl:true 
    } 
  });

  return (
    <section id="fleet" className="w-full max-w-6xl mx-auto mt-16">
      <h2 className="text-center text-3xl sm:text-4xl font-display font-extrabold text-black mb-8">{t.boats_available_title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {boats.map(b => (
          <a href={`/boats/${b.slug}`} key={b.id} className="block rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow border border-black/10 overflow-hidden group">
            <div className="relative h-44 sm:h-52">
              {b.imageUrl && (
                <Image 
                  src={b.imageUrl} 
                  alt={b.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform" 
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}
              <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                {(() => {
                  // Calculer le prix à partir de (le prix le plus bas disponible)
                  let priceFrom: number;
                  if (isAgency) {
                    // Prix agence : utiliser prix agence défini ou calculer (-20%)
                    const availableAgencyPrices: number[] = [];
                    
                    // Prix agence AM
                    if (b.priceAgencyAm !== null && b.priceAgencyAm !== undefined && !isNaN(b.priceAgencyAm) && b.priceAgencyAm > 0) {
                      availableAgencyPrices.push(b.priceAgencyAm);
                    } else if (b.priceAm !== null && b.priceAm !== undefined && !isNaN(b.priceAm) && b.priceAm > 0) {
                      availableAgencyPrices.push(calculateAgencyPrice(b.priceAm));
                    }
                    
                    // Prix agence PM
                    if (b.priceAgencyPm !== null && b.priceAgencyPm !== undefined && !isNaN(b.priceAgencyPm) && b.priceAgencyPm > 0) {
                      availableAgencyPrices.push(b.priceAgencyPm);
                    } else if (b.pricePm !== null && b.pricePm !== undefined && !isNaN(b.pricePm) && b.pricePm > 0) {
                      availableAgencyPrices.push(calculateAgencyPrice(b.pricePm));
                    }
                    
                    // Prix agence Sunset
                    if (b.priceAgencySunset !== null && b.priceAgencySunset !== undefined && !isNaN(b.priceAgencySunset) && b.priceAgencySunset > 0) {
                      availableAgencyPrices.push(b.priceAgencySunset);
                    } else if (b.priceSunset !== null && b.priceSunset !== undefined && !isNaN(b.priceSunset) && b.priceSunset > 0) {
                      availableAgencyPrices.push(calculateAgencyPrice(b.priceSunset));
                    }
                    
                    // Si aucun prix partiel n'est défini, utiliser la moitié du prix agence par jour comme fallback
                    if (availableAgencyPrices.length === 0) {
                      const agencyHalfDay = calculateAgencyPrice(Math.round(b.pricePerDay / 2));
                      priceFrom = agencyHalfDay > 0 ? agencyHalfDay : calculateAgencyPrice(b.pricePerDay);
                    } else {
                      // Prendre le prix le plus bas parmi les prix définis
                      priceFrom = Math.min(...availableAgencyPrices);
                    }
                  } else {
                    // Prix public : prendre le prix le plus bas parmi les prix explicitement définis (AM, PM, Sunset)
                    // Construire la liste de tous les prix partiels disponibles
                    const availablePrices: number[] = [];
                    
                    // Ajouter uniquement les prix partiels explicitement définis
                    if (b.priceAm !== null && b.priceAm !== undefined && !isNaN(b.priceAm) && b.priceAm > 0) {
                      availablePrices.push(b.priceAm);
                    }
                    if (b.pricePm !== null && b.pricePm !== undefined && !isNaN(b.pricePm) && b.pricePm > 0) {
                      availablePrices.push(b.pricePm);
                    }
                    if (b.priceSunset !== null && b.priceSunset !== undefined && !isNaN(b.priceSunset) && b.priceSunset > 0) {
                      availablePrices.push(b.priceSunset);
                    }
                    
                    // Si aucun prix partiel n'est défini, utiliser la moitié du prix par jour comme fallback
                    if (availablePrices.length === 0) {
                      const halfDay = Math.round(b.pricePerDay / 2);
                      priceFrom = halfDay > 0 ? halfDay : b.pricePerDay;
                    } else {
                      // Prendre le prix le plus bas parmi les prix définis
                      priceFrom = Math.min(...availablePrices);
                    }
                  }
                  return (
                    <div className="px-4 py-1 rounded-full font-semibold bg-white/90 backdrop-blur border border-black/10 shadow text-[var(--primary)] text-sm">
                      {locale === 'fr' ? (isAgency ? 'Prix agence' : 'À partir de') : (isAgency ? 'Agency price' : 'From')} {priceFrom} €
                    </div>
                  );
                })()}
              </div>
              <div className="absolute left-3 bottom-3 text-white font-extrabold text-lg drop-shadow">
                {b.name}
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 rounded-xl bg-[#f5f7fa] border border-black/10 p-4 text-center text-xs font-medium">
                <div>
                  <div className="text-2xl mb-1">🧍‍♂️</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{locale === 'fr' ? 'Places max' : 'Max places'}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.capacity}</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">📅</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{locale === 'fr' ? 'Année' : 'Year'}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.year ?? '—'}</div>
                </div>
                {b.lengthM && (
                  <div>
                    <div className="text-2xl mb-1">📏</div>
                    <div className="uppercase tracking-wide text-[10px] text-black/60">{locale === 'fr' ? 'Taille' : 'Length'}</div>
                    <div className="text-sm font-semibold text-black mt-0.5">{b.lengthM} m</div>
                  </div>
                )}
              </div>
              {/* Informations obligatoires */}
              <div className="mt-4 pt-4 border-t border-black/10 space-y-2 text-[10px] text-black/60">
                {!isAgency && b.skipperRequired && (
                  <div className="flex items-center justify-center gap-1">
                    <span>⛵</span>
                    <span>{locale === 'fr' ? 'Skipper obligatoire' : 'Skipper required'}</span>
                  </div>
                )}
                {isAgency && b.skipperRequired && (
                  <div className="flex items-center justify-center gap-1">
                    <span>⛵</span>
                    <span>{locale === 'fr' ? 'Skipper disponible si besoin' : 'Skipper available if needed'}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-1">
                  <span>⛽</span>
                  <span>{locale === 'fr' ? 'Carburant non inclus' : 'Fuel not included'}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-black/10 text-center text-sm font-medium text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                {t.boats_details_cta} →
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
