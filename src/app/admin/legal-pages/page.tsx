import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { messages, type Locale } from '@/i18n/messages';

// Définir les slugs des pages légales standard
const LEGAL_PAGES = [
  { slug: 'legal', titleFr: 'Légal', titleEn: 'Legal' },
  { slug: 'conditions-paiement', titleFr: 'Conditions & Paiement', titleEn: 'Terms & Payment' },
  { slug: 'cgu-mentions', titleFr: 'CGU / Mentions', titleEn: 'Terms of Use / Legal Mentions' },
  { slug: 'confidentialite', titleFr: 'Confidentialité', titleEn: 'Privacy' },
  { slug: 'reservations', titleFr: 'Réservations', titleEn: 'Bookings' },
  { slug: 'politique-annulation', titleFr: 'Politique d\'annulation', titleEn: 'Cancellation Policy' },
  { slug: 'modalites-paiement', titleFr: 'Modalités de paiement', titleEn: 'Payment Terms' },
  { slug: 'carburant-depot', titleFr: 'Carburant & dépôt', titleEn: 'Fuel & Deposit' },
];

export default async function AdminLegalPages({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any).role !== 'admin') redirect('/dashboard');
  const locale: Locale = searchParams?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  // Récupérer toutes les pages légales existantes pour vérifier lesquelles existent déjà
  const existingPages = await (prisma as any).legalPage.findMany({ 
    select: { slug: true, id: true },
  }).catch(()=>[]);
  
  const existingSlugs = new Set(existingPages.map((p: any) => p.slug));
  const existingPagesMap = new Map(existingPages.map((p: any) => [p.slug, p.id]));

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-4xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Pages légales':'Legal pages'}</h1>
          <Link href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>
            ← {locale==='fr'? 'Retour':'Back'}
          </Link>
        </div>

        <div className='grid sm:grid-cols-2 gap-4'>
          {LEGAL_PAGES.map((page) => {
            const exists = existingSlugs.has(page.slug);
            const pageId = existingPagesMap.get(page.slug);
            const href = exists 
              ? `/admin/legal-pages/${pageId}` 
              : `/admin/legal-pages/new?slug=${encodeURIComponent(page.slug)}&titleFr=${encodeURIComponent(page.titleFr)}&titleEn=${encodeURIComponent(page.titleEn)}`;
            
            return (
              <Link
                key={page.slug}
                href={href}
                className='group relative rounded-xl border-2 border-black/10 bg-white p-6 hover:border-[color:var(--primary)] hover:shadow-md transition-all'
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-black/90 group-hover:text-[color:var(--primary)] transition-colors'>
                      {locale === 'fr' ? page.titleFr : page.titleEn}
                    </h3>
                    <p className='text-sm text-black/50 mt-1'>{page.slug}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    {exists && (
                      <span className='text-xs px-2 py-1 rounded-full bg-green-100 text-green-700'>
                        {locale === 'fr' ? 'Existe' : 'Exists'}
                      </span>
                    )}
                    <svg className='w-5 h-5 text-black/40 group-hover:text-[color:var(--primary)] transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
