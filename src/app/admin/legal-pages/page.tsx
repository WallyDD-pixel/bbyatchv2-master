import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { messages, type Locale } from '@/i18n/messages';
import AdminInstructions from "@/components/AdminInstructions";

// Les 3 pages légales affichées dans le footer (modifiables ici)
const LEGAL_PAGES = [
  { slug: 'conditions-paiement', titleFr: 'CGV', titleEn: 'Charter & Payment Terms' },
  { slug: 'cgu-mentions', titleFr: 'Mentions légales', titleEn: 'Terms & Notices' },
  { slug: 'confidentialite', titleFr: 'Données personnelles', titleEn: 'Privacy' },
];

export default async function AdminLegalPages({ searchParams }: { searchParams?: Promise<{ lang?: string }> }){
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any).role !== 'admin') redirect('/dashboard');
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  // Récupérer toutes les pages légales existantes pour vérifier lesquelles existent déjà
  const existingPages = await (prisma as any).legalPage.findMany({ 
    select: { slug: true, id: true },
  }).catch(()=>[]);
  
  const existingSlugs = new Set(existingPages.map((p: any) => p.slug));
  const existingPagesMap = new Map(existingPages.map((p: any) => [p.slug, p.id]));

  return (
    <div className='p-6 md:p-8 lg:p-10'>
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Pages légales':'Legal pages'}</h1>
          <Link href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5 cursor-pointer'>
            ← {locale==='fr'? 'Retour':'Back'}
          </Link>
        </div>
        <AdminInstructions
          locale={locale}
          title={locale==='fr'?'Pages légales du footer':'Footer legal pages'}
          instructions={[
            {
              title: locale==='fr'?'Modifier le contenu':'Edit content',
              description: locale==='fr'?'Les trois liens en bas du site (CGV, Mentions légales, Données personnelles) pointent vers ces pages. Cliquez sur une carte pour créer la page (si elle n\'existe pas) ou la modifier.':'The three links at the bottom of the site (Charter & Payment Terms, Terms & Notices, Privacy) point to these pages. Click a card to create the page (if it doesn\'t exist) or edit it.'
            },
            {
              title: locale==='fr'?'Contenu bilingue':'Bilingual content',
              description: locale==='fr'?'Chaque page peut avoir un contenu en français et en anglais. Remplissez les champs FR et EN lors de l\'édition.':'Each page can have content in French and English. Fill in the FR and EN fields when editing.'
            }
          ]}
        />
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
              className='group relative rounded-xl border-2 border-black/10 bg-white p-6 hover:border-blue-600 hover:shadow-md transition-all cursor-pointer block'
            >
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-black/90 group-hover:text-blue-600 transition-colors'>
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
                  <svg className='w-5 h-5 text-black/40 group-hover:text-blue-600 transition-colors' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
