import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SupportPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
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
                    ? 'Contactez-nous via WhatsApp pour une assistance immédiate.'
                    : 'Contact us via WhatsApp for immediate assistance.'}
                </p>
                <a 
                  href='https://wa.me/33609176282'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors duration-200'
                  aria-label='WhatsApp'
                  title={locale === 'fr' ? 'Contacter via WhatsApp' : 'Contact via WhatsApp'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
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

