import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

type LegalRow = {
  id?: number;
  slug: string;
  titleFr: string;
  titleEn: string;
  introFr?: string | null;
  introEn?: string | null;
  contentFr?: string | null;
  contentEn?: string | null;
  cancellationFr?: string | null;
  cancellationEn?: string | null;
  paymentFr?: string | null;
  paymentEn?: string | null;
  fuelDepositFr?: string | null;
  fuelDepositEn?: string | null;
};

export default async function LegalPage({ params, searchParams }: { params:{ slug:string }, searchParams?: { lang?: string } }){
  const locale: Locale = (searchParams?.lang === 'en') ? 'en' : 'fr';
  const t = messages[locale];
  const slug = params.slug;
  let page: LegalRow | null = null;
  try {
    page = await (prisma as any).legalPage.findUnique({ where:{ slug } });
  } catch {
    try {
      const rows = await prisma.$queryRaw<LegalRow[]>`
        SELECT id, slug, titleFr, titleEn, introFr, introEn, contentFr, contentEn,
               cancellationFr, cancellationEn, paymentFr, paymentEn, fuelDepositFr, fuelDepositEn
        FROM LegalPage WHERE slug = ${slug} LIMIT 1
      `;
      page = rows?.[0] || null;
    } catch {
      page = null;
    }
  }
  if(!page) notFound();

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <h1 className='text-2xl font-bold'>{locale==='fr'? page.titleFr : page.titleEn}</h1>
        { (locale==='fr'? page.introFr: page.introEn) && (
          <p className='mt-3 text-black/70'>{locale==='fr'? page.introFr: page.introEn}</p>
        )}
        <article className='prose mt-6 max-w-none'>
          { (locale==='fr'? page.contentFr: page.contentEn) && (
            <section>
              <h2 className='text-xl font-semibold'>{locale==='fr'? 'Informations générales' : 'General information'}</h2>
              <p>{locale==='fr'? page.contentFr: page.contentEn}</p>
            </section>
          )}
          {(page.cancellationFr||page.cancellationEn) && (
            <section id='annulation' className='mt-6'>
              <h2 className='text-xl font-semibold'>{locale==='fr'? 'Politique d\'annulation' : 'Cancellation policy'}</h2>
              <p>{locale==='fr'? (page.cancellationFr||'') : (page.cancellationEn||'')}</p>
            </section>
          )}
          {(page.paymentFr||page.paymentEn) && (
            <section id='paiement' className='mt-6'>
              <h2 className='text-xl font-semibold'>{locale==='fr'? 'Modalités de paiement' : 'Payment modalities'}</h2>
              <p>{locale==='fr'? (page.paymentFr||'') : (page.paymentEn||'')}</p>
            </section>
          )}
          {(page.fuelDepositFr||page.fuelDepositEn) && (
            <section id='carburant' className='mt-6'>
              <h2 className='text-xl font-semibold'>{locale==='fr'? 'Carburant & dépôt' : 'Fuel & security deposit'}</h2>
              <p>{locale==='fr'? (page.fuelDepositFr||'') : (page.fuelDepositEn||'')}</p>
            </section>
          )}
        </article>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
