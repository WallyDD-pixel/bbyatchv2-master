"use client";
import { useState, useEffect, useRef } from 'react';

interface Child {
  age: number;
}

interface Props {
  locale: 'fr' | 'en';
  hasFixedTimes?: boolean;
  fixedDepartureTime?: string | null;
  fixedReturnTime?: string | null;
  onSubmit: (data: {
    departurePort: string;
    preferredTime?: string;
    children: Child[];
    specialRequest: string;
  }) => void;
}

export default function ExperienceBookingForm({ locale, hasFixedTimes = false, fixedDepartureTime = null, fixedReturnTime = null, onSubmit }: Props) {
  const [departurePort, setDeparturePort] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [children, setChildren] = useState<Child[]>([{ age: 0 }]);
  const [specialRequest, setSpecialRequest] = useState('');
  
  // Liste des villes depuis l'API (comme dans SearchBar)
  const [cities, setCities] = useState<string[]>([]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetch('/admin/api/cities')
      .then(res => res.json())
      .then(data => {
        let cityList: string[] = [];
        if (Array.isArray(data.cities)) {
          cityList = data.cities.map((c: any) => c.name);
        }
        // Ajoute 'Autre' s'il n'est pas déjà présent
        if (!cityList.includes('Autre')) {
          cityList.push('Autre');
        }
        setCities(cityList);
      })
      .catch(() => {});
  }, []);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node)
      ) {
        setCityDropdownOpen(false);
      }
    };
    if (cityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [cityDropdownOpen]);

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(cityFilter.toLowerCase())
  );

  const selectCity = (city: string) => {
    setDeparturePort(city);
    setCityFilter(city);
    setCityDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Vérifier que le port est sélectionné
    if (!departurePort || !cities.includes(departurePort)) {
      if (cityInputRef.current) {
        cityInputRef.current.focus();
      }
      return;
    }
    const data = {
      departurePort,
      preferredTime: preferredTime || undefined,
      children: hasChildren ? children.filter(c => c.age > 0) : [],
      specialRequest,
    };
    // Sauvegarder dans sessionStorage pour que le bouton de paiement puisse y accéder
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('experienceBookingData', JSON.stringify(data));
    }
    onSubmit(data);
  };

  const addChild = () => {
    setChildren([...children, { age: 0 }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChildAge = (index: number, age: number) => {
    const updated = [...children];
    updated[index].age = age;
    setChildren(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" id="experience-booking-form">
      {/* Port de départ */}
      <div className="relative">
        <label className="block text-xs font-semibold text-black/70 mb-1.5">
          {locale === 'fr' ? 'Port de départ *' : 'Departure port *'}
        </label>
        <div className="relative">
          <input
            ref={cityInputRef}
            type="text"
            value={departurePort || cityFilter}
            onChange={(e) => {
              const value = e.target.value;
              setCityFilter(value);
              // Si la valeur correspond exactement à une ville, la sélectionner
              if (cities.includes(value)) {
                setDeparturePort(value);
                setCityDropdownOpen(false);
              } else {
                setCityDropdownOpen(true);
                setDeparturePort('');
              }
            }}
            onFocus={() => {
              setCityDropdownOpen(true);
              if (departurePort) {
                setCityFilter(departurePort);
              }
            }}
            className={`w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${
              departurePort ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/5' : 'border-black/15 bg-white'
            }`}
            placeholder={locale === 'fr' ? 'Rechercher un port...' : 'Search a port...'}
          />
          {cityDropdownOpen && filteredCities.length > 0 && (
            <div
              ref={cityDropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-black/15 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              {filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => selectCity(city)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors ${
                    city === departurePort ? 'bg-[color:var(--primary)]/10 font-medium' : ''
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Champ caché pour la validation HTML5 */}
        <input
          type="hidden"
          required
          value={departurePort}
        />
      </div>

      {/* Horaire souhaité (si formule flexible) */}
      {hasFixedTimes && fixedDepartureTime && fixedReturnTime ? (
        <div>
          <label className="block text-xs font-semibold text-black/70 mb-1.5">
            {locale === 'fr' ? 'Horaires fixes' : 'Fixed times'}
          </label>
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-900">
              {locale === 'fr' ? 'Départ' : 'Departure'}: <strong>{fixedDepartureTime}</strong> • {locale === 'fr' ? 'Retour' : 'Return'}: <strong>{fixedReturnTime}</strong>
            </p>
            <p className="mt-1 text-[10px] text-blue-700">
              {locale === 'fr' ? 'Les horaires sont fixes pour cet événement et ne peuvent pas être modifiés' : 'Times are fixed for this event and cannot be modified'}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-black/70 mb-1.5">
            {locale === 'fr' ? 'Horaire souhaité (optionnel)' : 'Preferred time (optional)'}
          </label>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          >
            <option value="">{locale === 'fr' ? 'Sélectionner...' : 'Select...'}</option>
            {(() => {
              const times: string[] = [];
              // Générer les horaires par pas de 15 minutes de 08:00 à 22:00
              for (let h = 8; h <= 22; h++) {
                for (let m = 0; m < 60; m += 15) {
                  if (h === 22 && m > 0) break; // Arrêter à 22:00
                  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  times.push(timeStr);
                }
              }
              return times.map(time => (
                <option key={time} value={time}>{time}</option>
              ));
            })()}
          </select>
          <p className="mt-1 text-[10px] text-black/50">
            {locale === 'fr' ? 'Si la formule est flexible, indiquez votre horaire préféré (créneaux de 15 minutes)' : 'If the formula is flexible, indicate your preferred time (15-minute slots)'}
          </p>
        </div>
      )}

      {/* Enfants à bord */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={hasChildren}
            onChange={(e) => {
              setHasChildren(e.target.checked);
              if (!e.target.checked) {
                setChildren([{ age: 0 }]);
              }
            }}
            className="accent-[var(--primary)]"
          />
          <span className="text-xs font-semibold text-black/70">
            {locale === 'fr' ? 'Présence d\'enfants à bord' : 'Children on board'}
          </span>
        </label>
        {hasChildren && (
          <div className="space-y-2 mt-2">
            {children.map((child, index) => (
              <div key={index} className="flex items-center gap-2">
                <label className="text-xs text-black/60 flex-1">
                  {locale === 'fr' ? `Enfant ${index + 1} - Âge` : `Child ${index + 1} - Age`}
                </label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={child.age || ''}
                  onChange={(e) => updateChildAge(index, parseInt(e.target.value) || 0)}
                  className="w-20 h-9 px-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  placeholder="0"
                />
                <span className="text-xs text-black/50">{locale === 'fr' ? 'ans' : 'years'}</span>
                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="h-9 w-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addChild}
              className="text-xs px-3 py-1.5 rounded-lg border border-black/15 hover:bg-black/5 text-black/70"
            >
              + {locale === 'fr' ? 'Ajouter un enfant' : 'Add a child'}
            </button>
          </div>
        )}
        {hasChildren && (
          <p className="mt-2 text-[10px] text-black/50">
            {locale === 'fr' ? 'Les gilets de sauvetage adaptés seront prévus selon les âges indiqués' : 'Appropriate life jackets will be provided according to the ages indicated'}
          </p>
        )}
      </div>

      {/* Demande spécifique */}
      <div>
        <label className="block text-xs font-semibold text-black/70 mb-1.5">
          {locale === 'fr' ? 'Demande spécifique (optionnel)' : 'Special request (optional)'}
        </label>
        <textarea
          value={specialRequest}
          onChange={(e) => setSpecialRequest(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
          placeholder={locale === 'fr' ? 'Ex: Occasion particulière, allergies, demande personnalisée...' : 'Ex: Special occasion, allergies, custom request...'}
        />
      </div>
      <button
        type="submit"
        className="w-full h-11 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 active:brightness-95 shadow mt-4"
        style={{ display: 'none' }}
      >
        {locale === 'fr' ? 'Enregistrer les informations' : 'Save information'}
      </button>
    </form>
  );
}

