import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExperiencePayButton from './pay-button';
import ExperienceBookingDisplay from './ExperienceBookingDisplay';
import ExperiencePriceClient from './ExperiencePriceClient';

export const dynamic = 'force-dynamic';

function money(v:number|null|undefined, locale:Locale){ if(v==null) return '—'; return (v/1).toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €'; }

export default async function BookingExperiencePage({ searchParams }:{ searchParams?: Promise<Record<string,string|undefined>> }) {
  const sp = ((await searchParams) || {}) as Record<string,string|undefined>;
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

  const experience = await (prisma as any).experience.findUnique({ where:{ slug: expSlug }, select:{ id:true, slug:true, titleFr:true, titleEn:true, imageUrl:true, descFr:true, descEn:true, timeFr:true, timeEn:true, fixedDepartureTime:true, fixedReturnTime:true, hasFixedTimes:true } });
  if(!experience){ redirect('/'); }

  const boat = await prisma.boat.findUnique({ where:{ id: boatId }, select:{ id:true, name:true, slug:true, capacity:true, speedKn:true, imageUrl:true } });
  const boatExp = await prisma.boatExperience.findUnique({ where:{ boatId_experienceId: { boatId: boatId, experienceId: experience.id } }, select:{ price:true } });
  const options = await prisma.boatOption.findMany({ where:{ boatId }, select:{ id:true, label:true, price:true } });

  const fullDay = part==='FULL';
  const dayCount = (()=>{ const s=new Date(start+'T00:00:00'); const e=new Date(end+'T00:00:00'); return Math.round((e.getTime()-s.getTime())/86400000)+1; })();

  // Prix base: prix experience * nb jours (si full) sinon moitié (55%)
  const basePrice = boatExp?.price || 0;
  const basePriceForDays = fullDay? basePrice * dayCount : Math.round(basePrice * 0.55);
  
  // Les options seront récupérées côté client depuis sessionStorage et ajoutées au total
  // Pour l'affichage initial, on montre seulement le prix de base
  const computedPrice = basePriceForDays; // Sera mis à jour côté client avec les options
  const deposit = Math.round(computedPrice * 0.2);
  const remaining = computedPrice - deposit;

  const session = await getServerSession() as any;
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
              {experience.hasFixedTimes && experience.fixedDepartureTime && experience.fixedReturnTime && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">{locale==='fr'? 'Horaires fixes (non modifiables)' : 'Fixed times (non-editable)'}</p>
                  <p className="text-sm text-blue-800">
                    {locale==='fr'? 'Départ' : 'Departure'}: <strong>{experience.fixedDepartureTime}</strong> • {locale==='fr'? 'Retour' : 'Return'}: <strong>{experience.fixedReturnTime}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-3">{locale==='fr'? 'Bateau':'Boat'}</h2>
              {boat? <p className="text-sm font-medium">{boat.name}</p> : <p className="text-xs text-red-600">{locale==='fr'? 'Bateau introuvable':'Boat not found'}</p>}
              {boat && <p className="text-xs text-black/60 mt-1">{boat.capacity} pax • {boat.speedKn} kn</p>}
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold mb-4">{locale==='fr'? 'Informations de réservation':'Booking information'}</h2>
              <ExperienceBookingDisplay locale={locale} />
            </div>
          </div>
          <div className="md:col-span-1 space-y-6">
            <ExperiencePriceClient 
              locale={locale}
              basePrice={basePrice}
              options={options}
              dayCount={dayCount}
              fullDay={fullDay}
            />
            {checkoutUrl ? (
              // Remplacement par bouton client Stripe expérience
              boat && (
                <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <ExperiencePayButton expSlug={experience.slug} boatId={boat.id} start={start} end={end} part={part} locale={locale} disabled={!user} />
                  {!user && <p className="mt-2 text-[10px] text-black/50">{locale==='fr'? 'Connectez-vous pour accélérer le paiement':'Log in to speed up checkout'}</p>}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <span className="w-full h-11 rounded-full bg-black/20 text-white/60 font-semibold text-sm flex items-center justify-center cursor-not-allowed">
                  {locale==='fr'? 'Continuer vers paiement':'Continue to payment'}
                </span>
              </div>
            )}
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
