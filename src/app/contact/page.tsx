import { Suspense } from 'react';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import ContactForm from './ContactForm';

export const dynamic = 'force-dynamic';

function ContactInfo({ locale }: { locale: Locale }) {
  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm'>
        <h2 className='text-xl font-semibold mb-4'>
          {locale === 'fr' ? 'Nos coordonnées' : 'Our contact details'}
        </h2>
        <div className='space-y-4'>
          <div className='flex items-start gap-3'>
            <span className='text-2xl'>📍</span>
            <div>
              <p className='font-medium text-sm mb-1'>
                {locale === 'fr' ? 'Adresse' : 'Address'}
              </p>
              <p className='text-sm text-black/60'>
                Port Camille Rayon<br />
                Avenue des frères Roustan<br />
                06220 Vallauris, France
              </p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <span className='text-2xl'>✉️</span>
            <div>
              <p className='font-medium text-sm mb-1'>
                {locale === 'fr' ? 'Email' : 'Email'}
              </p>
              <a 
                href='mailto:charter@bb-yachts.com'
                className='text-sm text-[var(--primary)] hover:underline'
              >
                charter@bb-yachts.com
              </a>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <span className='text-2xl'>☎️</span>
            <div>
              <p className='font-medium text-sm mb-1'>
                {locale === 'fr' ? 'Téléphone' : 'Phone'}
              </p>
              <a 
                href='https://wa.me/33609176282'
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors duration-200'
                aria-label='WhatsApp'
                title={locale === 'fr' ? 'Contacter via WhatsApp' : 'Contact via WhatsApp'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm'>
        <h3 className='font-semibold mb-3'>
          {locale === 'fr' ? 'Horaires' : 'Opening hours'}
        </h3>
        <div className='space-y-2 text-sm text-black/60'>
          <p>{locale === 'fr' ? 'Lundi - Vendredi' : 'Monday - Friday'}: 9h - 18h</p>
          <p>{locale === 'fr' ? 'Samedi' : 'Saturday'}: 9h - 17h</p>
          <p>{locale === 'fr' ? 'Dimanche' : 'Sunday'}: {locale === 'fr' ? 'Sur rendez-vous' : 'By appointment'}</p>
        </div>
      </div>
    </div>
  );
}

function ContactPageInner({ locale }: { locale: Locale }) {
  const t = messages[locale];

  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-14'>
        <div className='mb-12'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight mb-4'>
            {locale === 'fr' ? 'Contactez-nous' : 'Contact us'}
          </h1>
          <p className='text-sm sm:text-base text-black/60 max-w-2xl'>
            {locale === 'fr' 
              ? "Une question ? Un projet ? N'hésitez pas à nous contacter. Notre équipe vous répondra dans les plus brefs délais."
              : "A question? A project? Don't hesitate to contact us. Our team will get back to you as soon as possible."}
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          <Suspense fallback={<div className='bg-white rounded-2xl border border-black/10 p-6 shadow-sm'>Chargement...</div>}>
            <ContactForm />
          </Suspense>
          <ContactInfo locale={locale} />
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

export default async function ContactPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  return <ContactPageInner locale={locale} />;
}
