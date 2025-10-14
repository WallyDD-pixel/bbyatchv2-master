import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";

// Type minimal local pour éviter les any implicites tant que Prisma Client n'est pas rechargé par TS
type Boat = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
  capacity: number;
  speedKn: number;
  fuel?: number | null;
  enginePower?: number | null;
  pricePerDay: number;
  priceAm?: number | null;
  pricePm?: number | null;
  imageUrl?: string | null;
};

export default async function BoatsSection({ locale, t }: { locale: Locale; t: Record<string, string> }) {
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
  const boats: Boat[] = await (prisma as any).boat.findMany({ where, orderBy: { id: "asc" }, select: { id:true, slug:true, name:true, city:true, capacity:true, speedKn:true, fuel:true, enginePower:true, pricePerDay:true, priceAm:true, pricePm:true, imageUrl:true } });

  return (
    <section id="fleet" className="w-full max-w-6xl mx-auto mt-16">
      <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-black mb-8">{t.boats_available_title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {boats.map(b => (
          <a href={`/boats/${b.slug}`} key={b.id} className="block rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow border border-black/10 overflow-hidden group">
            <div className="relative h-44 sm:h-52">
              {b.imageUrl && <Image src={b.imageUrl} alt={b.name} fill className="object-cover group-hover:scale-105 transition-transform" />}
              <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                <div className="px-4 py-1 rounded-full font-semibold bg-white/90 backdrop-blur border border-black/10 shadow text-[var(--primary)] text-sm">
                  {b.pricePerDay} €
                </div>
                {(b.priceAm != null || b.pricePm != null) && (
                  <div className="flex gap-1 text-[10px] font-semibold">
                    {b.priceAm != null && (
                      <span className="px-2 py-0.5 rounded-full bg-white/90 border border-black/10 shadow text-[color:var(--primary)]">
                        {t.price_morning}: {b.priceAm}€
                      </span>
                    )}
                    {b.pricePm != null && (
                      <span className="px-2 py-0.5 rounded-full bg-white/90 border border-black/10 shadow text-[color:var(--primary)]">
                        {t.price_afternoon}: {b.pricePm}€
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="absolute left-3 bottom-3 text-white font-extrabold text-lg drop-shadow">
                {b.name}
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#f5f7fa] border border-black/10 p-4 text-center text-xs font-medium">
                <div>
                  <div className="text-2xl mb-1">🧍‍♂️</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{t.boats_stats_places}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.capacity}</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">🏁</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{t.boats_stats_speed}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.speedKn} kn</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">⛽</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{t.boats_stats_fuel}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.fuel ?? '-'}</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">⚙️</div>
                  <div className="uppercase tracking-wide text-[10px] text-black/60">{t.boats_stats_engine}</div>
                  <div className="text-sm font-semibold text-black mt-0.5">{b.enginePower ?? '-'}</div>
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
