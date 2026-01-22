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
  isAgency?: boolean;
  skipperRequired?: boolean;
  skipperPrice?: number;
}

interface AdditionalInfo {
  waterToys: 'yes' | 'no' | '';
  childrenCount: string;
  specialNeeds: string;
  wantsExcursion: boolean;
}

export default function BoatOptionsAndBooking({ t, locale, baseTotal, baseTotalLabel, pricePerDay, part, nbJours, options, disabled, disabledMessage, slug, startDate, endDate, isAgency = false, skipperRequired = false, skipperPrice = 350 }: Props){
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [needsSkipper, setNeedsSkipper] = useState(skipperRequired && !isAgency); // Si obligatoire et pas agence, coché par défaut
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>({
    waterToys: '',
    childrenCount: '',
    specialNeeds: '',
    wantsExcursion: false,
  });

  const toggle = (id:number) => setSelected(s=> { const n=new Set(s); if(n.has(id)) n.delete(id); else n.add(id); return n; });

  const optionsTotal = useMemo(()=>{
    let sum = 0;
    options.forEach(o=>{ if(selected.has(o.id) && o.price!=null) sum += o.price; });
    return sum;
  }, [selected, options]);

  // Calcul du prix du skipper
  const skipperTotal = useMemo(() => {
    if (!skipperRequired) return 0;
    if (isAgency && !needsSkipper) return 0; // Si agence et skipper non nécessaire, pas de coût
    // Si notre skipper (obligatoire ou agence qui en a besoin) = 350 HT sans TVA
    const days = part === 'FULL' ? nbJours : 1;
    return skipperPrice * days;
  }, [skipperRequired, isAgency, needsSkipper, skipperPrice, part, nbJours]);

  const grandTotal = baseTotal!=null ? baseTotal + optionsTotal + skipperTotal : null;

  return (
    <div className='space-y-8'>
      {/* Informations complémentaires - Déplacé en premier pour meilleure visibilité */}
      <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Informations complémentaires' : 'Additional Information'}</h2>
        <div className='space-y-4'>
          {/* Nombre d'enfants */}
          <div>
            <label className='block text-sm font-medium text-black/80 mb-1.5'>
              {locale === 'fr' ? 'Nombre d\'enfants à bord' : 'Number of children on board'}
            </label>
            <input
              type='number'
              min='0'
              value={additionalInfo.childrenCount}
              onChange={(e) => setAdditionalInfo(prev => ({ ...prev, childrenCount: e.target.value }))}
              className='w-full h-10 rounded-lg border border-black/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'
              placeholder={locale === 'fr' ? 'Ex: 2' : 'Ex: 2'}
            />
          </div>

          {/* Jeux d'eau */}
          <div>
            <label className='block text-sm font-medium text-black/80 mb-1.5'>
              {locale === 'fr' ? 'Réservation de jeux d\'eau' : 'Water toys reservation'}
            </label>
            <div className='flex gap-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='waterToys'
                  checked={additionalInfo.waterToys === 'yes'}
                  onChange={() => setAdditionalInfo(prev => ({ ...prev, waterToys: 'yes' }))}
                  className='h-4 w-4 accent-blue-600'
                />
                <span className='text-sm'>{locale === 'fr' ? 'Oui' : 'Yes'}</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='waterToys'
                  checked={additionalInfo.waterToys === 'no'}
                  onChange={() => setAdditionalInfo(prev => ({ ...prev, waterToys: 'no' }))}
                  className='h-4 w-4 accent-blue-600'
                />
                <span className='text-sm'>{locale === 'fr' ? 'Non' : 'No'}</span>
              </label>
            </div>
          </div>

          {/* Excursion */}
          <div>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={additionalInfo.wantsExcursion}
                onChange={(e) => setAdditionalInfo(prev => ({ ...prev, wantsExcursion: e.target.checked }))}
                className='h-4 w-4 accent-blue-600'
              />
              <span className='text-sm font-medium text-black/80'>
                {locale === 'fr' ? 'Souhaitez-vous une excursion ?' : 'Would you like an excursion?'}
              </span>
            </label>
          </div>

          {/* Besoins spéciaux */}
          <div>
            <label className='block text-sm font-medium text-black/80 mb-1.5'>
              {locale === 'fr' ? 'Besoins spéciaux ou demandes particulières' : 'Special needs or particular requests'}
            </label>
            <textarea
              value={additionalInfo.specialNeeds}
              onChange={(e) => setAdditionalInfo(prev => ({ ...prev, specialNeeds: e.target.value }))}
              rows={3}
              className='w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none'
              placeholder={locale === 'fr' ? 'Décrivez vos besoins particuliers...' : 'Describe your particular needs...'}
            />
          </div>
        </div>
      </section>

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

      {/* Gestion du Skipper pour les agences */}
      {isAgency && skipperRequired && (
        <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
          <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Skipper' : 'Skipper'}</h2>
          <div className='space-y-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={needsSkipper}
                onChange={(e) => setNeedsSkipper(e.target.checked)}
                className='h-4 w-4 accent-[var(--primary)]'
              />
              <div className='flex-1'>
                <span className='text-sm font-medium text-black/80'>
                  {locale === 'fr' 
                    ? 'Besoin d\'un skipper'
                    : 'Need a skipper'}
                </span>
                <p className='text-xs text-black/50 mt-0.5'>
                  {locale === 'fr' 
                    ? 'Si notre skipper = 350€ HT/jour (sans TVA). Si skipper de l\'agence = Aucun coût supplémentaire.'
                    : 'If our skipper = 350€ HT/day (no VAT). If agency skipper = No additional cost.'}
                </p>
              </div>
            </label>
            {needsSkipper && (
              <div className='ml-7 text-sm text-black/70 bg-blue-50 rounded-lg px-3 py-2'>
                <span className='font-medium'>{locale === 'fr' ? 'Skipper BB SERVICES' : 'BB SERVICES Skipper'}: </span>
                <span>{skipperPrice}€ HT {locale === 'fr' ? 'par jour' : 'per day'} × {part === 'FULL' ? nbJours : 1} = {skipperTotal}€ HT</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Carte Récap + action */}
      <section className='rounded-2xl border border-black/10 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm flex flex-col gap-4'>
        <div>
          {isAgency ? (
            <>
              <p className='text-xs uppercase tracking-wide text-black/50 mb-1'>{locale === 'fr' ? 'Prix agence' : 'Agency price'} {baseTotalLabel}</p>
              <p className='text-3xl font-extrabold text-blue-600'>{grandTotal!=null? grandTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €':'—'}</p>
            </>
          ) : (
            <>
              <p className='text-xs uppercase tracking-wide text-black/50 mb-1'>{t.boat_total} {baseTotalLabel}</p>
              <p className='text-3xl font-extrabold text-blue-600'>{grandTotal!=null? grandTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €':'—'}</p>
            </>
          )}
          {(optionsTotal>0 || skipperTotal>0) && baseTotal!=null && (
            <p className='text-[11px] text-black/50 mt-1'>
              ({locale==='fr'? 'Base':'Base'} {baseTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €
              {optionsTotal > 0 && ` + ${optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € ${locale==='fr'? 'options':'options'}`}
              {skipperTotal > 0 && ` + ${skipperTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € ${locale==='fr'? 'skipper':'skipper'}`})
            </p>
          )}
          {part==='FULL' && nbJours>1 && (
            <p className='text-[11px] text-black/50 mt-1'>
              {locale === 'fr' ? 'Soit' : 'That is'} {pricePerDay.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} {t.boat_per_day}
            </p>
          )}
          {part!=='FULL' && baseTotal!=null && (
            <p className='text-[11px] text-black/50 mt-1'>
              {locale === 'fr' ? 'Prix à partir de' : 'Price from'} {baseTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € ({locale === 'fr' ? 'demi-journée' : 'half-day'})
            </p>
          )}
          {part!=='FULL' && baseTotal==null && <p className='text-[11px] text-red-600 mt-1'>{part==='AM'? t.boat_price_missing_am : t.boat_price_missing_pm}</p>}
        </div>
        {/* Bouton réservation */}
        <RequestBookingButton 
          t={t} 
          locale={locale} 
          slug={slug} 
          hasDates={!!startDate} 
          disabled={disabled} 
          disabledMessage={disabledMessage} 
          startDate={startDate} 
          endDate={endDate} 
          part={part} 
          optionIds={Array.from(selected)}
          needsSkipper={needsSkipper}
          additionalInfo={additionalInfo}
        />
      </section>
    </div>
  );
}
