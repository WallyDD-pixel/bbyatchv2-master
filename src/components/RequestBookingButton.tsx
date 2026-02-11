"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar, { type SearchValues } from './SearchBar';

interface AdditionalInfo {
  waterToys: 'yes' | 'no' | '';
  childrenCount: string;
  specialNeeds: string;
  wantsExcursion: boolean;
}

interface Props {
  t: Record<string,string>;
  locale: string;
  slug: string;
  hasDates: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  startDate?: string;
  endDate?: string;
  part?: 'FULL'|'AM'|'PM';
  optionIds?: number[]; // nouvelles options sélectionnées
  needsSkipper?: boolean;
  additionalInfo?: AdditionalInfo;
  departurePort?: string;
}

export default function RequestBookingButton({ t, locale, slug, hasDates, disabled, disabledMessage, startDate, endDate, part='FULL', optionIds, needsSkipper, additionalInfo, departurePort }: Props){
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = (vals: SearchValues & { part?: string; selectedExperience?: string }) => {
    if (disabled) return; // sécurité
    if (!vals.startDate) return;
    const params = new URLSearchParams();
    params.set('lang', locale);
    params.set('boat', slug);
    params.set('start', vals.startDate);
    if (vals.part === 'FULL' && vals.endDate) params.set('end', vals.endDate);
    // Envoyer AM pour demi-journée (HALF) afin que le checkout affiche et facture le prix demi-journée
    if (vals.part) params.set('part', vals.part === 'HALF' ? 'AM' : vals.part);
    if (vals.passengers) params.set('pax', String(vals.passengers));
    if (optionIds && optionIds.length) params.set('opts', optionIds.join(','));
    if (needsSkipper) params.set('skipper', '1');
    if (vals.wantsExcursion) params.set('excursion', '1');
    if (vals.selectedExperience) params.set('experience', vals.selectedExperience);
    if (vals.waterToys === 'yes') params.set('waterToys', '1');
    if (vals.childrenCount) params.set('children', vals.childrenCount);
    if (vals.specialNeeds) params.set('specialNeeds', encodeURIComponent(vals.specialNeeds));
    if (vals.city) params.set('departurePort', vals.city);
    router.push(`/checkout?${params.toString()}`);
    setOpen(false);
  };

  const buildDirectCheckout = () => {
    const params = new URLSearchParams();
    params.set('lang', locale);
    params.set('boat', slug);
    if (startDate) params.set('start', startDate);
    if (part) params.set('part', part);
    if (part==='FULL' && endDate) params.set('end', endDate);
    if (optionIds && optionIds.length) params.set('opts', optionIds.join(','));
    if (needsSkipper) params.set('skipper', '1');
    // Ajouter les informations complémentaires
    if (additionalInfo) {
      if (additionalInfo.waterToys === 'yes') params.set('waterToys', '1');
      if (additionalInfo.childrenCount) params.set('children', additionalInfo.childrenCount);
      if (additionalInfo.specialNeeds) params.set('specialNeeds', encodeURIComponent(additionalInfo.specialNeeds));
      if (additionalInfo.wantsExcursion) params.set('excursion', '1');
    }
    if (departurePort) params.set('departurePort', departurePort);
    return `/checkout?${params.toString()}`;
  };

  const baseBtnClasses = 'h-12 rounded-full text-sm font-semibold focus:outline-none focus-visible:ring-2 transition-colors px-6';
  const enabledClasses = 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow focus-visible:ring-blue-500/60';
  const disabledClasses = 'bg-gray-200 text-gray-400 cursor-not-allowed';

  const formatDate = (d?: string) => {
    if(!d) return '';
    const parts = d.split('-');
    if (parts.length!==3) return d;
    const [y,m,dd] = parts;
    return locale==='fr' ? `${dd}/${m}` : `${m}/${dd}`;
  };
  const partLabel = part==='FULL'? t.search_part_full : part==='AM'? t.search_part_am : t.search_part_pm;
  const dateDisplay = hasDates && startDate ? (part==='FULL' && endDate && endDate!==startDate ? `${formatDate(startDate)} → ${formatDate(endDate)}` : formatDate(startDate)) : '';

  return (
    <>
      <button
        className={`${baseBtnClasses} ${disabled? disabledClasses : enabledClasses}`}
        onClick={(e)=>{ if(disabled){ e.preventDefault(); return; } if(!hasDates){ e.preventDefault(); setOpen(true);} else { router.push(buildDirectCheckout()); } }}
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled? (disabledMessage || '') : undefined}
      >
        <span>{t.boat_request_cta}</span>
      </button>
      <p className='text-[10px] text-black/40 leading-relaxed'>
        {disabled && disabledMessage ? disabledMessage : (dateDisplay ? dateDisplay + (part? ' • '+partLabel : '') : t.boat_request_note)}
      </p>
      {open && !disabled && (
        <div className='fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4' onClick={(e) => { if(e.target === e.currentTarget) setOpen(false); }}>
          <div className='w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-black/10 p-6 sm:p-8 relative z-[201] max-h-[90vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-xl font-semibold mb-1'>{t.boat_request_modal_title}</h3>
                <p className='text-xs text-black/50'>{t.boat_request_modal_subtitle}</p>
              </div>
              <button 
                onClick={()=>setOpen(false)} 
                className='h-8 w-8 rounded-full flex items-center justify-center text-black/50 hover:text-black hover:bg-black/5 transition'
                aria-label={t.boat_request_modal_close}
              >
                ✕
              </button>
            </div>
            <div className='relative z-[202]'>
              <SearchBar labels={t} onSubmit={handleSubmit} className='bg-transparent border-0 shadow-none p-0' locale={locale} boatSlug={slug} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
