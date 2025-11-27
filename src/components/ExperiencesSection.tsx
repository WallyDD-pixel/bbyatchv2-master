import Image from "next/image";
import { type Locale } from "@/i18n/messages";
import { prisma } from "@/lib/prisma";
import ExperienceLinkButton from "./ExperienceLinkButton";

export default async function ExperiencesSection({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  let items: { slug: string; title: string; desc: string; time?: string | null; imageUrl?: string | null }[] = [];
  let headline = t.exp_headline;
  let sectionTitle = t.exp_section_title;

  try {
    const [rows, settings] = await Promise.all([
      prisma.experience.findMany({ orderBy: { id: "asc" } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);

    items = rows.map(
      (r: any) => ({
        slug: r.slug,
        title: locale === "fr" ? r.titleFr : r.titleEn,
        desc: locale === "fr" ? r.descFr : r.descEn,
        time: locale === "fr" ? r.timeFr : r.timeEn,
        imageUrl: r.imageUrl,
      })
    );

    if (settings) {
      headline = locale === "fr" ? settings.experiencesHeadlineFr ?? headline : settings.experiencesHeadlineEn ?? headline;
      sectionTitle = locale === "fr" ? settings.experiencesTitleFr ?? sectionTitle : settings.experiencesTitleEn ?? sectionTitle;
    }
  } catch (e) {
    // fallback temporaire si DB non initialisée
    items = [
      {
        slug: "placeholder",
        title: "Expérience",
        desc: "Configurez la base de données pour charger les expériences.",
        time: undefined,
        imageUrl: null,
      },
    ];
  }

  return (
    <section id="experiences" className="w-full max-w-6xl mx-auto mt-12 sm:mt-16 px-2 sm:px-0">
      <div className="text-center">
        <h2 className="text-2xl sm:text-4xl font-nakilla font-extrabold text-black/90">{headline}</h2>
        <h3 className="mt-2 sm:mt-3 text-xl sm:text-2xl font-aviano font-bold text-black/80">{sectionTitle}</h3>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <article key={i} className="group rounded-2xl bg-white shadow-lg border border-black/10 overflow-hidden flex flex-col">
            <a href={`/experiences/${c.slug}`} className="block relative h-36 sm:h-44 md:h-48 bg-gradient-to-b from-black/10 to-black/5">
              {c.imageUrl ? (
                <Image src={c.imageUrl} alt={c.title} fill className="object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#e5e7eb,transparent)]" />
              )}
              <div className="absolute inset-0 ring-0 ring-[color:var(--primary)]/0 group-hover:ring-4 transition" />
            </a>
            <div className="p-4 sm:p-6 flex flex-col flex-1">
              <h4 className="text-base sm:text-lg font-extrabold tracking-tight uppercase text-black/90">{c.title}</h4>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-black/70 line-clamp-4">{c.desc}</p>
              {c.time && <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-black/60">{c.time}</p>}
              <div className="mt-4 sm:mt-5">
                <ExperienceLinkButton href={`/experiences/${c.slug}`} locale={locale} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
