"use client";
import Image from "next/image";
import { useState, useMemo } from "react";
import SearchBar from './SearchBar';
import ExperienceBookingForm from '@/app/booking/experience/ExperienceBookingForm';

type BoatOption = { id:number; label:string; price:number|null }; 
interface BoatItem { boatId:number; slug:string; name:string; imageUrl?:string|null; capacity:number; speedKn:number; priceExperience:number|null; options:BoatOption[] }

export default function ExperienceBoatSelector({ locale, experienceSlug, boats, experienceTitle, experience }: { locale:'fr'|'en'; experienceSlug:string; boats:BoatItem[]; experienceTitle?:string; experience?: { hasFixedTimes?: boolean; fixedDepartureTime?: string | null; fixedReturnTime?: string | null } }) {
  const [selectedBoatId, setSelectedBoatId] = useState<number|undefined>();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{startDate: string, endDate: string} | null>(null);

  const selectedBoat = useMemo(()=> boats.find(b=>b.boatId===selectedBoatId), [boats, selectedBoatId]);
  const totalOptions = useMemo(()=> Object.entries(selectedOptions).reduce((sum,[id, on])=> on? sum + (selectedBoat?.options.find(o=>o.id===Number(id))?.price||0): sum,0), [selectedOptions, selectedBoat]);
  const basePrice = selectedBoat?.priceExperience ?? null; // fallback possible plus tard
  const total = (basePrice||0) + totalOptions;

  const toggleOption = (id:number)=> setSelectedOptions(s=> ({ ...s, [id]: !s[id] }));

  const ctaLabel = locale==='fr'? 'Réserver maintenant':'Book now';

  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow p-5">
      <h2 className="text-base font-extrabold tracking-tight uppercase mb-4 flex items-center gap-2">
        <span>🛥️</span>{locale==='fr'? 'Sélectionnez votre bateau':'Select your boat'}
      </h2>
      {boats.length===0 && <p className="text-xs text-black/50">{locale==='fr'? 'Aucun bateau configuré.':'No boat configured.'}</p>}
      <div className="space-y-3 max-h-72 overflow-auto pr-1">
        {boats.map(b=>{
          const active = b.boatId===selectedBoatId;
          return (
            <button type="button" key={b.boatId} onClick={()=> setSelectedBoatId(b.boatId)} className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 hover:border-[color:var(--primary)]/60 transition ${active? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5 shadow-inner':'border-black/15 bg-white'}`}>
              <div className="relative w-14 h-12 rounded-lg overflow-hidden bg-black/5 shrink-0">
                {b.imageUrl && <Image src={b.imageUrl} alt={b.name} fill className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-black truncate">{b.name}</div>
                <div className="text-[10px] text-black/50 mt-0.5">{b.capacity} pax • {b.speedKn} kn</div>
              </div>
              {b.priceExperience!=null && <div className="text-xs font-semibold text-[color:var(--primary)] whitespace-nowrap">{b.priceExperience}€</div>}
            </button>
          );
        })}
      </div>

      {selectedBoat && (
        <div className="mt-5 border-t border-black/10 pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/60 mb-2">{locale==='fr'? 'Options':'Options'}</h3>
          {selectedBoat.options.length===0 && <p className="text-[11px] text-black/40 mb-2">{locale==='fr'? 'Aucune option pour ce bateau.':'No option for this boat.'}</p>}
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {selectedBoat.options.map(o=>{
              const checked = !!selectedOptions[o.id];
              return (
                <label key={o.id} className={`flex items-center gap-2 text-[11px] px-2 py-2 rounded-lg border cursor-pointer ${checked? 'bg-[color:var(--primary)]/5 border-[color:var(--primary)]':'border-black/15 hover:border-black/30'}`}> 
                  <input type="checkbox" className="accent-[color:var(--primary)]" checked={checked} onChange={()=>toggleOption(o.id)} />
                  <span className="flex-1 font-medium text-black/80">{o.label}</span>
                  {o.price!=null && <span className="text-[10px] font-semibold text-[color:var(--primary)]">+{o.price}€</span>}
                </label>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl bg-[#f5f7fa] border border-black/10 p-4 text-[11px] flex flex-col gap-2">
            <div className="flex justify-between font-semibold"><span>{locale==='fr'? 'Prix base':'Base price'}</span><span>{basePrice!=null? basePrice+' €':'—'}</span></div>
            <div className="flex justify-between"><span>{locale==='fr'? 'Options':'Options'}</span><span>{totalOptions} €</span></div>
            <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-black/10"><span>{locale==='fr'? 'Total':'Total'}</span><span>{total} €</span></div>
          </div>
          
          {/* ÉTAPE 1: Sélection de la date EN PREMIER */}
          {!selectedDate && (
            <div className="mt-4 border-t border-black/10 pt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/60 mb-3">{locale==='fr'? 'Étape 1 : Sélectionnez votre date':'Step 1: Select your date'}</h3>
              <button 
                type="button" 
                onClick={() => setSearchOpen(true)} 
                className="w-full h-11 rounded-full text-sm font-semibold shadow bg-[color:var(--primary)] text-white hover:brightness-110"
              >
                {locale==='fr'? 'Choisir la date':'Choose date'} →
              </button>
            </div>
          )}
          
          {/* ÉTAPE 2: Formulaire d'informations de réservation (après sélection de date) */}
          {selectedDate && (
            <div className="mt-4 border-t border-black/10 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-black/60">{locale==='fr'? 'Étape 2 : Informations de réservation':'Step 2: Booking information'}</h3>
                <button 
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] text-black/50 hover:text-black/70"
                >
                  {locale==='fr'? 'Changer la date':'Change date'}
                </button>
              </div>
              <div className="mb-3 p-2 rounded-lg bg-[color:var(--primary)]/5 border border-[color:var(--primary)]/20 text-[11px]">
                <span className="font-semibold">{locale==='fr'? 'Date sélectionnée':'Selected date'}: </span>
                <span>{selectedDate.startDate}</span>
              </div>
              <ExperienceBookingForm 
                locale={locale}
                hasFixedTimes={experience?.hasFixedTimes || false}
                fixedDepartureTime={experience?.fixedDepartureTime || null}
                fixedReturnTime={experience?.fixedReturnTime || null}
                onSubmit={(data) => {
                  // Les données sont sauvegardées dans sessionStorage par le formulaire
                  // Rediriger vers le checkout avec la date déjà sélectionnée
                  const params = new URLSearchParams();
                  params.set('exp', experienceSlug);
                  params.set('boat', String(selectedBoatId));
                  params.set('part', 'FULL');
                  params.set('start', selectedDate.startDate);
                  params.set('end', selectedDate.endDate);
                  window.location.href = `/booking/experience?${params.toString()}`;
                }} 
              />
              <div className="mt-4">
                <button 
                  type="button" 
                  onClick={()=> {
                    // Vérifier que le formulaire est valide
                    const form = document.getElementById('experience-booking-form') as HTMLFormElement;
                    if (form && !form.checkValidity()) {
                      form.reportValidity();
                      return;
                    }
                    // Déclencher la soumission du formulaire pour sauvegarder les données
                    if (form) {
                      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(submitEvent);
                    }
                  }} 
                  className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full text-sm font-semibold shadow bg-[color:var(--primary)] text-white hover:brightness-110"
                >
                  {ctaLabel} <span className="text-base">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {searchOpen && (
        <div className="fixed inset-0 z-[300] flex items-start md:items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setSearchOpen(false)} />
          <div className="relative w-full max-w-3xl">
            <button onClick={()=>setSearchOpen(false)} className="absolute -top-10 right-0 text-white text-sm bg-black/40 rounded-full px-4 h-10 inline-flex items-center gap-2 hover:bg-black/60">✕ {locale==='fr'? 'Fermer':'Close'}</button>
            <div className="animate-fadeIn rounded-3xl border border-white/15 bg-[#0f1f29]/80 p-5 sm:p-6 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] text-white">
              <h3 className="text-sm font-semibold mb-4">{experienceTitle || (locale==='fr'? 'Sélection date':'Pick date')}</h3>
              <p className="text-[11px] text-white/60 mb-4">{locale==='fr'? 'Choisis la date disponible pour cette expérience (journée unique).':'Pick the available date for this (single-day) experience.'}</p>
              <SearchBar
                labels={{
                  search_city: 'Ville',
                  search_part: 'Créneau',
                  search_part_full: 'Journée',
                  search_part_am: 'Matin',
                  search_part_pm: 'Après-midi',
                  search_start_date: locale==='fr'? 'Date':'Date',
                  search_end_date: 'Fin',
                  search_passengers: 'Pax',
                  search_submit: locale==='fr'? 'Continuer':'Continue',
                  search_hint_city_first: '',
                  search_hint_part_first: '',
                  search_hint_date_required: locale==='fr'? 'Date requise':'Date required',
                  search_help_pick_start_full: locale==='fr'? 'Choisis la date':'Pick the date',
                  search_help_pick_end_full: locale==='fr'? 'Choisis la date':'Pick date',
                  search_help_pick_half: locale==='fr'? 'Choisis la date':'Pick date'
                }}
                onSubmit={(v)=>{
                  // Sauvegarder la date sélectionnée et fermer le modal
                  setSelectedDate({
                    startDate: v.startDate,
                    endDate: v.endDate || v.startDate
                  });
                  setSearchOpen(false);
                }}
                mode="experience"
                experienceSlug={experienceSlug}
                hideCity
                hidePassengers
                partFixed="FULL"
                className="bg-transparent border-0 p-0 shadow-none ring-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
