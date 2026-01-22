import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { messages, type Locale } from '@/i18n/messages';
import AdminInstructions from "@/components/AdminInstructions";

// Définir les slugs des pages légales standard correspondant aux liens du footer
const LEGAL_PAGES = [
  // Section "Légal"
  { slug: 'conditions-paiement', titleFr: 'Conditions & Paiement', titleEn: 'Charter & Payment Terms' },
  { slug: 'cgu-mentions', titleFr: 'CGU / Mentions', titleEn: 'Terms & Notices' },
  { slug: 'confidentialite', titleFr: 'Confidentialité', titleEn: 'Privacy' },
  // Section "Réservations"
  { slug: 'politique-annulation', titleFr: 'Politique d\'annulation', titleEn: 'Cancellation Policy' },
  { slug: 'modalites-paiement', titleFr: 'Modalités de paiement', titleEn: 'Payment Modalities' },
  { slug: 'carburant-depot', titleFr: 'Carburant & dépôt', titleEn: 'Fuel & Security Deposit' },
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
          title={locale==='fr'?'Comment gérer les pages légales':'How to manage legal pages'}
          instructions={[
            {
              title: locale==='fr'?'Créer ou modifier une page':'Create or edit a page',
              description: locale==='fr'?'Cliquez sur une carte de page légale pour la créer (si elle n\'existe pas) ou la modifier (si elle existe déjà). Les pages avec un badge vert "Existe" sont déjà créées.':'Click on a legal page card to create it (if it doesn\'t exist) or edit it (if it already exists). Pages with a green "Exists" badge are already created.'
            },
            {
              title: locale==='fr'?'Pages standard':'Standard pages',
              description: locale==='fr'?'Les pages légales standard (CGU, Confidentialité, Conditions de paiement, etc.) sont pré-configurées. Il suffit de cliquer dessus pour les créer ou les modifier.':'Standard legal pages (Terms, Privacy, Payment Terms, etc.) are pre-configured. Just click on them to create or edit.'
            },
            {
              title: locale==='fr'?'Contenu bilingue':'Bilingual content',
              description: locale==='fr'?'Chaque page doit avoir un contenu en français et en anglais. Utilisez les onglets pour basculer entre les deux langues lors de l\'édition.':'Each page must have content in French and English. Use tabs to switch between the two languages when editing.'
            },
            {
              title: locale==='fr'?'Affichage sur le site':'Display on site',
              description: locale==='fr'?'Les pages légales sont accessibles depuis le footer du site. Elles sont automatiquement liées aux pages correspondantes.':'Legal pages are accessible from the site footer. They are automatically linked to corresponding pages.'
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
