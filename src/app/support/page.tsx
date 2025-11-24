import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupportPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-14'>
        <div className='mb-12'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight mb-4'>
            {locale === 'fr' ? 'Support' : 'Support'}
          </h1>
          <p className='text-sm sm:text-base text-black/60 max-w-2xl'>
            {locale === 'fr' 
              ? "Besoin d'aide ? Notre équipe est là pour vous accompagner dans toutes vos démarches de réservation et répondre à vos questions."
              : "Need help? Our team is here to assist you with all your booking procedures and answer your questions."}
          </p>
        </div>

        {/* Options de support */}
        <div className='grid md:grid-cols-2 gap-6 mb-12'>
          <Link 
            href={`/faq${locale === 'en' ? '?lang=en' : ''}`}
            className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition group'
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0'>
                <span className='text-2xl'>❓</span>
              </div>
              <div>
                <h2 className='text-lg font-semibold mb-2 group-hover:text-[var(--primary)] transition'>
                  {locale === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
                </h2>
                <p className='text-sm text-black/60 leading-relaxed'>
                  {locale === 'fr' 
                    ? 'Consultez les réponses aux questions les plus courantes sur nos services.'
                    : 'Check out answers to the most common questions about our services.'}
                </p>
              </div>
            </div>
          </Link>

          <Link 
            href={`/contact${locale === 'en' ? '?lang=en' : ''}`}
            className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition group'
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0'>
                <span className='text-2xl'>📧</span>
              </div>
              <div>
                <h2 className='text-lg font-semibold mb-2 group-hover:text-[var(--primary)] transition'>
                  {locale === 'fr' ? 'Nous contacter' : 'Contact us'}
                </h2>
                <p className='text-sm text-black/60 leading-relaxed'>
                  {locale === 'fr' 
                    ? 'Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.'
                    : 'Send us a message and we will get back to you as soon as possible.'}
                </p>
              </div>
            </div>
          </Link>

          <Link 
            href={`/how-it-works${locale === 'en' ? '?lang=en' : ''}`}
            className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm hover:shadow-md transition group'
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0'>
                <span className='text-2xl'>📖</span>
              </div>
              <div>
                <h2 className='text-lg font-semibold mb-2 group-hover:text-[var(--primary)] transition'>
                  {locale === 'fr' ? 'Comment ça marche' : 'How it works'}
                </h2>
                <p className='text-sm text-black/60 leading-relaxed'>
                  {locale === 'fr' 
                    ? 'Découvrez comment réserver facilement votre bateau en quelques étapes simples.'
                    : 'Discover how to easily book your boat in just a few simple steps.'}
                </p>
              </div>
            </div>
          </Link>

          <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm'>
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0'>
                <span className='text-2xl'>☎️</span>
              </div>
              <div>
                <h2 className='text-lg font-semibold mb-2'>
                  {locale === 'fr' ? 'Téléphone' : 'Phone'}
                </h2>
                <p className='text-sm text-black/60 mb-3 leading-relaxed'>
                  {locale === 'fr' 
                    ? 'Appelez-nous directement pour une assistance immédiate.'
                    : 'Call us directly for immediate assistance.'}
                </p>
                <a 
                  href='tel:+33609176282'
                  className='inline-flex items-center gap-2 text-[var(--primary)] font-medium hover:underline'
                >
                  <span>06 09 17 62 82</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Informations de contact */}
        <div className='bg-white rounded-2xl border border-black/10 p-8 shadow-sm'>
          <h2 className='text-2xl font-semibold mb-6'>
            {locale === 'fr' ? 'Informations de contact' : 'Contact information'}
          </h2>
          <div className='grid md:grid-cols-2 gap-6'>
            <div>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <span>📍</span>
                {locale === 'fr' ? 'Adresse' : 'Address'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                Port Camille Rayon<br />
                Avenue des frères Roustan<br />
                06220 Vallauris, France
              </p>
            </div>

            <div>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <span>✉️</span>
                {locale === 'fr' ? 'Email' : 'Email'}
              </h3>
              <a 
                href='mailto:charter@bb-yachts.com'
                className='text-sm text-[var(--primary)] hover:underline'
              >
                charter@bb-yachts.com
              </a>
            </div>

            <div>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <span>🕐</span>
                {locale === 'fr' ? 'Horaires' : 'Opening hours'}
              </h3>
              <div className='text-sm text-black/60 space-y-1'>
                <p>{locale === 'fr' ? 'Lundi - Vendredi' : 'Monday - Friday'}: 9h - 18h</p>
                <p>{locale === 'fr' ? 'Samedi' : 'Saturday'}: 9h - 17h</p>
                <p>{locale === 'fr' ? 'Dimanche' : 'Sunday'}: {locale === 'fr' ? 'Sur rendez-vous' : 'By appointment'}</p>
              </div>
            </div>

            <div>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <span>⚡</span>
                {locale === 'fr' ? 'Réponse rapide' : 'Quick response'}
              </h3>
              <p className='text-sm text-black/60 leading-relaxed'>
                {locale === 'fr' 
                  ? 'Nous nous efforçons de répondre à toutes les demandes dans les 24 heures.'
                  : 'We strive to respond to all requests within 24 hours.'}
              </p>
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

