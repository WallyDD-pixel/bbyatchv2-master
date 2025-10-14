"use client";
import { useState, useMemo } from 'react';
import RequestBookingButton from './RequestBookingButton';

interface BoatOption { id:number; label:string; price:number|null; }
interface Props {
  t: Record<string,string>;
  locale: string;
  baseTotal: number|null; // prix de base (sans options) pour le créneau/date choisi
  baseTotalLabel: string; // ex: "2 jours" ou "Matin"
  pricePerDay: number; // pour affichage info complémentaire
  part: 'FULL'|'AM'|'PM';
  nbJours: number; // nombre de jours si FULL
  options: BoatOption[];
  disabled?: boolean;
  disabledMessage?: string;
  slug: string;
  startDate?: string;
  endDate?: string;
}

export default function BoatOptionsAndBooking({ t, locale, baseTotal, baseTotalLabel, pricePerDay, part, nbJours, options, disabled, disabledMessage, slug, startDate, endDate }: Props){
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id:number) => setSelected(s=> { const n=new Set(s); if(n.has(id)) n.delete(id); else n.add(id); return n; });

  const optionsTotal = useMemo(()=>{
    let sum = 0;
    options.forEach(o=>{ if(selected.has(o.id) && o.price!=null) sum += o.price; });
    return sum;
  }, [selected, options]);

  const grandTotal = baseTotal!=null ? baseTotal + optionsTotal : null;

  return (
    <div className='space-y-8'>
      {/* Carte Options */}
      <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold mb-4'>{t.boat_options}</h2>
        {options.length===0 && (
          <p className='text-xs text-black/50 mb-0'>{t.boat_options_coming}</p>
        )}
        {options.length>0 && (
          <ul className='space-y-2 text-sm text-black/70'>
            {options.map(o=>{
              const checked = selected.has(o.id);
              return (
                <li key={o.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border border-black/10 ${checked? 'bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/40':'bg-black/5'}`}> 
                  <label className='flex items-center gap-2 cursor-pointer select-none'>
                    <input type='checkbox' checked={checked} onChange={()=>toggle(o.id)} className='h-4 w-4 accent-[var(--primary)]' />
                    <span className='font-medium'>{o.label}</span>
                  </label>
                  <span className='text-black/60 text-xs'>{o.price!=null? o.price.toLocaleString(locale==='fr'? 'fr-FR':'en-US') + ' €' : (locale==='fr'? 'Inclus':'Included')}</span>
                </li>
              );
            })}
          </ul>
        )}
        {options.length>0 && (
          <div className='mt-3 text-[11px] text-black/50 flex items-center justify-between'>
            <span>{locale==='fr'? 'Total options sélectionnées':'Selected options total'}</span>
            <span className='font-semibold text-black/70'>{optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
          </div>
        )}
      </section>

      {/* Carte Récap + action */}
      <section className='rounded-2xl border border-black/10 bg-gradient-to-br from-[var(--primary)]/10 to-white p-6 shadow-sm flex flex-col gap-4'>
        <div>
          <p className='text-xs uppercase tracking-wide text-black/50 mb-1'>{t.boat_total} {baseTotalLabel}</p>
          <p className='text-3xl font-extrabold text-[var(--primary)]'>{grandTotal!=null? grandTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €':'—'}</p>
          {optionsTotal>0 && baseTotal!=null && (
            <p className='text-[11px] text-black/50 mt-1'>({locale==='fr'? 'Base':'Base'} {baseTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € + {optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € {locale==='fr'? 'options':'options'})</p>
          )}
          {part==='FULL' && nbJours>1 && <p className='text-[11px] text-black/50 mt-1'>Soit {pricePerDay.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} {t.boat_per_day}</p>}
          {part!=='FULL' && baseTotal!=null && <p className='text-[11px] text-black/50 mt-1'>{t.boat_full_day}: {pricePerDay.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</p>}
          {part!=='FULL' && baseTotal==null && <p className='text-[11px] text-red-600 mt-1'>{part==='AM'? t.boat_price_missing_am : t.boat_price_missing_pm}</p>}
        </div>
        {/* Bouton réservation */}
        <RequestBookingButton t={t} locale={locale} slug={slug} hasDates={!!startDate} disabled={disabled} disabledMessage={disabledMessage} startDate={startDate} endDate={endDate} part={part} optionIds={Array.from(selected)} />
        <p className='text-[10px] text-black/40'>{t.boat_request_note}</p>
      </section>
    </div>
  );
}
