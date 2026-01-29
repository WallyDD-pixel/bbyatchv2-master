"use client";
import { useEffect, useState } from 'react';
import { messages, type Locale } from '@/i18n/messages';

interface Option {
  id: number;
  label: string;
  price: number | null;
}

interface Props {
  locale: Locale;
  basePrice: number;
  options: Option[];
  dayCount: number;
  fullDay: boolean;
}

function money(v: number | null | undefined, locale: Locale) {
  if (v == null) return '—';
  return (v / 1).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €';
}

export default function ExperiencePriceClient({ locale, basePrice, options, dayCount, fullDay }: Props) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [totalOptions, setTotalOptions] = useState(0);
  const [total, setTotal] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Récupérer les options sélectionnées depuis sessionStorage
    const selectedOptionsStr = sessionStorage.getItem('experienceSelectedOptions');
    if (selectedOptionsStr) {
      try {
        const ids = JSON.parse(selectedOptionsStr);
        setSelectedOptionIds(ids);
      } catch (e) {
        console.error('Error parsing selected options', e);
      }
    }
  }, []);

  useEffect(() => {
    // Calculer le total des options sélectionnées
    const optionsTotal = selectedOptionIds.reduce((sum, id) => {
      const option = options.find(o => o.id === id);
      return sum + (option?.price || 0);
    }, 0);
    setTotalOptions(optionsTotal);

    // Calculer le prix de base pour les jours
    const basePriceForDays = fullDay ? basePrice * dayCount : Math.round(basePrice * 0.55);
    
    // Total = prix base + options
    const totalPrice = basePriceForDays + optionsTotal;
    setTotal(totalPrice);
    
    // Calculer l'acompte (20%) et le reste
    const depositAmount = Math.round(totalPrice * 0.2);
    setDeposit(depositAmount);
    setRemaining(totalPrice - depositAmount);
  }, [selectedOptionIds, basePrice, options, dayCount, fullDay]);

  const selectedOptions = options.filter(o => selectedOptionIds.includes(o.id));

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold mb-4">{locale === 'fr' ? 'Prix' : 'Price'}</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{locale === 'fr' ? 'Base' : 'Base'}</span>
          <span>{money(basePrice, locale)}</span>
        </div>
        {fullDay && dayCount > 1 && (
          <div className="flex justify-between text-xs mt-1 text-black/60">
            <span>x {dayCount} {locale === 'fr' ? 'jours' : 'days'}</span>
            <span>{money(basePrice * dayCount, locale)}</span>
          </div>
        )}
        {!fullDay && (
          <div className="text-[10px] text-black/50 mt-1">
            {locale === 'fr' ? 'Tarif demi-journée estimé (55%)' : 'Half-day estimated (55%)'}
          </div>
        )}
        {selectedOptions.length > 0 && (
          <>
            <div className="border-t border-black/10 my-2" />
            <div className="text-xs text-black/60 mb-1">
              {locale === 'fr' ? 'Options sélectionnées:' : 'Selected options:'}
            </div>
            {selectedOptions.map(opt => (
              <div key={opt.id} className="flex justify-between text-xs text-black/70">
                <span>• {opt.label}</span>
                <span>+{money(opt.price, locale)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs mt-1">
              <span>{locale === 'fr' ? 'Total options' : 'Total options'}</span>
              <span>{money(totalOptions, locale)}</span>
            </div>
          </>
        )}
        <div className="border-t border-black/10 my-3" />
        <div className="flex justify-between font-semibold text-sm">
          <span>{locale === 'fr' ? 'Total' : 'Total'}</span>
          <span>{money(total, locale)}</span>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span>{locale === 'fr' ? 'Acompte (20%)' : 'Deposit (20%)'}</span>
          <span>{money(deposit, locale)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>{locale === 'fr' ? 'Reste' : 'Remaining'}</span>
          <span>{money(remaining, locale)}</span>
        </div>
      </div>
    </div>
  );
}
