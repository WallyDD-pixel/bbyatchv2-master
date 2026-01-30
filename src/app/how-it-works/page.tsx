import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HowItWorksPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-14'>
        <div className='mb-12'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight mb-4'>
            {locale === 'fr' ? 'Comment ça marche' : 'How it works'}
          </h1>
          <p className='text-sm sm:text-base text-black/60 max-w-2xl'>
            {locale === 'fr' 
              ? "Découvrez comment réserver facilement votre bateau ou votre expérience en mer en quelques étapes simples."
              : "Discover how to easily book your boat or sea experience in just a few simple steps."}
          </p>
        </div>

        {/* Étapes principales */}
        <div className='grid md:grid-cols-3 gap-6 mb-16'>
          <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition'>
            <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4'>
              <span className='text-2xl font-bold text-[var(--primary)]'>1</span>
            </div>
            <h2 className='text-xl font-semibold mb-2'>{t.how_1_title}</h2>
            <p className='text-sm text-black/60 leading-relaxed'>{t.how_1_desc}</p>
          </div>

          <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition'>
            <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4'>
              <span className='text-2xl font-bold text-[var(--primary)]'>2</span>
            </div>
            <h2 className='text-xl font-semibold mb-2'>{t.how_2_title}</h2>
            <p className='text-sm text-black/60 leading-relaxed'>{t.how_2_desc}</p>
          </div>

          <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition'>
            <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4'>
              <span className='text-2xl font-bold text-[var(--primary)]'>3</span>
            </div>
            <h2 className='text-xl font-semibold mb-2'>{t.how_3_title}</h2>
            <p className='text-sm text-black/60 leading-relaxed'>{t.how_3_desc}</p>
          </div>
        </div>

        {/* Section informations supplémentaires */}
        <div className='bg-white rounded-2xl border border-black/10 p-8 shadow-sm'>
          <h2 className='text-2xl font-semibold mb-6'>
            {locale === 'fr' ? 'Informations importantes' : 'Important information'}
          </h2>
          <div className='space-y-6'>
            <div>
              <h3 className='font-semibold mb-2 flex items-center gap-2'>
                <span>📋</span>
                {locale === 'fr' ? 'Réservation' : 'Booking'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                {locale === 'fr' 
                  ? "Vous pouvez réserver jusqu'à la veille de votre sortie. Les paiements sont sécurisés et vous recevrez une confirmation immédiate par email."
                  : "You can book up until the day before your trip. Payments are secure and you'll receive immediate email confirmation."}
              </p>
            </div>

            <div>
              <h3 className='font-semibold mb-2 flex items-center gap-2'>
                <span>💳</span>
                {locale === 'fr' ? 'Paiement' : 'Payment'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                {locale === 'fr' 
                  ? "Le paiement se fait en ligne de manière sécurisée. Nous acceptons les cartes bancaires principales. Un dépôt de garantie peut être requis selon le type de location."
                  : "Payment is made securely online. We accept all major credit cards. A security deposit may be required depending on the rental type."}
              </p>
            </div>

            <div>
              <h3 className='font-semibold mb-2 flex items-center gap-2'>
                <span>⚓</span>
                {locale === 'fr' ? 'Rendez-vous' : 'Meeting point'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                {locale === 'fr' 
                  ? "Le point de rendez-vous vous sera communiqué après la réservation. Il se situe généralement au port indiqué lors de votre recherche."
                  : "The meeting point will be communicated after booking. It's usually at the port indicated during your search."}
              </p>
            </div>

            <div>
              <h3 className='font-semibold mb-2 flex items-center gap-2'>
                <span>❓</span>
                {locale === 'fr' ? 'Questions ?' : 'Questions?'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                {locale === 'fr' 
                  ? "N'hésitez pas à nous contacter si vous avez des questions. Notre équipe est disponible pour vous aider à trouver la solution parfaite pour votre sortie en mer."
                  : "Don't hesitate to contact us if you have any questions. Our team is available to help you find the perfect solution for your sea trip."}
              </p>
              <Link 
                href={`/${locale === 'en' ? '?lang=en' : ''}#contact`}
                className='inline-block mt-3 px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:brightness-110 transition'
              >
                {locale === 'fr' ? 'Nous contacter' : 'Contact us'}
              </Link>
            </div>
          </div>
        </div>

        {/* CTA vers la recherche */}
        <div className='mt-12 text-center'>
          <Link 
            href={`/search${locale === 'en' ? '?lang=en' : ''}`}
            className='inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--primary)] text-white font-semibold hover:brightness-110 transition shadow-sm'
          >
            <span>{locale === 'fr' ? 'Commencer ma recherche' : 'Start my search'}</span>
            <span>→</span>
          </Link>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

