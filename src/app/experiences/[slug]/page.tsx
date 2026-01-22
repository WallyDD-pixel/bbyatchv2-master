import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import ExperienceBoatSelector from "@/components/ExperienceBoatSelector";
import BoatMediaCarousel from "@/components/BoatMediaCarousel";

export default async function ExperienceDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ lang?: string }> }) {
  // Next.js 15 : params et searchParams sont maintenant des Promises
  const { slug: slugParam } = await params;
  const sp = await (searchParams || Promise.resolve({}));
  
  // Décoder le slug de l'URL (Next.js le décode déjà, mais on s'assure)
  let slug = slugParam;
  try {
    // Décoder au cas où il y aurait un double encodage
    slug = decodeURIComponent(slug);
  } catch {
    // Si le décodage échoue, utiliser le slug tel quel
  }
  
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  // Normaliser le slug : remplacer les espaces multiples par un seul espace, trim
  slug = slug.trim().replace(/\s+/g, ' ');
  
  // Chercher l'expérience avec le slug exact
  let exp = await (prisma as any).experience.findUnique({ where: { slug } }).catch(()=>null) as any;
  
  // Si pas trouvé, essayer des variations
  if(!exp){
    // Essayer avec l'apostrophe droite (') au lieu de l'apostrophe typographique (')
    const slugVariation1 = slug.replace(/'/g, "'");
    if(slugVariation1 !== slug){
      exp = await (prisma as any).experience.findUnique({ where: { slug: slugVariation1 } }).catch(()=>null) as any;
    }
    
    // Essayer avec l'apostrophe typographique (') au lieu de l'apostrophe droite (')
    if(!exp){
      const slugVariation2 = slug.replace(/'/g, "'");
      if(slugVariation2 !== slug){
        exp = await (prisma as any).experience.findUnique({ where: { slug: slugVariation2 } }).catch(()=>null) as any;
      }
    }
    
    // Essayer avec des espaces remplacés par des tirets
    if(!exp){
      const slugVariation3 = slug.replace(/\s+/g, '-');
      if(slugVariation3 !== slug){
        exp = await (prisma as any).experience.findUnique({ where: { slug: slugVariation3 } }).catch(()=>null) as any;
      }
    }
    
    // En dernier recours, essayer une recherche par titre (si le slug ne correspond pas exactement)
    if(!exp){
      // Normaliser pour la recherche : mettre en minuscules et remplacer les accents
      const normalizedSlug = slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const allExperiences = await (prisma as any).experience.findMany({ 
        select: { id: true, slug: true, titleFr: true, titleEn: true }
      }).catch(()=>[]) as any[];
      
      // Chercher une expérience dont le titre correspond au slug
      exp = allExperiences.find(e => {
        const titleFrNorm = (e.titleFr || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const titleEnNorm = (e.titleEn || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const slugNorm = (e.slug || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return titleFrNorm.includes(normalizedSlug) || titleEnNorm.includes(normalizedSlug) || slugNorm.includes(normalizedSlug);
      });
      
      // Si trouvé par titre, récupérer l'expérience complète
      if(exp){
        exp = await (prisma as any).experience.findUnique({ where: { id: exp.id } }).catch(()=>null) as any;
      }
    }
  }
  
  if(!exp){ 
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderBar initialLocale={locale} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-black/60">
            {locale==='fr'? 'Expérience introuvable':'Experience not found'}
            <br />
            <span className="text-xs text-black/40 mt-2 block">Slug recherché: {slug}</span>
          </div>
        </main>
        <Footer locale={locale} t={t} />
      </div>
    ); 
  }

  // Parser photoUrls depuis JSON ou array
  const parsePhotoUrls = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Construire la liste des images : imageUrl principale + photoUrls
  const parsedPhotoUrls = parsePhotoUrls(exp.photoUrls);
  const allImages: string[] = [];
  
  // Ajouter imageUrl si elle existe et n'est pas déjà dans photoUrls
  if (exp.imageUrl && !parsedPhotoUrls.includes(exp.imageUrl)) {
    allImages.push(exp.imageUrl);
  }
  
  // Ajouter les autres photos
  allImages.push(...parsedPhotoUrls);

  // Charger les bateaux liés avec leurs options
  const boatExperiences = await prisma.boatExperience.findMany({
    where: { experience: { slug } },
    include: { boat: { include: { options: true } } },
    orderBy: { boatId: 'asc' }
  }).catch(()=>[]);

  const boatsForClient = boatExperiences.map(be=>({
    boatId: be.boatId,
    slug: be.boat.slug,
    name: be.boat.name,
    imageUrl: be.boat.imageUrl,
    capacity: be.boat.capacity,
    speedKn: be.boat.speedKn,
    priceExperience: be.price,
    options: (be.boat as any).options?.map((o:any)=> ({ id:o.id, label:o.label, price:o.price }))||[]
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 px-4 sm:px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3 text-[11px] mb-6">
          <a href="/" className="group inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-black/10 shadow-sm hover:border-[color:var(--primary)]/40 hover:shadow transition text-black/70 hover:text-black">
            <span className="text-lg group-hover:-translate-x-0.5 transition">←</span>
            <span className="font-semibold tracking-wide">{locale==='fr'? 'Retour à l\'accueil':'Back to home'}</span>
          </a>
          <span className="text-black/40">/</span>
          <span className="font-semibold text-black/70">{locale==='fr'? exp.titleFr: exp.titleEn}</span>
        </div>
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-6">
            {/* Carousel d'images */}
            {allImages.length > 0 ? (
              <div className="rounded-3xl overflow-hidden border border-black/10 bg-white shadow-lg">
                <BoatMediaCarousel images={allImages} videos={[]} />
              </div>
            ) : (
              <div className="relative h-60 sm:h-80 rounded-3xl overflow-hidden border border-black/10 bg-gradient-to-br from-black/5 to-black/10 flex items-center justify-center">
                <div className="text-black/40 text-sm">{locale==='fr'? 'Pas d\'image':'No image'}</div>
              </div>
            )}
            
            {/* Titre et description */}
            <div className="rounded-3xl border border-black/10 bg-white shadow-sm p-6 sm:p-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-black mb-4 leading-tight">
                {locale==='fr'? exp.titleFr: exp.titleEn}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-black/70 whitespace-pre-line mb-6">
                {locale==='fr'? exp.descFr: exp.descEn}
              </p>
              {(locale==='fr'? exp.timeFr: exp.timeEn) && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--primary)]/10 border border-[color:var(--primary)]/20 text-[12px] font-semibold text-[color:var(--primary)]">
                  <span>⏱️</span>
                  <span>{(locale==='fr'? exp.timeFr: exp.timeEn)}</span>
                </div>
              )}
              {exp.hasFixedTimes && exp.fixedDepartureTime && exp.fixedReturnTime && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">{locale==='fr'? 'Horaires fixes (événement)' : 'Fixed times (event)'}</p>
                  <p className="text-sm text-blue-800">
                    {locale==='fr'? 'Départ' : 'Departure'}: <strong>{exp.fixedDepartureTime}</strong> • {locale==='fr'? 'Retour' : 'Return'}: <strong>{exp.fixedReturnTime}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
          <aside className="lg:col-span-1 space-y-6">
            <ExperienceBoatSelector locale={locale} experienceSlug={slug} boats={boatsForClient} experienceTitle={locale==='fr'? exp.titleFr: exp.titleEn} experience={exp} />
          </aside>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
