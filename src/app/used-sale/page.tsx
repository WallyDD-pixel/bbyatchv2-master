import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function UsedSalePage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }){
  const sp = (await searchParams) || {};
  const locale: Locale = sp?.lang==='en' ? 'en':'fr';
  const t = messages[locale];
  const boats = await (prisma as any).usedBoat.findMany({ orderBy:[{ sort:'asc' }, { createdAt:'desc' }] });
  const listed = boats.filter((b:any)=> b.status === 'listed');
  const sold = boats.filter((b:any)=> b.status === 'sold');
  const fmt = (v:number)=> new Intl.NumberFormat(locale==='fr'?'fr-FR':'en-US',{ style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(v);
  
  // Récupérer les paramètres de la page depuis Settings
  const settings = await prisma.settings.findFirst() as any;
  const title = locale === 'fr' 
    ? (settings?.usedSaleTitleFr || "Bateaux d'occasion")
    : (settings?.usedSaleTitleEn || 'Pre-owned boats');
  const text = locale === 'fr'
    ? (settings?.usedSaleTextFr || "Notre sélection de bateaux d'occasion immédiatement disponibles. Contactez-nous pour une visite ou plus d'informations.")
    : (settings?.usedSaleTextEn || "Our curated selection of immediately available pre-owned yachts. Contact us for a viewing or more details.");
  
  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f3f6f9]'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14'>
        <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10'>
          <div>
            <h1 className='text-3xl sm:text-4xl font-bold tracking-tight'>{title}</h1>
            <p className='mt-3 text-sm sm:text-base text-black/60 max-w-2xl whitespace-pre-line'>
              {text}
            </p>
          </div>
          {listed.length>0 && (
            <div className='flex gap-3 flex-wrap'>
              <span className='inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white shadow-sm border border-black/10 text-sm font-medium'>{listed.length} {locale==='fr'? 'disponible(s)':'available'}</span>
            </div>) }
        </div>
        {listed.length === 0 && (
          <div className='text-black/50 mb-12 text-sm'>{locale==='fr'? 'Aucun bateau disponible pour le moment.' : 'No boats currently available.'}</div>
        )}
        <div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-8'>
          {listed.map((b:any)=> (
            <Link key={b.id} href={`/used-sale/${b.slug}`} className='group relative rounded-2xl bg-white border border-black/10 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition'>
              {b.mainImage && (
                <div className='relative aspect-[16/10] w-full overflow-hidden'>
                  <Image src={b.mainImage} alt={b.titleFr} fill className='object-cover group-hover:scale-105 transition-transform duration-500' />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-60 group-hover:opacity-70 transition' />
                  <div className='absolute top-3 left-3 flex flex-col gap-2'>
                    <span className='px-3 py-1 rounded-full text-[11px] font-medium bg-white/90 backdrop-blur border border-white/60 text-black shadow'>
                      {b.year} · {b.lengthM} m
                    </span>
                  </div>
                  <div className='absolute bottom-3 left-3 right-3 flex items-end justify-between'>
                    <h2 className='text-white text-lg font-semibold drop-shadow max-w-[70%] line-clamp-2'>{locale==='fr'? b.titleFr : b.titleEn}</h2>
                    <div className='ml-2 px-3 py-1 rounded-md bg-white/95 shadow text-[13px] font-semibold text-[color:var(--primary)]'>
                      {fmt(b.priceEur)}
                    </div>
                  </div>
                </div>
              )}
              {!b.mainImage && (
                <div className='aspect-[16/10] w-full bg-black/5 flex items-center justify-center text-black/40 text-sm'>No image</div>
              )}
              <div className='p-5 flex flex-col gap-3 flex-1'>
                {b.summaryFr && <p className='text-[13px] leading-snug text-black/60 line-clamp-3'>{b.summaryFr}</p>}
                <div className='mt-auto flex flex-wrap gap-2 text-[11px]'>
                  {b.engineHours && <span className='px-2 py-1 rounded-full bg-black/5 text-black/70'>{b.engineHours} h</span>}
                  {b.fuelType && <span className='px-2 py-1 rounded-full bg-black/5 text-black/70'>{b.fuelType}</span>}
                  {b.engines && <span className='px-2 py-1 rounded-full bg-black/5 text-black/70 line-clamp-1 max-w-[160px]'>{b.engines}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {sold.length > 0 && (
          <div className='mt-24'>
            <h2 className='text-2xl font-semibold mb-6 flex items-center gap-3'>{locale==='fr'? 'Déjà vendus':'Recently sold'}<span className='text-xs font-normal text-black/40'>({sold.length})</span></h2>
            <div className='grid sm:grid-cols-3 lg:grid-cols-5 gap-4'>
              {sold.map((b:any)=> (
                <Link key={b.id} href={`/used-sale/${b.slug}`} className='group rounded-xl bg-white border border-black/10 shadow-sm overflow-hidden hover:shadow-md transition'>
                  {b.mainImage && (
                    <div className='relative aspect-video w-full overflow-hidden'>
                      <Image src={b.mainImage} alt={b.titleFr} fill className='object-cover group-hover:scale-105 transition-transform' />
                      <span className='absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] uppercase tracking-wide'>Vendu</span>
                    </div>
                  )}
                  <div className='p-3 space-y-1'>
                    <div className='text-[12px] font-medium line-clamp-2'>{locale==='fr'? b.titleFr : b.titleEn}</div>
                    <div className='text-[10px] text-black/50'>{b.year} · {b.lengthM} m</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
