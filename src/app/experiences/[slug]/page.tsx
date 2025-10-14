import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import Image from "next/image";
import ExperienceBoatSelector from "@/components/ExperienceBoatSelector";

export default async function ExperienceDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: { lang?: string } }) {
  const { slug } = params;
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const exp = await prisma.experience.findUnique({ where: { slug } }).catch(()=>null) as any;
  if(!exp){ return <div className="min-h-screen flex flex-col"><HeaderBar initialLocale={locale} /><main className="flex-1 flex items-center justify-center"><div className="text-center text-sm text-black/60">{locale==='fr'? 'Expérience introuvable':'Experience not found'}</div></main><Footer locale={locale} t={t} /></div>; }

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
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="relative rounded-3xl overflow-hidden border border-black/10 bg-white shadow">
              {exp.imageUrl && (
                <div className="relative h-60 sm:h-80">
                  <Image src={exp.imageUrl} alt={locale==='fr'? exp.titleFr: exp.titleEn} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow">{locale==='fr'? exp.titleFr: exp.titleEn}</h1>
                  </div>
                </div>
              )}
              {!exp.imageUrl && (
                <div className="h-40 flex items-center justify-center text-black/40 text-sm">{locale==='fr'? 'Pas d\'image':'No image'}</div>
              )}
              <div className="p-6">
                <p className="text-sm sm:text-base leading-relaxed text-black/70 whitespace-pre-line">{locale==='fr'? exp.descFr: exp.descEn}</p>
                {(locale==='fr'? exp.timeFr: exp.timeEn) && (
                  <div className="mt-6 inline-flex items-center gap-2 px-4 h-9 rounded-full bg-black/5 text-[11px] font-semibold text-black/70">
                    ⏱️ {(locale==='fr'? exp.timeFr: exp.timeEn)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className="lg:col-span-1 space-y-6">
            <ExperienceBoatSelector locale={locale} experienceSlug={slug} boats={boatsForClient} experienceTitle={locale==='fr'? exp.titleFr: exp.titleEn} />
          </aside>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
