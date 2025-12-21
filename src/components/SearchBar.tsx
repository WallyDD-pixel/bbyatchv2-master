"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link';

export type SearchValues = {
  city: string;
  startDate: string;
  endDate: string;
  startTime: string; // compat
  endTime: string;   // compat
  passengers: number;
  waterToys?: 'yes' | 'no';
  childrenCount?: string;
  specialNeeds?: string;
  wantsExcursion?: boolean;
  selectedExperience?: string;
};




type City = { id: string; name: string };

// Remplacement: PARTS ne dépend plus de labels (évite ReferenceError)
const PARTS: { key: "FULL" | "AM" | "PM" | "SUNSET"; start: string; end: string; duration?: string; flexible?: boolean }[] = [
  { key: "FULL", start: "08:00", end: "18:00", duration: "8h", flexible: true },
  { key: "AM", start: "08:00", end: "12:00", duration: "4h", flexible: true },
  { key: "PM", start: "13:00", end: "18:00", duration: "4h", flexible: true },
  { key: "SUNSET", start: "20:00", end: "22:00", duration: "2h", flexible: true },
];

export default function SearchBar({
  labels,
  onSubmit,
  className,
  mode = 'boats',
  experienceSlug,
  hideCity,
  hidePassengers,
  partFixed,
  locale,
  boatSlug,
}: {
  labels: Record<string, string>;
  onSubmit: (values: SearchValues & { part?: string }) => void;
  className?: string;
  mode?: 'boats' | 'experience';
  experienceSlug?: string;
  hideCity?: boolean;
  hidePassengers?: boolean;
  partFixed?: 'FULL'|'AM'|'PM';
  locale?: string;
  boatSlug?: string;
}) {
    // Liste dynamique des villes depuis l'API
    const [cities, setCities] = useState<string[]>([]);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
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
        });
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
  const [values, setValues] = useState<SearchValues>({
    city: mode==='experience'? '': '',
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '18:00',
    passengers: 2,
  });
  const [part, setPart] = useState<"FULL" | "AM" | "PM" | "SUNSET" | null>(partFixed || null);
  const [passengersField, setPassengersField] = useState('2');
  const [otherCityNotice, setOtherCityNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const needsCity = mode !== 'experience';
  const currentLocale = locale || 'fr';
  // Nouveaux champs pour la réservation
  const [waterToys, setWaterToys] = useState<'yes' | 'no' | ''>('');
  const [childrenCount, setChildrenCount] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [wantsExcursion, setWantsExcursion] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  // États pour les expériences associées au bateau
  const [boatExperiences, setBoatExperiences] = useState<any[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<number | null>(null);
  // Horaires flexibles
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  // Récupérer les expériences associées au bateau quand la checkbox est cochée
  useEffect(() => {
    if (wantsExcursion && boatSlug && boatExperiences.length === 0 && !loadingExperiences) {
      setLoadingExperiences(true);
      fetch(`/api/boats/${boatSlug}/experiences`)
        .then(res => res.json())
        .then(data => {
          if (data.experiences) {
            setBoatExperiences(data.experiences);
          }
        })
        .catch(error => {
          console.error('Erreur lors du chargement des expériences:', error);
        })
        .finally(() => {
          setLoadingExperiences(false);
        });
    }
  }, [wantsExcursion, boatSlug]);

  // --- Date picker état ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickingEndDate, setPickingEndDate] = useState(false); // true si on sélectionne la date de fin
  const [calMonth, setCalMonth] = useState(()=>{ const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const [monthCache, setMonthCache] = useState<Map<string,({date:string; boats:number} | {date:string; full:number; amOnly:number; pmOnly:number})[]>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(null); // premier clic plage FULL
  const [partHint, setPartHint] = useState(false);
  const [cityHint, setCityHint] = useState(false); // nouvelle aide ville
  const [dateHint, setDateHint] = useState(false); // nouvelle aide dates
  const popRef = useRef<HTMLDivElement|null>(null);

  const monthKey = (y:number,m:number)=>`${y}-${String(m+1).padStart(2,'0')}`;
  const fmtDate = (d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // État pour stocker le boatId quand boatSlug est fourni
  const [boatId, setBoatId] = useState<number | null>(null);
  
  // Récupérer le boatId à partir du boatSlug
  useEffect(() => {
    if (boatSlug && !boatId) {
      fetch(`/api/boats/${boatSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            setBoatId(data.id);
          }
        })
        .catch(() => { /* ignore */ });
    }
  }, [boatSlug, boatId]);

  const ensureMonth = useCallback(async (y:number,m:number)=>{
    const key = monthKey(y,m);
    if (monthCache.has(key)) return;
    setLoadingMonth(true);
    try {
      const first = new Date(y,m,1);
      const last = new Date(y,m+1,0);
      if(mode==='experience' && experienceSlug){
        const res = await fetch(`/api/experiences/${experienceSlug}/availability?from=${fmtDate(first)}&to=${fmtDate(last)}`);
        const data = await res.json();
        const slots: any[] = data.slots || [];
        const map: Record<string,{date:string; full:number; amOnly:number; pmOnly:number}> = {};
        for(const s of slots){
          const d = s.date.slice(0,10);
            if(!map[d]) map[d] = { date:d, full:0, amOnly:0, pmOnly:0 };
            if(s.status==='available'){
              if(s.part==='FULL') map[d].full = 1; else if(s.part==='AM') { if(map[d].full===0) map[d].amOnly = 1; } else if(s.part==='PM'){ if(map[d].full===0) map[d].pmOnly = 1; }
            }
        }
        const days = Object.values(map);
        setMonthCache(prev=>{ const n = new Map(prev); n.set(key, days); return n; });
      } else {
        // Ajouter boatId à la requête si disponible
        const url = boatId 
          ? `/api/availability/days?from=${fmtDate(first)}&to=${fmtDate(last)}&boatId=${boatId}`
          : `/api/availability/days?from=${fmtDate(first)}&to=${fmtDate(last)}`;
        const res = await fetch(url);
        const data = await res.json();
        setMonthCache(prev=>{ const n = new Map(prev); n.set(key, data.days||[]); return n; });
      }
    } catch { /* ignore */ } finally { setLoadingMonth(false); }
  },[monthCache, mode, experienceSlug, boatId]);

  useEffect(()=>{ ensureMonth(calMonth.y, calMonth.m); },[calMonth, ensureMonth]);

  // Fermeture sur clic extérieur / Escape
  useEffect(()=>{
    if (!pickerOpen) return;
    const onDown = (e:MouseEvent)=>{ if(popRef.current && !popRef.current.contains(e.target as Node)) setPickerOpen(false); };
    const onKey = (e:KeyboardEvent)=>{ if(e.key==='Escape') setPickerOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return ()=>{ window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  },[pickerOpen]);

  const avail = monthCache.get(monthKey(calMonth.y, calMonth.m)) || [];
  const availMap = new Map(avail.map((d:any)=>[d.date,d]));

  const buildMonthMatrix = () => {
    const { y, m } = calMonth; const first = new Date(y,m,1); const startWeekday = (first.getDay()+6)%7; // lundi=0
    const daysInMonth = new Date(y,m+1,0).getDate();
    const cells: { key:string; label:number|string; date?:string; boats?:number; stats?: any }[] = [];
    for(let i=0;i<startWeekday;i++) cells.push({ key:'e'+i, label:'' });
    for(let d=1; d<=daysInMonth; d++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const stats:any = availMap.get(dateStr);
      cells.push({ key: dateStr, label:d, date:dateStr, stats });
    }
    return cells;
  };
  const monthCells = buildMonthMatrix();
  const monthLabel = new Date(calMonth.y, calMonth.m).toLocaleDateString('fr-FR',{month:'long', year:'numeric'});
  const todayStr = fmtDate(new Date());
  const todayObj = new Date();
  const isCurrentMonth = calMonth.y===todayObj.getFullYear() && calMonth.m===todayObj.getMonth();

  const applyPart = (p: "FULL" | "AM" | "PM" | "SUNSET") => {
    const def = PARTS.find((x) => x.key === p)!;
    setValues((v) => ({
      ...v,
      startTime: customStartTime || def.start,
      endTime: customEndTime || def.end,
      endDate: (p === "FULL" || p === "SUNSET") ? v.endDate : v.startDate,
    }));
    setPart(p);
    setTempStart(null);
    // Réinitialiser les horaires personnalisés si on change de créneau
    if (!def.flexible) {
      setCustomStartTime('');
      setCustomEndTime('');
    }
  };

  const update = (key: keyof SearchValues, val: string | number) =>
    setValues((v) => {
      const next: any = { ...v, [key]: val };
      if (key === "startDate" && part && part !== "FULL" && part !== "SUNSET") {
        next.endDate = val; // impose même jour pour AM/PM
      }
      // Ne jamais modifier startDate quand on change endDate
      // (sauf si endDate devient antérieure à startDate, alors on ajuste startDate)
      if (key === "endDate" && part === "FULL" && typeof val === "string" && v.startDate) {
        if (val < v.startDate) {
          // Si la date de fin est antérieure à la date de début, on ajuste la date de début
          next.startDate = val;
        }
        // Sinon, on garde startDate tel quel
      }
      return next;
    });

  const openPicker = () => {
    const hasCity = mode==='experience'? true : values.city.trim().length>0;
    if(!hasCity){ setCityHint(true); return; }
    if (!part && !partFixed) { setPartHint(true); return; }
    const ref = values.startDate || values.endDate || fmtDate(new Date());
    const d = new Date(ref + 'T00:00:00');
    setCalMonth({ y: d.getFullYear(), m: d.getMonth() });
    setPickerOpen(true);
  };

  // Lock scroll lorsqu'on ouvre le modal calendrier
  useEffect(()=>{
    if(pickerOpen){
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return ()=>{ document.body.style.overflow = prev; };
    }
  },[pickerOpen]);

  // --- Helpers sélection (restaurés) ---
  const inSelectedRange = (d: string) => {
    if (!values.startDate) return false;
    const start = values.startDate;
    const end = values.endDate || values.startDate;
    return d >= start && d <= end;
  };
  const selectDay = (d: string) => {
    setDateHint(false);
    if (part === 'FULL' || part === 'SUNSET') {
      if (!tempStart) {
        // Premier clic: on initialise la plage
        // Si on a déjà une date de début, on l'utilise comme tempStart
        if (values.startDate && values.startDate !== d) {
          setTempStart(values.startDate);
          // Si la date cliquée est après la date de début, c'est la date de fin
          if (d > values.startDate) {
            setValues(v => ({ ...v, endDate: d }));
          } else {
            // Si la date cliquée est avant ou égale, on remplace les deux
            setValues(v => ({ ...v, startDate: d, endDate: d }));
            setTempStart(d);
          }
        } else {
          // Pas de date de début définie, on initialise avec cette date
          setTempStart(d);
          setValues(v => ({ ...v, startDate: d, endDate: d }));
        }
      } else {
        // Second clic: on fixe la plage complète
        if (tempStart === d) {
          // Même jour re-clic: reste une journée
          setValues(v => ({ ...v, startDate: d, endDate: d }));
          setTempStart(null);
          return;
        }
        const start = tempStart < d ? tempStart : d;
        const end = tempStart < d ? d : tempStart;
        // Ne jamais modifier startDate si elle est déjà définie et que la nouvelle date est après
        // Sauf si la nouvelle date est avant, alors on ajuste
        setValues(v => {
          const newStart = start < v.startDate ? start : v.startDate;
          const newEnd = end > (v.endDate || v.startDate) ? end : (v.endDate || v.startDate);
          return { ...v, startDate: newStart, endDate: newEnd };
        });
        setTempStart(null);
      }
    } else {
      // Demi-journée: toujours un seul jour
      setValues(v => ({ ...v, startDate: d, endDate: d }));
      setTempStart(null);
    }
  };

  const baseInput =
    // Light mode: solid white input with dark text; Dark mode: subtle translucent with white text
    "w-full h-12 rounded-lg border px-3 text-sm bg-white text-slate-900 placeholder:text-slate-500 \
     dark:bg-white/10 dark:text-white dark:placeholder:text-white/60 backdrop-blur-sm \
     border-black/15 dark:border-white/15 \
     focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30 dark:focus:ring-white/40 \
     focus:border-[color:var(--primary)]/50 dark:focus:border-white/80 shadow-inner transition";

  // Détecter si on est dans un modal (pas de padding/border/background)
  const isInModal = className?.includes('bg-transparent') || className?.includes('border-0');
  
  return (
    <form
      className={`relative w-full grid ${isInModal ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'} gap-3 sm:gap-4 items-end
      ${isInModal ? '' : 'rounded-2xl p-4 sm:p-5 border shadow-[0_4px_28px_-6px_rgba(0,0,0,0.25)] bg-gradient-to-br from-white/55 via-white/35 to-white/25 dark:from-[#1c2a35]/70 dark:via-[#1c2a35]/55 dark:to-[#1c2a35]/35 backdrop-blur-xl border-white/60 dark:border-white/10 ring-1 ring-[color:var(--primary)]/15'}
      ${className ?? ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (mode!=='experience' && !values.city.trim()) { setCityHint(true); return; }
        if (!part && !partFixed) { setPartHint(true); return; }
        if (!values.startDate) { setDateHint(true); return; }
        let pax = parseInt(passengersField || '0', 10);
        if (!pax || pax < 1) pax = 1;
        if (pax !== values.passengers) setValues(v=>({...v, passengers: pax }));
        setIsSubmitting(true);
        try {
          await Promise.resolve(onSubmit({ 
            ...values, 
            passengers: pax, 
            part: partFixed || part || undefined,
            waterToys: mode === 'boats' && waterToys ? (waterToys as 'yes' | 'no') : undefined,
            childrenCount: mode === 'boats' ? childrenCount : undefined,
            specialNeeds: mode === 'boats' ? specialNeeds : undefined,
            wantsExcursion: mode === 'boats' ? wantsExcursion : undefined,
            selectedExperience: mode === 'boats' && selectedExperience ? String(selectedExperience) : undefined,
          }));
        } finally {
          setIsSubmitting(false);
        }
        setPickerOpen(false);
      }}
    >
      {/* Ville (cachée en mode expérience) */}
      {!hideCity && mode!=='experience' && (
        <div className="col-span-1">
          <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
            {labels.search_city}{" "}
            <span className="text-[10px] font-normal text-black dark:text-white">
              (non restrictif)
            </span>
          </label>
          <div className="relative" ref={cityDropdownRef}>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50 z-10">
              📍
            </span>
            <input
              ref={cityInputRef}
              type="text"
              className={`${baseInput} pl-9 pr-9`}
              placeholder={labels.search_city}
              value={values.city}
              onChange={(e) => { 
                update("city", e.target.value); 
                if(e.target.value.trim()) setCityHint(false);
                setCityDropdownOpen(true);
              }}
              onFocus={() => {
                if (cities.length > 0) {
                  setCityDropdownOpen(true);
                }
              }}
              autoComplete="off"
            />
            {/* Icône de dropdown */}
            <button
              type="button"
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60 z-10"
              tabIndex={-1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!values.city.trim() && cityHint && <p className="mt-1 text-[10px] text-red-600">{labels.search_hint_city_first}</p>}
            {/* Dropdown personnalisé */}
            {cityDropdownOpen && cities.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1c2a35] border border-black/15 dark:border-white/20 rounded-lg shadow-lg z-[10000] max-h-60 overflow-y-auto">
                {cities
                  .filter(city => 
                    !values.city || 
                    city.toLowerCase().includes(values.city.toLowerCase())
                  )
                  .map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        update("city", city);
                        setCityDropdownOpen(false);
                        setCityHint(false);
                        cityInputRef.current?.blur();
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {city}
                    </button>
                  ))}
                {cities.filter(city => 
                  !values.city || 
                  city.toLowerCase().includes(values.city.toLowerCase())
                ).length === 0 && (
                  <div className="px-4 py-2 text-sm text-black/50 dark:text-white/50">
                    Aucune ville trouvée
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Suppression du bloc slug / créneau explicatif en mode expérience */}
      {mode==='experience' && partFixed && (
        <div className="hidden" />
      )}
      {/* Sélecteur de créneau uniquement si pas de partFixed */}
      {(!partFixed) && (
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
            {labels.search_part || "Créneau"}
          </label>
          <select
            className={`${baseInput} search-part-select bg-white text-slate-900 border-black/15 focus:ring-[color:var(--primary)]/30 focus:border-[color:var(--primary)] \
            dark:bg-black/60 dark:text-white dark:border-white/40 dark:focus:ring-white/60 dark:focus:border-white shadow-[0_0_0_1px_rgba(0,0,0,0.03)]`}
              value={part ?? ''}
            onChange={(e) => { const v = e.target.value as any; if(!v) { setPart(null); return; } applyPart(v);} }
          >
            <option value="" disabled>{labels.search_part || 'Créneau'}...</option>
            {PARTS.map((p) => {
              let lbl = '';
              if (p.key === 'FULL') lbl = labels.search_part_full || 'Journée entière (8h)';
              else if (p.key === 'AM') lbl = labels.search_part_am || 'Matin (4h)';
              else if (p.key === 'PM') lbl = labels.search_part_pm || 'Après-midi (4h)';
              else if (p.key === 'SUNSET') lbl = labels.search_part_sunset || 'Sunset (2h)';
              return <option key={p.key} value={p.key}>{lbl} {p.flexible ? '(horaires flexibles)' : ''}</option>;
            })}
          </select>
        </div>
      )}
      
      {/* Horaires personnalisés si créneau flexible et sélectionné */}
      {part && PARTS.find(p => p.key === part)?.flexible && (
        <div className="col-span-full grid grid-cols-2 gap-3 pt-2 border-t border-black/10">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
              {labels.search_custom_start_time || (currentLocale === 'fr' ? 'Heure de début (optionnel)' : 'Start time (optional)')}
            </label>
            <input
              type="time"
              value={customStartTime}
              onChange={(e) => {
                setCustomStartTime(e.target.value);
                if (e.target.value) {
                  setValues(v => ({ ...v, startTime: e.target.value }));
                }
              }}
              className={baseInput}
              placeholder={PARTS.find(p => p.key === part)?.start}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
              {labels.search_custom_end_time || (currentLocale === 'fr' ? 'Heure de fin (optionnel)' : 'End time (optional)')}
            </label>
            <input
              type="time"
              value={customEndTime}
              onChange={(e) => {
                setCustomEndTime(e.target.value);
                if (e.target.value) {
                  setValues(v => ({ ...v, endTime: e.target.value }));
                }
              }}
              className={baseInput}
              placeholder={PARTS.find(p => p.key === part)?.end}
            />
          </div>
          <p className="col-span-2 text-[10px] text-black/50 dark:text-white/50">
            {labels.search_flexible_hours_note || (currentLocale === 'fr' 
              ? 'Les horaires sont flexibles. Laissez vide pour utiliser les horaires par défaut.'
              : 'Hours are flexible. Leave empty to use default hours.')}
          </p>
        </div>
      )}
      
      {/* Date début */}
      <div>
        <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
          {labels.search_start_date}
        </label>
        <input
          type="text"
          readOnly
          onClick={() => openPicker(false)}
          onFocus={() => openPicker(false)}
          placeholder={needsCity ? (!values.city.trim()? 'Choisir la ville' : (!part? 'Choisir un créneau d\'abord' : 'Sélectionner...')) : (!part? 'Choisir un créneau' : 'Sélectionner...')}
          className={baseInput + ' ' + ((!part || (needsCity && !values.city.trim()))? 'opacity-50 cursor-not-allowed':'cursor-pointer')}
          value={values.startDate}
          disabled={!part || (needsCity && !values.city.trim())}
        />
        {dateHint && !values.startDate && <p className="mt-1 text-[10px] text-red-600">Choisis une date.</p>}
      </div>
      {/* Date fin (multi-jours seulement si FULL) */}
      <div>
        <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
          {labels.search_end_date}
          {(part !== "FULL" && part !== "SUNSET") && (
            <span className="text-[10px] font-normal text-black dark:text-white">(= début)</span>
          )}
        </label>
        <input
          type="text"
          readOnly
          onClick={()=> (part==='FULL' || part==='SUNSET') && openPicker(true)}
          onFocus={()=> (part==='FULL' || part==='SUNSET') && openPicker(true)}
          placeholder={(part==='FULL' || part==='SUNSET')? (needsCity ? (!values.city.trim()? 'Choisir la ville' : 'Sélectionner...') : 'Sélectionner...') : (!part? '' : values.startDate? values.startDate : '')}
          className={baseInput + ' ' + ((!part || (needsCity && !values.city.trim()))? 'opacity-50 cursor-not-allowed': ((part !== "FULL" && part !== "SUNSET") ? "opacity-60" : "cursor-pointer"))}
          value={values.endDate}
          disabled={!part || (needsCity && !values.city.trim()) || (part !== "FULL" && part !== "SUNSET")}
        />
      </div>
      {/* Passagers (caché en mode expérience) */}
      {!hidePassengers && mode!=='experience' && (
        <div>
          <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85">
            {labels.search_passengers}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={baseInput}
            value={passengersField}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D+/g,'')
              const cleaned = raw.replace(/^0+(\d)/,'$1');
              setPassengersField(cleaned);
              setValues(v=>({...v, passengers: cleaned? parseInt(cleaned,10): 0 }));
            }}
            onBlur={()=>{
              if(passengersField==='') { setPassengersField('1'); setValues(v=>({...v, passengers:1 })); }
            }}
            placeholder="1"
          />
        </div>
      )}
      
      {/* Champs supplémentaires pour la réservation (uniquement en mode boats) */}
      {mode === 'boats' && values.startDate && (
        <div className="col-span-full space-y-4 pt-4 border-t border-black/10">
          <button
            type="button"
            onClick={() => setShowAdditionalFields(!showAdditionalFields)}
            className="text-sm font-medium text-[var(--primary)] hover:underline flex items-center gap-2"
          >
            <span>{labels.search_additional_info || (currentLocale === 'fr' ? 'Informations complémentaires' : 'Additional information')}</span>
            <span>{showAdditionalFields ? '▼' : '▶'}</span>
          </button>
          
          {showAdditionalFields && (
            <div className="space-y-4 pl-4 border-l-2 border-[var(--primary)]/20">
              {/* Jeux d'eau */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-800 dark:text-white/85">
                  {labels.search_water_toys || (currentLocale === 'fr' ? 'Jeux d\'eau' : 'Water Toys')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="waterToys"
                      value="yes"
                      checked={waterToys === 'yes'}
                      onChange={(e) => setWaterToys(e.target.value as 'yes')}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="text-sm">{labels.search_yes || (currentLocale === 'fr' ? 'Oui' : 'Yes')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="waterToys"
                      value="no"
                      checked={waterToys === 'no'}
                      onChange={(e) => setWaterToys(e.target.value as 'no')}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="text-sm">{labels.search_no || (currentLocale === 'fr' ? 'Non' : 'No')}</span>
                  </label>
                </div>
                {waterToys === 'yes' && (
                  <p className="text-xs text-black/60 dark:text-white/60 mt-2 leading-relaxed">
                    {labels.search_water_toys_note || (currentLocale === 'fr' 
                      ? 'Nous pouvons nous occuper de la réservation des jeux d\'eau mais le prix ne sera pas calculé avec. Merci de nous indiquer dans le champ commentaire le/les jeux souhaités '
                      : 'We can handle the water toys reservation but the price will not be calculated with it. Please indicate in the comment field the desired toy(s) ')}
                    <a 
                      href={labels.search_water_toys_url || 'https://example.com/water-toys'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline font-medium"
                    >
                      ({labels.search_link || (currentLocale === 'fr' ? 'Lien' : 'Link')})
                    </a>
                  </p>
                )}
              </div>

              {/* Nombre d'enfants */}
              <div>
                <label htmlFor="childrenCount" className="block text-sm font-medium text-slate-800 dark:text-white/85 mb-2">
                  {labels.search_children_count || (currentLocale === 'fr' 
                    ? 'Nombre d\'enfants à bord' 
                    : 'Number of children on board')}
                </label>
                <input
                  type="number"
                  id="childrenCount"
                  min="0"
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(e.target.value.replace(/\D/g, ''))}
                  className={baseInput}
                  placeholder="0"
                />
                <p className="text-xs text-black/50 dark:text-white/50 mt-1">
                  {labels.search_children_note || (currentLocale === 'fr' 
                    ? 'Afin de prévoir les gilets de sauvetage adaptés'
                    : 'To provide appropriate life jackets')}
                </p>
              </div>

              {/* Besoin supplémentaire */}
              <div>
                <label htmlFor="specialNeeds" className="block text-sm font-medium text-slate-800 dark:text-white/85 mb-2">
                  {labels.search_special_needs || (currentLocale === 'fr' 
                    ? 'Besoin supplémentaire' 
                    : 'Additional needs')}
                </label>
                <textarea
                  id="specialNeeds"
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  className={`${baseInput} min-h-[100px] resize-y`}
                  placeholder={labels.search_special_needs_placeholder || (currentLocale === 'fr' 
                    ? 'Si besoin particulier, merci de nous l\'indiquer ici...'
                    : 'If you have any special needs, please let us know here...')}
                />
              </div>

              {/* Excursion (si journée entière ou demi-journée) */}
              {(part === 'FULL' || part === 'AM' || part === 'PM') && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantsExcursion}
                      onChange={(e) => {
                        setWantsExcursion(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedExperience(null);
                        }
                      }}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="text-sm font-medium text-slate-800 dark:text-white/85">
                      {labels.search_wants_excursion || (currentLocale === 'fr' 
                        ? 'Souhaitez-vous compléter avec une excursion ?'
                        : 'Would you like to add an excursion?')}
                    </span>
                  </label>

                  {/* Affichage des expériences disponibles */}
                  {wantsExcursion && (
                    <div className="ml-6 space-y-3">
                      {loadingExperiences && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/70">
                          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                          {currentLocale === 'fr' ? 'Chargement des expériences...' : 'Loading experiences...'}
                        </div>
                      )}

                      {!loadingExperiences && boatExperiences.length === 0 && (
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">ℹ️</span>
                            <p className="text-sm font-medium text-slate-700 dark:text-white/80">
                              {currentLocale === 'fr' 
                                ? 'Aucune expérience associée'
                                : 'No associated experiences'}
                            </p>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                            {currentLocale === 'fr' 
                              ? 'Ce bateau n\'a pas d\'expériences spécifiques associées. Vous pouvez néanmoins réserver le bateau seul ou consulter nos expériences générales sur la page principale.'
                              : 'This boat has no specific associated experiences. You can still book the boat alone or check our general experiences on the main page.'}
                          </p>
                        </div>
                      )}

                      {!loadingExperiences && boatExperiences.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-700 dark:text-white/80 mb-2">
                            {currentLocale === 'fr' 
                              ? 'Expériences disponibles :'
                              : 'Available experiences:'}
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {boatExperiences.map((exp) => (
                              <label key={exp.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-white/20 hover:border-[var(--primary)]/50 cursor-pointer transition-colors">
                                <input
                                  type="radio"
                                  name="experience"
                                  value={exp.id}
                                  checked={selectedExperience === exp.id}
                                  onChange={(e) => setSelectedExperience(Number(e.target.value))}
                                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-medium text-slate-800 dark:text-white/90">
                                      {currentLocale === 'fr' ? exp.titleFr : exp.titleEn}
                                    </h4>
                                    {exp.price && (
                                      <span className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full">
                                        {exp.price}€
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-white/70 line-clamp-2">
                                    {currentLocale === 'fr' ? exp.descFr : exp.descEn}
                                  </p>
                                  {(exp.timeFr || exp.timeEn) && (
                                    <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                                      ⏱️ {currentLocale === 'fr' ? exp.timeFr : exp.timeEn}
                                    </p>
                                  )}
                                  {exp.hasFixedTimes && exp.fixedDepartureTime && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      🕐 {currentLocale === 'fr' ? 'Horaires fixes' : 'Fixed schedule'}: {exp.fixedDepartureTime}
                                      {exp.fixedReturnTime && ` - ${exp.fixedReturnTime}`}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Submit */}
      <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end pt-1">
        <button
          type="submit"
          disabled={((!values.city.trim() && needsCity) || !part || !values.startDate) || isSubmitting}
          className={`rounded-full px-6 h-12 text-sm font-semibold text-white bg-[var(--primary)] hover:brightness-110 active:brightness-95 transition shadow-sm flex items-center justify-center gap-2 ${((!values.city.trim() && needsCity) || !part || !values.startDate || isSubmitting)? 'opacity-40 cursor-not-allowed hover:brightness-100': ''}`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Chargement...</span>
            </>
          ) : (
            labels.search_submit
          )}
        </button>
      </div>

      {/* Overlay plein écran pour focus */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[180] bg-black/65 backdrop-blur-md animate-fadeIn" onClick={()=>setPickerOpen(false)} />
      )}
      {/* Popover calendrier */}
      {pickerOpen && part && (mode==='experience' || values.city.trim()) && (
        <div className="fixed inset-0 z-[200] flex items-start lg:items-center justify-center pt-24 sm:pt-32 lg:pt-0 px-4">
          <div ref={popRef} className="relative w-full max-w-2xl p-6 sm:p-7 rounded-3xl card-popover text-slate-900 dark:text-slate-100 border dark:border-white/10 shadow-[0_24px_80px_-18px_rgba(0,0,0,0.6)] animate-fadeIn max-h-[85vh] overflow-auto">
            <button type="button" onClick={()=>setPickerOpen(false)} className="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10">✕</button>
            <div className="flex items-center justify-between mb-4">
              <button type="button" disabled={isCurrentMonth} onClick={()=>setCalMonth(m=>{ const nm = m.m-1; return { y: nm<0? m.y-1 : m.y, m: (nm+12)%12 }; })} className={`text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/80 hover:bg-white/10 ${isCurrentMonth? 'opacity-30 cursor-not-allowed':''}`}>←</button>
              <div className="text-sm font-semibold tracking-wide uppercase text-white">{monthLabel}</div>
              <button type="button" onClick={()=>setCalMonth(m=>{ const nm = m.m+1; return { y: nm>11? m.y+1 : m.y, m: nm%12 }; })} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/80 hover:bg-white/10">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-white/60 mb-1">
              {['L','Ma','Me','J','V','S','D'].map(d=> <div key={d}>{d}</div> )}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center select-none">
              {monthCells.map(c=> {
                const selected = c.date && inSelectedRange(c.date);
                const isStart = !!c.date && values.startDate && c.date===values.startDate;
                const isEnd = !!c.date && values.endDate && c.date===values.endDate;
                const stats:any = c.stats;
                const past = !!c.date && c.date < todayStr; // passé
                const isReserved = !!(stats && stats.reserved); // jour réservé pour ce bateau
                let clickable = false;
                if (c.date && !past && !isReserved) {
                  // Si on sélectionne la date de fin, vérifier que la date est après la date de début
                  if (pickingEndDate && values.startDate && c.date < values.startDate) {
                    clickable = false;
                  } else if (!stats && !tempStart) {
                    clickable = false;
                  } else if (part === 'FULL' || part === 'SUNSET') {
                    const anyAvail = !!(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                    if (!tempStart) {
                      // Si on sélectionne la date de fin, la date doit être >= date de début ET avoir des disponibilités
                      if (pickingEndDate) {
                        clickable = anyAvail && (!values.startDate || c.date >= values.startDate);
                      } else {
                        clickable = anyAvail;
                      }
                    } else {
                      const aDate = new Date(tempStart+'T00:00:00');
                      const bDate = new Date(c.date+'T00:00:00');
                      const diff = Math.abs((bDate.getTime()-aDate.getTime())/86400000)+1;
                      clickable = diff <= 6 && anyAvail; // autoriser si au moins une demi-journée dispo
                    }
                  } else if (part === 'AM') {
                    clickable = !!(stats && (stats.full > 0 || stats.amOnly > 0));
                  } else if (part === 'PM') {
                    clickable = !!(stats && (stats.full > 0 || stats.pmOnly > 0));
                  }
                }
                // Indisponible si jour futur mais pas clickable OU réservé
                let unavailable = false;
                if (c.date && !past) {
                  // Jour réservé = toujours indisponible
                  if (isReserved) {
                    unavailable = true;
                  } else if (pickingEndDate && values.startDate && c.date < values.startDate) {
                    // Si on sélectionne la date de fin, les jours avant la date de début sont indisponibles
                    unavailable = true;
                  } else if (part === 'FULL') {
                    unavailable = !(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                  } else if (part === 'AM') {
                    unavailable = !(stats && (stats.full>0 || stats.amOnly>0));
                  } else if (part === 'PM') {
                    unavailable = !(stats && (stats.full>0 || stats.pmOnly>0));
                  }
                }
                let bgClass = 'text-white/30';
                if (past) {
                  bgClass = ' bg-white/5 text-white/30 line-through';
                } else if (isReserved) {
                  // Jour réservé = rouge vif pour bien le distinguer
                  bgClass = ' bg-red-500/30 border-2 border-red-500/60 text-red-100 font-bold';
                } else if (unavailable) {
                  bgClass = ' bg-red-400/15 border border-red-400/40 text-red-200';
                } else if (stats) {
                  if (part === 'FULL') {
                    if (stats.full>0) bgClass = ' bg-emerald-300/20 border border-emerald-300/50 text-emerald-200 font-semibold';
                    else if (stats.amOnly>0 || stats.pmOnly>0) bgClass = ' bg-amber-300/20 border border-amber-300/50 text-amber-200 font-semibold';
                  } else if (part === 'AM') {
                    if (stats.full>0) bgClass = ' bg-emerald-300/20 border border-emerald-300/50 text-emerald-200 font-semibold';
                    else if (stats.amOnly>0) bgClass = ' bg-sky-300/20 border border-sky-300/50 text-sky-200 font-semibold';
                  } else if (part === 'PM') {
                    if (stats.full>0) bgClass = ' bg-emerald-300/20 border border-emerald-300/50 text-emerald-200 font-semibold';
                    else if (stats.pmOnly>0) bgClass = ' bg-fuchsia-300/20 border border-fuchsia-300/50 text-fuchsia-200 font-semibold';
                  }
                } else if (part==='FULL' && tempStart && c.date) {
                  const aDate = new Date(tempStart+'T00:00:00');
                  const bDate = new Date(c.date+'T00:00:00');
                  const diff = Math.abs((bDate.getTime()-aDate.getTime())/86400000)+1;
                  if (diff<=6) bgClass = ' bg-amber-300/15 border border-amber-300/40 text-amber-200';
                }
                return (
                  <div key={c.key}
                    className={`sb-day relative h-11 rounded-lg text-[11px] flex items-center justify-center font-medium transition-colors
                    ${c.date? (clickable? 'cursor-pointer':'') : ''}
                    ${bgClass}
                    ${selected && !past? ' selected-range ' : ''}
                    ${isStart? ' range-start ' : ''}
                    ${isEnd? ' range-end ' : ''}`}
                    onClick={()=>{ if(!c.date) return; if(!clickable) return; selectDay(c.date); }}
                  >
                    {c.label || ''}
                    {stats && !past && !unavailable && (part==='FULL' || part==='SUNSET') && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0) && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-[#0f1f29]/90 border border-white/10 leading-none">{stats.full + stats.amOnly + stats.pmOnly}</span>
                    )}
                    {stats && !past && !unavailable && part==='AM' && clickable && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-[#0f1f29]/90 border border-white/10 leading-none">{stats.full + stats.amOnly}</span>
                    )}
                    {stats && !past && !unavailable && part==='PM' && clickable && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-[#0f1f29]/90 border border-white/10 leading-none">{stats.full + stats.pmOnly}</span>
                    )}
                    {!stats && c.date && !past && !unavailable && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-black/65 text-white/80 leading-none">—</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 text-[9px] leading-tight text-white/70">
              {part==='FULL' && (
                <span className="px-2 py-1 rounded bg-emerald-300/20 border border-emerald-300/40 text-emerald-200 font-semibold">Journée complète</span>
              )}
              {part==='AM' && (
                <>
                  <span className="px-2 py-1 rounded bg-emerald-300/20 border border-emerald-300/40 text-emerald-200 font-semibold">Full</span>
                  <span className="px-2 py-1 rounded bg-sky-300/20 border border-sky-300/40 text-sky-200 font-semibold">AM seul</span>
                </>
              )}
              {part==='PM' && (
                <>
                  <span className="px-2 py-1 rounded bg-emerald-300/20 border border-emerald-300/40 text-emerald-200 font-semibold">Full</span>
                  <span className="px-2 py-1 rounded bg-fuchsia-300/20 border border-fuchsia-300/40 text-fuchsia-200 font-semibold">PM seul</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-5 gap-4">
              <p className="text-[10px] text-white/60 flex-1">{(part==='FULL' || part==='SUNSET')? (tempStart? labels.search_help_pick_end_full : labels.search_help_pick_start_full) : labels.search_help_pick_half}.</p>
              <div className="flex items-center gap-2">
                {values.startDate && <button type="button" onClick={()=>{ setValues(v=>({...v,startDate:'', endDate:''})); setTempStart(null); }} className="text-[10px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80">Reset</button>}
                <button type="button" onClick={()=>setPickerOpen(false)} className="text-[11px] px-4 py-2 rounded-full bg-[var(--primary)] text-white font-semibold hover:brightness-110">OK</button>
              </div>
            </div>
            {loadingMonth && <div className="absolute inset-0 rounded-3xl bg-black/70 backdrop-blur-sm flex items-center justify-center text-[11px] font-medium text-white">Chargement...</div>}
          </div>
        </div>
      )}
      {!part && partHint && mode!=='experience' && !partFixed && (
        <div className="absolute -bottom-5 left-0 w-full text-[10px] text-center text-red-600 font-medium translate-y-full">{labels.search_hint_part_first}</div>
      )}
      {!values.city.trim() && cityHint && mode!=='experience' && (
        <div className="absolute -bottom-5 left-0 w-full text-[10px] text-center text-red-600 font-medium translate-y-full">{labels.search_hint_city_first}</div>
      )}
      {part && !values.startDate && dateHint && (
        <div className="absolute -bottom-5 left-0 w-full text-[10px] text-center text-red-600 font-medium translate-y-full">{labels.search_hint_date_required}</div>
      )}
      {otherCityNotice && (
        <div className="col-span-full mt-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-[11px] flex flex-col gap-2">
          <p><strong>Ville « Autre » sélectionnée :</strong> nous avons besoin de plus d’informations sur le port / la zone souhaitée avant d’afficher les disponibilités.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/autre-ville" className="px-3 py-1.5 rounded bg-[color:var(--primary)] text-white text-[11px] font-medium hover:brightness-110">Remplir le formulaire</Link>
            <button type="button" onClick={()=> setOtherCityNotice(false)} className="px-3 py-1.5 rounded border text-[11px] hover:bg-black/5">Fermer</button>
          </div>
        </div>
      )}
    </form>
  );
}

/* Style global pour options du select créneau */
if (typeof document !== 'undefined') {
  const id = '__part_select_style__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Light mode */
      :root .search-part-select { background:#ffffff !important; color:#0f172a !important; }
      :root .search-part-select option { background:#ffffff; color:#0f172a; }
      /* Dark mode */
      .dark .search-part-select { background:#0d1a22 !important; color:#ffffff !important; }
      .dark .search-part-select option { background:#0d1a22; color:#ffffff; }
    `;
    document.head.appendChild(style);
  }
  const id2 = '__searchbar_extra_style__';
  if(!document.getElementById(id2)) {
    const style2 = document.createElement('style');
    style2.id = id2;
    style2.textContent = `.sb-day.selected-range{position:relative;} .sb-day.selected-range:before{content:'';position:absolute;inset:0;border-radius:0.75rem;background:linear-gradient(135deg,var(--primary) 0%,var(--primary) 100%);opacity:0.10;} .sb-day.range-start:after,.sb-day.range-end:after{content:'';position:absolute;inset:0;border-radius:0.75rem;box-shadow:0 0 0 2px var(--primary) inset,0 0 0 1px var(--primary);opacity:0.9;} .sb-day.range-start.range-end:before{opacity:0.22;} .sb-day:hover{filter:brightness(1.15);} `;
    document.head.appendChild(style2);
  }
}
