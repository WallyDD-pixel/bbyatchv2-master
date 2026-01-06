import Image from "next/image";
import HeroSlider from "@/components/HeroSlider";
import SearchBarClient from "@/components/SearchBarClient";
import { messages, type Locale } from "@/i18n/messages";
import ExperiencesSection from "@/components/ExperiencesSection";
import HeaderBar from "@/components/HeaderBar";
import BoatsSection from "@/components/BoatsSection";
import GallerySection from "@/components/GallerySection";
import Footer from "@/components/Footer";
import AboutUsSection from "@/components/AboutUsSection";
import WhyChooseSection from "@/components/WhyChooseSection";
import { prisma } from '@/lib/prisma';
import { getLabelsWithSettings } from '@/lib/settings';

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams || {};
  const locale: Locale = sp.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  // Charger les settings dynamiques
  const settings = await prisma.settings.findFirst();

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />

      <main className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 md:px-10 pb-16">
        <section className="w-full max-w-6xl">
              <div className="relative">
               {(() => {
                 const imageUrl = (settings as any)?.mainSliderImageUrl ?? undefined;
                 let images: string[] | undefined = undefined;
                 try {
                   const raw = (settings as any)?.mainSliderImageUrls;
                   if (raw) {
                     const parsed = JSON.parse(raw);
                     if (Array.isArray(parsed) && parsed.length) {
                       const allowed = new Set(['jpg','jpeg','png','webp','gif','avif']);
                       images = parsed.filter((u: string) => allowed.has((u.split('.').pop()?.toLowerCase() || '')));
                     }
                   }
                 } catch {}
                 return (
                   <HeroSlider
                     title={settings?.mainSliderTitle ?? undefined}
                     subtitle={settings?.mainSliderSubtitle ?? undefined}
                     imageUrl={imageUrl}
                     images={images}
                   />
                 );
               })()}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 -bottom-10 w-[96%]">
              <SearchBarClient labels={t} className="shadow-xl" />
            </div>
          </div>
          <div className="max-w-5xl mx-auto">
            {/* Bloc sous le slider : texte dynamique et searchbar mobile */}
            <div className="mt-6 md:mt-20 text-left">
              {/* Texte sous le slider principal */}
              {settings?.mainSliderText && (
                <p className="mt-4 text-lg text-black/70">{settings.mainSliderText}</p>
              )}
            </div>
            <div className="mt-4 sm:mt-6 md:hidden">
              <SearchBarClient labels={t} />
            </div>
          </div>
        </section>

  {/* Section "Qui sommes-nous" dynamique supprimée, affichage AboutUsSection uniquement */}

        {/* Sections réordonnées: Bateaux d'abord, puis expériences */}
        <BoatsSection locale={locale} t={t} />
        <ExperiencesSection locale={locale} t={t} />
  {/* Section "Pourquoi choisir BB Service" retirée */}
  <AboutUsSection settings={settings} locale={locale} />
        <GallerySection locale={locale} t={t} />
      </main>

      <Footer locale={locale} t={t} />
    </div>
  );
}
