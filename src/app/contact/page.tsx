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
                href='tel:+33609176282'
                className='text-sm text-[var(--primary)] hover:underline'
              >
                06 09 17 62 82
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

function ContactPageInner({ searchParams }: { searchParams?: { lang?: string } }) {
  const locale: Locale = (searchParams?.lang as Locale) || 'fr';
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

export default async function ContactPage({ searchParams }: { searchParams?: { lang?: string } }) {
  return <ContactPageInner searchParams={searchParams} />;
}
