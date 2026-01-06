import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";

// Type local tant que les types Prisma ne sont pas rafraîchis
type InfoCard = {
  id?: number;
  imageUrl: string;
  titleFr: string;
  titleEn: string;
  descFr?: string | null;
  descEn?: string | null;
  sort?: number | null;
};

export default async function InfoCardsSection({ locale }: { locale: Locale }) {
  // Données par défaut affichées si DB absente ou vide
  const fallback: InfoCard[] = [
    {
      imageUrl: "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1600&auto=format&fit=crop&q=80",
      titleFr: "Réservation simple",
      titleEn: "Easy booking",
      descFr: "Choisissez votre ville, vos dates et réservez en 2 minutes.",
      descEn: "Pick city, dates and book in 2 minutes.",
      sort: 1,
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
      titleFr: "Skipper pro",
      titleEn: "Pro skipper",
      descFr: "Naviguez serein accompagné par des capitaines expérimentés.",
      descEn: "Sail safely with experienced captains.",
      sort: 2,
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=1600&auto=format&fit=crop&q=80",
      titleFr: "Moments d’exception",
      titleEn: "Exceptional moments",
      descFr: "Coucher de soleil, îles, baignade: créez vos souvenirs.",
      descEn: "Sunset, islands, swimming: create memories.",
      sort: 3,
    },
  ];

  let rows: InfoCard[] | null = null;
  try {
    // Essai via ORM (cast temporaire) puis fallback SQL si besoin
    rows = await (prisma as any).infoCard.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] });
  } catch {
    try {
      rows = await prisma.$queryRaw<InfoCard[]>`
        SELECT id, imageUrl, titleFr, titleEn, descFr, descEn, contentFr, contentEn, ctaUrl, ctaLabelFr, ctaLabelEn, sort
        FROM InfoCard
        ORDER BY COALESCE(sort, 0) ASC, id ASC
      `;
    } catch {
      rows = null;
    }
  }

  const data = rows && rows.length > 0 ? rows : fallback;

  return (
    <section className="w-full max-w-6xl mx-auto mt-12">
      <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-black/90 mb-6 text-center">
        Les + BB services
      </h2>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        {data.map((c, i) => {
          const hasContent = (c as any).contentFr || (c as any).contentEn;
          const CardWrapper = hasContent ? 'a' : 'article';
          const href = hasContent ? `/info-cards/${c.id}` : undefined;
          return (
            <CardWrapper 
              key={c.id ?? i} 
              href={href}
              className={`relative overflow-hidden rounded-2xl border border-black/10 bg-white h-40 sm:h-48 ${hasContent ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
            >
              <Image src={c.imageUrl} alt={locale === "fr" ? c.titleFr : c.titleEn} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-end text-left">
                <h3 className="font-montserrat font-bold text-lg text-white">{locale === "fr" ? c.titleFr : c.titleEn}</h3>
                {(c.descFr || c.descEn) && (
                  <p className="mt-1 text-sm text-white/85">{locale === "fr" ? c.descFr : c.descEn}</p>
                )}
                {hasContent && (
                  <span className="mt-2 text-xs text-white/90 font-medium inline-flex items-center gap-1">
                    {locale === 'fr' ? 'En savoir plus' : 'Learn more'} →
                  </span>
                )}
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </section>
  );
}
