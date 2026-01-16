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

export default async function LegalPage({ params, searchParams }: { params: Promise<{ slug: string }> | { slug: string }, searchParams?: Promise<{ lang?: string }> | { lang?: string } }){
  // Gérer les params qui peuvent être une Promise (Next.js 15)
  const resolvedParams = params instanceof Promise ? await params : params;
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  
  const locale: Locale = (resolvedSearchParams?.lang === 'en') ? 'en' : 'fr';
  const t = messages[locale];
  const slug = resolvedParams.slug;
  let page: LegalRow | null = null;
  
  // Essayer d'abord avec le slug exact
  try {
    page = await (prisma as any).legalPage.findUnique({ where:{ slug } });
  } catch {
    try {
      const rows = await prisma.$queryRaw<LegalRow[]>`
        SELECT id, slug, titleFr, titleEn, introFr, introEn, contentFr, contentEn,
               cancellationFr, cancellationEn, paymentFr, paymentEn, fuelDepositFr, fuelDepositEn
        FROM "LegalPage" WHERE slug = ${slug} LIMIT 1
      `;
      page = rows?.[0] || null;
    } catch {
      page = null;
    }
  }
  
  // Si pas trouvé, essayer une recherche flexible
  if(!page) {
    try {
      // Récupérer toutes les pages légales
      const allPages = await (prisma as any).legalPage.findMany();
      
      // Mapping de slugs alternatifs avec priorités
      const slugMappings: Record<string, string[]> = {
        'conditions-paiement-location': ['conditions-paiement', 'conditions-paiement-location', 'conditions', 'paiement'],
        'conditions-paiement': ['conditions-paiement-location', 'conditions-paiement', 'conditions', 'paiement'],
        'terms': ['terms', 'cgu-mentions', 'cgu', 'mentions'],
        'cgu-mentions': ['terms', 'cgu-mentions', 'cgu', 'mentions'],
        'privacy': ['privacy', 'confidentialite', 'confidentialité'],
        'confidentialite': ['privacy', 'confidentialite', 'confidentialité'],
      };
      
      // Essayer d'abord les slugs alternatifs
      const alternativeSlugs = slugMappings[slug.toLowerCase()] || [slug];
      for (const altSlug of alternativeSlugs) {
        page = allPages.find((p: any) => p.slug?.toLowerCase() === altSlug.toLowerCase());
        if (page) break;
      }
      
      // Si toujours pas trouvé, chercher par mots-clés dans le titre ou le slug
      if(!page) {
        const searchTerms = slug.toLowerCase().split('-').filter(t => t.length > 2);
        
        // Rechercher dans les slugs d'abord
        page = allPages.find((p: any) => {
          const pSlug = (p.slug || '').toLowerCase();
          return searchTerms.some(term => pSlug.includes(term));
        });
        
        // Si pas trouvé dans les slugs, chercher dans les titres
        if(!page) {
          page = allPages.find((p: any) => {
            const titleFr = (p.titleFr || '').toLowerCase();
            const titleEn = (p.titleEn || '').toLowerCase();
            // Pour "conditions-paiement-location", chercher "conditions" ET "paiement"
            if (searchTerms.length >= 2) {
              return searchTerms.every(term => titleFr.includes(term) || titleEn.includes(term));
            }
            return searchTerms.some(term => titleFr.includes(term) || titleEn.includes(term));
          });
        }
      }
      
      // Si trouvé par recherche flexible, récupérer la page complète avec toutes les colonnes
      if (page && !page.contentFr && !page.contentEn) {
        page = await (prisma as any).legalPage.findUnique({ where:{ id: page.id } });
      }
    } catch (e) {
      console.error('Erreur lors de la recherche flexible:', e);
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
