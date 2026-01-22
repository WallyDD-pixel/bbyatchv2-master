import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Image from 'next/image';

export default async function AboutPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const sp = (await searchParams) || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  // Charger les settings pour récupérer des images ou textes personnalisés si nécessaire
  const settings = await prisma.settings.findFirst();

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-black/90 mb-4">
            {locale === 'fr' ? 'À propos de BB SERVICES CHARTER' : 'About BB SERVICES CHARTER'}
          </h1>
          <p className="text-lg md:text-xl text-black/70 max-w-3xl mx-auto">
            {locale === 'fr' 
              ? 'Votre partenaire de confiance pour des expériences nautiques exceptionnelles en Méditerranée'
              : 'Your trusted partner for exceptional nautical experiences in the Mediterranean'}
          </p>
        </div>

        {/* Histoire et Mission */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-black/90 mb-6">
                {locale === 'fr' ? 'Notre Histoire' : 'Our Story'}
              </h2>
              <div className="space-y-4 text-black/80 leading-relaxed whitespace-pre-line">
                {(settings as any)?.[locale === 'fr' ? 'aboutHistoryFr' : 'aboutHistoryEn'] || (
                  locale === 'fr' 
                    ? 'BB YACHTS est notre marque principale dédiée à la vente de yachts de qualité. Forts de cette expertise, nous avons créé BB CHARTER pour mettre en avant notre flotte de bateaux, et BB SERVICES CHARTER comme extension naturelle de BB YACHTS.\n\nBB SERVICES CHARTER permet de mettre en location notre flotte de bateaux, offrant ainsi une solution complète alliant vente et location de yachts sur la Côte d\'Azur et la Riviera italienne.'
                    : 'BB YACHTS is our main brand dedicated to quality yacht sales. Building on this expertise, we created BB CHARTER to showcase our boat fleet, and BB SERVICES CHARTER as a natural extension of BB YACHTS.\n\nBB SERVICES CHARTER allows us to rent out our boat fleet, offering a complete solution combining yacht sales and rentals on the French Riviera and Italian Riviera.'
                )}
              </div>
            </div>
            <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden border border-black/10 shadow-lg bg-gray-100">
              {(settings as any)?.aboutHistoryImageUrl ? (
                <img 
                  src={(settings as any).aboutHistoryImageUrl} 
                  alt={locale === 'fr' ? 'Notre Histoire' : 'Our Story'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 to-blue-100/10 flex items-center justify-center">
                  <span className="text-6xl opacity-40">⛵</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-black/10 bg-gradient-to-br from-[color:var(--primary)]/10 to-white p-8 md:p-10 shadow-sm">
            <h3 className="text-xl md:text-2xl font-bold text-black/90 mb-4">
              {locale === 'fr' ? 'Notre Mission' : 'Our Mission'}
            </h3>
            <p className="text-black/80 leading-relaxed whitespace-pre-line">
              {(settings as any)?.[locale === 'fr' ? 'aboutMissionFr' : 'aboutMissionEn'] || (
                locale === 'fr' 
                  ? 'Notre mission est de rendre accessible l\'expérience nautique de luxe en proposant des yachts de qualité supérieure, un service personnalisé et une expertise locale inégalée. Que vous souhaitiez acheter un yacht, louer notre flotte ou vivre une expérience unique en mer, nous sommes là pour transformer vos rêves en réalité.'
                  : 'Our mission is to make luxury nautical experiences accessible by offering superior quality yachts, personalized service, and unmatched local expertise. Whether you want to buy a yacht, rent our fleet, or experience a unique sea adventure, we are here to turn your dreams into reality.'
              )}
            </p>
          </div>
        </section>

        {/* Nos Valeurs */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-black/90 mb-8 text-center">
            {locale === 'fr' ? 'Nos Valeurs' : 'Our Values'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🛡️',
                title: locale === 'fr' ? 'Sécurité' : 'Safety',
                desc: (settings as any)?.[locale === 'fr' ? 'aboutValuesSafetyFr' : 'aboutValuesSafetyEn'] || (locale === 'fr' 
                  ? 'La sécurité de nos clients et de nos équipages est notre priorité absolue. Tous nos bateaux sont régulièrement inspectés et conformes aux normes les plus strictes.'
                  : 'The safety of our clients and crews is our absolute priority. All our boats are regularly inspected and comply with the strictest standards.')
              },
              {
                icon: '✨',
                title: locale === 'fr' ? 'Confort' : 'Comfort',
                desc: (settings as any)?.[locale === 'fr' ? 'aboutValuesComfortFr' : 'aboutValuesComfortEn'] || (locale === 'fr' 
                  ? 'Nous sélectionnons uniquement des yachts offrant un confort optimal, avec des équipements modernes et des espaces aménagés pour votre bien-être.'
                  : 'We only select yachts offering optimal comfort, with modern equipment and spaces designed for your well-being.')
              },
              {
                icon: '🌊',
                title: locale === 'fr' ? 'Authenticité' : 'Authenticity',
                desc: (settings as any)?.[locale === 'fr' ? 'aboutValuesAuthFr' : 'aboutValuesAuthEn'] || (locale === 'fr' 
                  ? 'Nous privilégions des expériences authentiques qui vous connectent véritablement à la Méditerranée, sa culture et ses paysages exceptionnels.'
                  : 'We favor authentic experiences that truly connect you to the Mediterranean, its culture and exceptional landscapes.')
              },
              {
                icon: '😊',
                title: locale === 'fr' ? 'Plaisir' : 'Pleasure',
                desc: (settings as any)?.[locale === 'fr' ? 'aboutValuesPleasureFr' : 'aboutValuesPleasureEn'] || (locale === 'fr' 
                  ? 'Chaque sortie en mer doit être un moment de plaisir et de détente. Notre équipe s\'engage à créer des souvenirs inoubliables.'
                  : 'Every sea outing should be a moment of pleasure and relaxation. Our team is committed to creating unforgettable memories.')
              }
            ].map((value, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-lg font-bold text-black/90 mb-2">{value.title}</h3>
                <p className="text-sm text-black/70 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Notre Équipe et Expertise */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden border border-black/10 shadow-lg order-2 md:order-1 bg-gray-100">
              {(settings as any)?.aboutTeamImageUrl ? (
                <img 
                  src={(settings as any).aboutTeamImageUrl} 
                  alt={locale === 'fr' ? 'Notre Équipe' : 'Our Team'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 to-blue-100/10 flex items-center justify-center">
                  <span className="text-6xl opacity-40">👥</span>
                </div>
              )}
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-black/90 mb-6">
                {locale === 'fr' ? 'Notre Équipe et Expertise Locale' : 'Our Team and Local Expertise'}
              </h2>
              <div className="space-y-4 text-black/80 leading-relaxed whitespace-pre-line">
                {(settings as any)?.[locale === 'fr' ? 'aboutTeamFr' : 'aboutTeamEn'] || (
                  locale === 'fr' 
                    ? 'Notre équipe est composée de passionnés de la mer, de professionnels expérimentés et d\'experts locaux qui connaissent parfaitement la Côte d\'Azur et la Riviera italienne.\n\nChaque membre de notre équipe partage une passion commune pour le nautisme et s\'engage à vous offrir un service d\'exception. Nous connaissons les meilleurs spots, les conditions météorologiques locales, et nous sommes toujours disponibles pour vous conseiller et vous accompagner dans vos projets.\n\nNotre expertise locale nous permet de vous proposer des itinéraires sur mesure, des recommandations personnalisées et une connaissance approfondie des ports et des infrastructures nautiques de la région.'
                    : 'Our team is made up of sea enthusiasts, experienced professionals, and local experts who know the French Riviera and Italian Riviera perfectly.\n\nEach member of our team shares a common passion for sailing and is committed to providing you with exceptional service. We know the best spots, local weather conditions, and we are always available to advise and support you in your projects.\n\nOur local expertise allows us to offer you customized itineraries, personalized recommendations, and in-depth knowledge of the region\'s ports and nautical infrastructure.'
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Galerie / Photos */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-black/90 mb-8 text-center">
            {locale === 'fr' ? 'Notre Philosophie en Images' : 'Our Philosophy in Images'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              let imageUrls: string[] = [];
              if ((settings as any)?.aboutImageUrls) {
                try {
                  imageUrls = JSON.parse((settings as any).aboutImageUrls);
                } catch {}
              }
              if (imageUrls.length === 0) {
                return [1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="relative h-48 rounded-xl overflow-hidden border border-black/10 bg-gradient-to-br from-[color:var(--primary)]/10 to-white shadow-sm">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl opacity-30">📸</span>
                    </div>
                  </div>
                ));
              }
              return imageUrls.map((url, i) => (
                <div key={i} className="relative h-48 rounded-xl overflow-hidden border border-black/10 shadow-sm">
                  <img src={url} alt={`Galerie ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ));
            })()}
          </div>
          <p className="text-center text-sm text-black/50 mt-4">
            {locale === 'fr' 
              ? 'Photos illustrant nos coulisses, notre équipe et la philosophie de la marque'
              : 'Photos illustrating our behind-the-scenes, our team and the brand philosophy'}
          </p>
        </section>

        {/* CTA */}
        <section className="text-center rounded-2xl border border-black/10 bg-gradient-to-br from-[color:var(--primary)]/10 to-white p-8 md:p-12 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold text-black/90 mb-4">
            {locale === 'fr' ? 'Prêt à vivre l\'expérience ?' : 'Ready to experience it?'}
          </h2>
          <p className="text-black/70 mb-6 max-w-2xl mx-auto">
            {locale === 'fr' 
              ? 'Découvrez notre flotte de bateaux et réservez votre prochaine sortie en mer sur la Côte d\'Azur.'
              : 'Discover our boat fleet and book your next sea outing on the French Riviera.'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={`/${locale === 'en' ? '?lang=en' : ''}#fleet`}
              className="px-6 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center"
              style={{ backgroundColor: '#2563eb' }}
            >
              {locale === 'fr' ? 'Voir notre flotte' : 'View our fleet'}
            </a>
            <a
              href={`/contact${locale === 'en' ? '?lang=en' : ''}`}
              className="px-6 h-12 rounded-full border border-black/15 bg-white text-black/70 font-semibold hover:bg-black/5 transition inline-flex items-center justify-center"
            >
              {locale === 'fr' ? 'Nous contacter' : 'Contact us'}
            </a>
          </div>
        </section>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

