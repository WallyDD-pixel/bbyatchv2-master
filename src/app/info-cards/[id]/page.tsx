import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function InfoCardDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15: params and searchParams are Promises
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const cardId = parseInt(id, 10);
  if (isNaN(cardId)) notFound();

  const card = await (prisma as any).infoCard.findUnique({ where: { id: cardId } });
  if (!card) notFound();

  const hasContent = card.contentFr || card.contentEn;
  const content = locale === 'fr' ? card.contentFr : card.contentEn;
  const ctaLabel = locale === 'fr' ? (card.ctaLabelFr || 'En savoir plus') : (card.ctaLabelEn || 'Learn more');

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 px-4 sm:px-6 md:px-10 py-8 md:py-12 max-w-4xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3 text-[11px] mb-6">
          <Link href="/" className="group inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-black/10 shadow-sm hover:border-[color:var(--primary)]/40 hover:shadow transition text-black/70 hover:text-black">
            <span className="text-lg group-hover:-translate-x-0.5 transition">←</span>
            <span className="font-semibold tracking-wide">{locale==='fr'? 'Retour à l\'accueil':'Back to home'}</span>
          </Link>
          <span className="text-black/40">/</span>
          <span className="font-semibold text-black/70">{locale==='fr'? 'Les + BB services':'BB Services Plus'}</span>
          <span className="text-black/40">/</span>
          <span className="font-semibold text-black/70">{locale === 'fr' ? card.titleFr : card.titleEn}</span>
        </div>

        <article className="rounded-3xl border border-black/10 bg-white shadow-lg overflow-hidden">
          {/* Image */}
          <div className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-b from-black/10 to-black/5">
            <Image 
              src={card.imageUrl} 
              alt={locale === 'fr' ? card.titleFr : card.titleEn} 
              fill 
              className="object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
                {locale === 'fr' ? card.titleFr : card.titleEn}
              </h1>
              {(card.descFr || card.descEn) && (
                <p className="text-base sm:text-lg text-white/90">
                  {locale === 'fr' ? card.descFr : card.descEn}
                </p>
              )}
            </div>
          </div>

          {/* Contenu */}
          {hasContent && (
            <div className="p-6 sm:p-8">
              <div className="prose prose-sm sm:prose-base max-w-none text-black/70 leading-relaxed whitespace-pre-line">
                {content}
              </div>
              
              {/* CTA */}
              {card.ctaUrl && (
                <div className="mt-8 pt-6 border-t border-black/10">
                  <a
                    href={card.ctaUrl}
                    target={card.ctaUrl.startsWith('http') ? '_blank' : '_self'}
                    rel={card.ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
                  >
                    <span>{ctaLabel}</span>
                    <span>→</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Si pas de contenu détaillé, afficher juste la description */}
          {!hasContent && (card.descFr || card.descEn) && (
            <div className="p-6 sm:p-8">
              <p className="text-base leading-relaxed text-black/70">
                {locale === 'fr' ? card.descFr : card.descEn}
              </p>
            </div>
          )}
        </article>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}





