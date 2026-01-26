import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { messages, type Locale } from '@/i18n/messages';
import BoatMediaCarousel from '@/components/BoatMediaCarousel';

export async function generateStaticParams(){
  try {
    const boats = await (prisma as any).usedBoat.findMany({ where:{ status: 'listed' }, select:{ slug:true }});
    return boats.map((b:any)=>({ slug: b.slug }));
  } catch (e) {
    // En absence de DB (ex: build preview sans env), on ne génère rien => fallback 404 dynamiques
    return [];
  }
}

export default async function UsedBoatDetail({ params, searchParams }: { params: Promise<{ slug:string }>, searchParams?: Promise<{ lang?: string, sent?: string }> }){
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const locale: Locale = sp?.lang==='en' ? 'en':'fr';
  const sent = sp?.sent === '1' || sp?.sent === 'true';
  const t = messages[locale];
  let boat: any = null;
  try {
    boat = await (prisma as any).usedBoat.findUnique({ where:{ slug }});
  } catch (e) {
    // Impossible d'accéder à la DB pendant le build -> 404
    notFound();
  }
  if(!boat || (boat.status !== 'listed' && boat.status !== 'sold')) notFound();
  // Parse JSON photos
  let photos: string[] = [];
  if (boat.photoUrls) {
    try { const parsed = JSON.parse(boat.photoUrls); if(Array.isArray(parsed)) photos = parsed.filter(p=> typeof p === 'string'); } catch {}
  }
  // Parse JSON videos
  let videos: string[] = [];
  if (boat.videoUrls) {
    try {
      const parsed = typeof boat.videoUrls === 'string' ? JSON.parse(boat.videoUrls) : boat.videoUrls;
      if (Array.isArray(parsed)) videos = parsed.filter(v => typeof v === 'string');
    } catch {}
  }
  // Combiner mainImage avec photos pour le carousel
  const allImages = boat.mainImage ? [boat.mainImage, ...photos.filter(p => p !== boat.mainImage)] : photos;
  const priceLabel = boat.status === 'sold' 
    ? (locale==='fr'? 'Vendu':'Sold') 
    : (boat.priceEur 
      ? new Intl.NumberFormat(locale==='fr'?'fr-FR':'en-US',{ style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(boat.priceEur)
      : (locale==='fr'? 'Nous consulter':'Contact us'));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-[#f5f7fa]">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 w-full">
        {sent && (
          <div className="fixed z-30 top-4 right-4 max-w-sm animate-in fade-in slide-in-from-top-2">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-md px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="text-sm leading-snug pr-4">
                <p className="font-semibold mb-1">{locale==='fr'? 'Message envoyé':'Message sent'}</p>
                <p className="text-emerald-700 text-xs">{locale==='fr'? 'Nous vous répondrons rapidement.':'We will get back to you shortly.'}</p>
              </div>
              <script dangerouslySetInnerHTML={{__html:`setTimeout(()=>{const n=document.querySelector('[data-contact-sent]'); if(n) n.remove();},6000);`}} />
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          {/* Fil d'Ariane */}
          <nav className="text-[11px] sm:text-xs text-black/50 flex items-center gap-2" aria-label="Breadcrumb">
            <Link href={`/used-sale?lang=${locale}`} className="hover:text-black/80">{locale==='fr'?"Occasion":"Pre‑owned"}</Link>
            <span>/</span>
            <span className="text-black/70 truncate max-w-[220px]" title={boat.titleFr}>{boat.titleFr}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Galerie avec images et vidéos */}
            <div className="space-y-5">
              {(allImages.length > 0 || videos.length > 0) ? (
                <BoatMediaCarousel 
                  images={allImages}
                  videos={videos}
                />
              ) : (
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-black/5 border border-black/10 flex items-center justify-center">
                  <span className="text-black/40 text-sm">{locale==='fr'? 'Aucune image':'No image'}</span>
                </div>
              )}
              {boat.status==='sold' && (allImages.length > 0 || videos.length > 0) && (
                <div className="flex justify-center">
                  <span className="px-4 py-2 rounded-full bg-black/75 text-white text-xs font-semibold tracking-wide">{locale==='fr'? 'Vendu':'Sold'}</span>
                </div>
              )}
            </div>

            {/* Détails */}
            <div className="space-y-7">
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">{boat.titleFr}</h1>
                {boat.summaryFr && <p className="text-sm sm:text-base text-black/60 leading-relaxed">{boat.summaryFr}</p>}
                {/* Prix en dessous du texte descriptif, moins visible */}
                {boat.status !== 'sold' && (
                  <p className="text-sm text-black/50">
                    {locale === 'fr' ? 'À partir de' : 'From'} <span className="font-medium text-black/70">{priceLabel}</span>
                  </p>
                )}
                {boat.status === 'sold' && (
                  <p className="text-sm text-black/40 line-through">
                    {locale === 'fr' ? 'Vendu' : 'Sold'} — {priceLabel}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[11px] sm:text-[12px]">
                  <span className="px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">{locale==='fr'? 'Année':'Year'} {boat.year}</span>
                  <span className="px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">{boat.lengthM} m</span>
                  {boat.engineHours && <span className="px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">{boat.engineHours} h</span>}
                  {boat.fuelType && <span className="px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium">{boat.fuelType}</span>}
                  {boat.engines && <span className="px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium truncate max-w-[160px]" title={boat.engines}>{boat.engines}</span>}
                </div>
              </div>

              {boat.status!=='sold' && (
                <div className="p-6 rounded-2xl bg-white border border-black/10 shadow-sm">
                  <a
                    href="#contact"
                    aria-label={(locale==='fr'? 'Contacter au sujet de ':'Contact about ')+boat.titleFr}
                    className="group relative w-full inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-600/30 overflow-hidden"
                    data-cta="usedboat-contact"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition duration-500" />
                    <span className="absolute -left-8 top-0 h-full w-8 bg-white/40 blur-lg rotate-12 translate-x-0 group-hover:translate-x-[260%] transition-transform duration-700 ease-out" />
                    <svg className="relative z-10 w-4 h-4 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M4 4h16c.6 0 1 .4 1 1v14c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1V5c0-.6.4-1 1-1Z" />
                      <path d="m4 6 8 7 8-7" />
                    </svg>
                    <span className="relative z-10 leading-none pt-px">{locale==='fr'? 'Contact rapide':'Quick contact'}</span>
                  </a>
                </div>
              )}

              {boat.descriptionFr && (
                <article className="prose prose-sm sm:prose-base max-w-none prose-p:leading-relaxed">
                  {boat.descriptionFr.split(/\n\n+/).map((para:string,i:number)=>(<p key={i}>{para}</p>))}
                </article>
              )}
            </div>
          </div>

          {/* Section contact simple */}
          <div id="contact" className="rounded-3xl bg-white border border-black/10 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">{locale==='fr'? 'Intéressé par ce bateau ?':'Interested in this boat?'}</h2>
              <p className="text-sm text-black/60" id="contact-help">{locale==='fr'? 'Laissez-nous vos coordonnées, nous revenons vers vous rapidement.':'Leave your details, we will get back to you shortly.'}</p>
            </div>
            <form action={`/api/contact-message`} method="post" className="grid gap-4 sm:grid-cols-2" data-form-contact>
              <input type="hidden" name="usedBoatId" value={boat.id} />
              <input type="hidden" name="slug" value={boat.slug} />
              <input type="hidden" name="locale" value={locale} />
              <input required name="name" placeholder={locale==='fr'? 'Votre nom':'Your name'} className="col-span-2 sm:col-span-1 h-11 px-4 rounded-lg border border-black/15 bg-white text-sm outline-none focus:border-black/40" />
              <input required type="email" name="email" placeholder="Email" className="col-span-2 sm:col-span-1 h-11 px-4 rounded-lg border border-black/15 bg-white text-sm outline-none focus:border-black/40" />
              <textarea required name="message" placeholder={locale==='fr'? 'Votre message':'Your message'} rows={4} className="col-span-2 resize-none p-4 rounded-lg border border-black/15 bg-white text-sm outline-none focus:border-black/40" />
              <div className="col-span-2 flex items-center justify-between">
                <p className="text-[11px] text-black/40">{locale==='fr'? 'Nous ne partageons jamais vos informations.':'We never share your information.'}</p>
                <button className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow transition-colors" type="submit">{locale==='fr'? 'Envoyer':'Send'}</button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  )
}
