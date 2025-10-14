import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExperiencePayButton from './pay-button';

export const dynamic = 'force-dynamic';

function money(v:number|null|undefined, locale:Locale){ if(v==null) return '—'; return (v/1).toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €'; }

export default async function BookingExperiencePage({ searchParams }:{ searchParams?: Record<string,string|undefined> }) {
  const sp = (searchParams || {}) as Record<string,string|undefined>;
  const locale: Locale = sp.lang==='en'? 'en':'fr';
  const t = messages[locale];

  const expSlug = sp.exp || '';
  const boatId = sp.boat? Number(sp.boat): NaN;
  const part = sp.part || 'FULL';
  const start = sp.start || '';
  const end = sp.end || start;

  if(!expSlug || isNaN(boatId) || !start){
    redirect('/');
  }

  const experience = await prisma.experience.findUnique({ where:{ slug: expSlug }, select:{ id:true, slug:true, titleFr:true, titleEn:true, imageUrl:true, descFr:true, descEn:true, timeFr:true, timeEn:true } });
  if(!experience){ redirect('/'); }

  const boat = await prisma.boat.findUnique({ where:{ id: boatId }, select:{ id:true, name:true, slug:true, capacity:true, speedKn:true, imageUrl:true } });
  const boatExp = await prisma.boatExperience.findUnique({ where:{ boatId_experienceId: { boatId: boatId, experienceId: experience.id } }, select:{ price:true } });
  const options = await prisma.boatOption.findMany({ where:{ boatId }, select:{ id:true, label:true, price:true } });

  const fullDay = part==='FULL';
  const dayCount = (()=>{ const s=new Date(start+'T00:00:00'); const e=new Date(end+'T00:00:00'); return Math.round((e.getTime()-s.getTime())/86400000)+1; })();

  // Prix simple: prix experience * nb jours (si full) sinon moitié? (placeholder)
  const basePrice = boatExp?.price || 0;
  const computedPrice = fullDay? basePrice * dayCount : Math.round(basePrice * 0.55); // demi-journée 55%
  const deposit = Math.round(computedPrice * 0.2);
  const remaining = computedPrice - deposit;

  const session = await getServerSession(auth as any) as any;
  const user = session?.user || null;

  const checkoutUrl = (boat ? `/checkout?exp=${encodeURIComponent(experience.slug)}&boat=${encodeURIComponent(boat.slug)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&part=${encodeURIComponent(part)}` : null);

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a href={experience? '/experiences/'+experience.slug : '/experiences'} className="inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-white border border-black/10 shadow-sm hover:border-[color:var(--primary)]/40 hover:shadow text-[13px] font-medium text-black/70 hover:text-black transition">
              <span className="text-lg leading-none -ml-1">←</span>
              <span>{locale==='fr'? 'Retour':'Back'}</span>
            </a>
            <h1 className="text-xl font-bold">{locale==='fr'? 'Récapitulatif expérience':'Experience summary'}</h1>
          </div>
          <div />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-3">{locale==='fr'? 'Expérience':'Experience'}</h2>
              <p className="text-sm font-medium">{locale==='fr'? experience.titleFr : (experience.titleEn||experience.titleFr)}</p>
              <p className="mt-2 text-xs text-black/60 whitespace-pre-line">{locale==='fr'? experience.descFr : (experience.descEn||experience.descFr)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-3">{locale==='fr'? 'Dates':'Dates'}</h2>
              <p className="text-sm">{locale==='fr'? 'Du':'From'} <strong>{start}</strong> {locale==='fr'? 'au':'to'} <strong>{end}</strong> {fullDay && dayCount>1 && <span>({dayCount} {locale==='fr'? 'jours':'days'})</span>}</p>
              <p className="text-sm mt-1">{locale==='fr'? 'Créneau':'Slot'} : <strong>{part==='FULL'? (locale==='fr'? 'Journée entière':'Full day'): part==='AM'? (locale==='fr'? 'Matin':'Morning') : (locale==='fr'? 'Après-midi':'Afternoon')}</strong></p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-3">{locale==='fr'? 'Bateau':'Boat'}</h2>
              {boat? <p className="text-sm font-medium">{boat.name}</p> : <p className="text-xs text-red-600">{locale==='fr'? 'Bateau introuvable':'Boat not found'}</p>}
              {boat && <p className="text-xs text-black/60 mt-1">{boat.capacity} pax • {boat.speedKn} kn</p>}
            </div>
          </div>
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-4">{locale==='fr'? 'Prix':'Price'}</h2>
              <div className="flex justify-between text-sm"><span>{locale==='fr'? 'Base':'Base'}</span><span>{money(basePrice, locale)}</span></div>
              {fullDay && dayCount>1 && <div className="flex justify-between text-xs mt-1 text-black/60"><span>x {dayCount} {locale==='fr'? 'jours':'days'}</span><span>{money(basePrice*dayCount, locale)}</span></div>}
              {!fullDay && <div className="text-[10px] text-black/50 mt-1">{locale==='fr'? 'Tarif demi-journée estimé (55%)':'Half-day estimated (55%)'}</div>}
              <div className="border-t border-black/10 my-3" />
              <div className="flex justify-between font-semibold text-sm"><span>{locale==='fr'? 'Total':'Total'}</span><span>{money(computedPrice, locale)}</span></div>
              <div className="flex justify-between text-xs mt-2"><span>{locale==='fr'? 'Acompte (20%)':'Deposit (20%)'}</span><span>{money(deposit, locale)}</span></div>
              <div className="flex justify-between text-xs"><span>{locale==='fr'? 'Reste':'Remaining'}</span><span>{money(remaining, locale)}</span></div>
              {checkoutUrl ? (
                // Remplacement par bouton client Stripe expérience
                boat && (
                  <ExperiencePayButton expSlug={experience.slug} boatId={boat.id} start={start} end={end} part={part} locale={locale} disabled={!user} />
                )
              ) : (
                <span className="mt-5 w-full h-11 rounded-full bg-black/20 text-white/60 font-semibold text-sm flex items-center justify-center cursor-not-allowed">
                  {locale==='fr'? 'Continuer vers paiement':'Continue to payment'}
                </span>
              )}
              {!user && <p className="mt-2 text-[10px] text-black/50">{locale==='fr'? 'Connectez-vous pour accélérer le paiement':'Log in to speed up checkout'}</p>}
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm text-[10px] text-black/60 space-y-2">
              <p>⚠️ {locale==='fr'? 'Prix estimatif. Le calcul final peut varier selon options et taxes.' : 'Indicative price. Final calculation may vary with options and taxes.'}</p>
              <p>✔️ {locale==='fr'? 'Étape suivante : création / connexion compte pour réserver.' : 'Next: create / login account to book.'}</p>
              <p>🔐 {locale==='fr'? 'Paiement sécurisé.' : 'Secure payment.'}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
