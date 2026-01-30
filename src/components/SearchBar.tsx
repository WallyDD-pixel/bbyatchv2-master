"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link';
import TimePicker from './TimePicker';

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
// Simplifié : Journée complète et Demi-journée (plus de distinction AM/PM)
const PARTS: { key: "FULL" | "HALF" | "SUNSET"; start: string; end: string; duration?: string; flexible?: boolean }[] = [
  { key: "FULL", start: "08:00", end: "18:00", duration: "8h", flexible: true },
  { key: "HALF", start: "09:00", end: "13:00", duration: "4h", flexible: true }, // Demi-journée flexible
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
  partFixed?: 'FULL'|'AM'|'PM'|'SUNSET';
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
  const [part, setPart] = useState<"FULL" | "HALF" | "SUNSET" | null>(
    partFixed === 'AM' || partFixed === 'PM' ? 'HALF' : (partFixed || null)
  );
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
  const [calMonth, setCalMonth] = useState(()=>{ const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const [monthCache, setMonthCache] = useState<Map<string,({date:string; boats:number} | {date:string; full:number; amOnly:number; pmOnly:number})[]>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(null); // premier clic plage FULL
  const [availableBoatsForStartDate, setAvailableBoatsForStartDate] = useState<number[]>([]); // IDs des bateaux disponibles pour la date de début
  const [loadingEndDates, setLoadingEndDates] = useState(false); // Chargement des dates de fin
  const [endDateAvailability, setEndDateAvailability] = useState<Map<string, boolean>>(new Map()); // Cache des dates de fin disponibles
  const [partHint, setPartHint] = useState(false);
  const [cityHint, setCityHint] = useState(false); // nouvelle aide ville
  const [dateHint, setDateHint] = useState(false); // nouvelle aide dates
  const popRef = useRef<HTMLDivElement|null>(null);

  const monthKey = (y:number,m:number)=>`${y}-${String(m+1).padStart(2,'0')}`;
  const fmtDate = (d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

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
              // Note: HALF utilise AM ou PM (géré dans la logique de disponibilité)
            }
        }
        const days = Object.values(map);
        setMonthCache(prev=>{ const n = new Map(prev); n.set(key, days); return n; });
      } else {
        // Si boatSlug est fourni, utiliser l'API spécifique au bateau
        const apiUrl = boatSlug 
          ? `/api/boats/${boatSlug}/availability?from=${fmtDate(first)}&to=${fmtDate(last)}`
          : `/api/availability/days?from=${fmtDate(first)}&to=${fmtDate(last)}`;
        console.log(`[SearchBar] Fetching availability from: ${apiUrl}`);
        console.log(`[SearchBar] Month being loaded: ${y}-${String(m+1).padStart(2,'0')}, first day: ${fmtDate(first)}, last day: ${fmtDate(last)}`);
        const res = await fetch(apiUrl);
        const data = await res.json();
        console.log(`[SearchBar] Received data:`, { 
          daysCount: data.days?.length || 0, 
          error: data.error, 
          sampleDays: data.days?.slice(0, 5),
          allDates: data.days?.map((d:any) => d.date)
        });
        
        // Vérifier si les dates correspondent
        if (data.days && data.days.length > 0) {
          const expectedDates: string[] = [];
          let cur = new Date(first);
          while (cur <= last) {
            expectedDates.push(fmtDate(cur));
            cur = new Date(cur.getTime() + 86400000);
          }
          const receivedDates = data.days.map((d:any) => d.date);
          const missingDates = expectedDates.filter(d => !receivedDates.includes(d));
          const extraDates = receivedDates.filter((d: string) => !expectedDates.includes(d));
          if (missingDates.length > 0 || extraDates.length > 0) {
            console.log(`[SearchBar] Date mismatch! Missing:`, missingDates.slice(0, 5), `Extra:`, extraDates.slice(0, 5));
          }
        }
        
        setMonthCache(prev=>{ const n = new Map(prev); n.set(key, data.days||[]); return n; });
      }
    } catch { /* ignore */ } finally { setLoadingMonth(false); }
  },[monthCache, mode, experienceSlug, boatSlug]);

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

  const applyPart = (p: "FULL" | "HALF" | "SUNSET") => {
    const def = PARTS.find((x) => x.key === p)!;
    let endTime = customEndTime || def.end;
    // Pour HALF, calculer automatiquement l'heure de fin si heure de début est définie (durée max 4h)
    if (p === "HALF" && customStartTime) {
      const [startHour, startMin] = customStartTime.split(':').map(Number);
      const endHour = (startHour + 4) % 24;
      endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    }
    setValues((v) => ({
      ...v,
      startTime: customStartTime || def.start,
      endTime: endTime,
      endDate: (p === "FULL" || p === "SUNSET") ? v.endDate : v.startDate,
    }));
    setPart(p);
    setTempStart(null);
    // Réinitialiser les horaires personnalisés si on change de créneau non flexible
    if (!def.flexible) {
      setCustomStartTime('');
      setCustomEndTime('');
    }
  };

  const update = (key: keyof SearchValues, val: string | number) =>
    setValues((v) => {
      const next: any = { ...v, [key]: val };
      if (key === "startDate" && part && part !== "FULL" && part !== "SUNSET") {
        next.endDate = val; // impose même jour pour HALF
      }
      return next;
    });

  const openPicker = () => {
    const hasCity = mode==='experience'? true : values.city.trim().length>0;
    if(!hasCity){ setCityHint(true); return; }
    // Vérifier que le créneau est sélectionné (sauf si partFixed)
    if(!partFixed && !part){ setPartHint(true); return; }
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

  // Charger les bateaux disponibles pour la date de début
  const loadAvailableBoatsForStartDate = useCallback(async (startDate: string) => {
    if (!startDate || mode === 'experience') return;
    setLoadingEndDates(true);
    try {
      const partParam = part === 'FULL' ? 'FULL' : part === 'HALF' ? 'AM' : 'AM'; // Utiliser AM comme fallback pour HALF
      const res = await fetch(`/api/availability/boats?from=${startDate}&to=${startDate}&part=${partParam}`);
      if (res.ok) {
        const data = await res.json();
        const boatIds = (data.boats || []).map((b: any) => b.id);
        setAvailableBoatsForStartDate(boatIds);
        console.log(`[SearchBar] Bateaux disponibles pour ${startDate}:`, boatIds);
      } else {
        setAvailableBoatsForStartDate([]);
      }
    } catch (e) {
      console.error('[SearchBar] Erreur lors du chargement des bateaux disponibles:', e);
      setAvailableBoatsForStartDate([]);
    } finally {
      setLoadingEndDates(false);
    }
  }, [mode, part]);

  // Vérifier si une date de fin est disponible pour les bateaux de la date de début
  // Cette fonction vérifie que les bateaux disponibles à la date de début sont aussi disponibles
  // pour TOUTE la plage (du début à la fin), en tenant compte des réservations
  const checkEndDateAvailability = useCallback(async (endDate: string): Promise<boolean> => {
    if (!tempStart || availableBoatsForStartDate.length === 0 || mode === 'experience') return true;
    
    // Vérifier le cache
    if (endDateAvailability.has(endDate)) {
      return endDateAvailability.get(endDate) || false;
    }

    try {
      const partParam = part === 'FULL' ? 'FULL' : part === 'HALF' ? 'AM' : 'AM';
      const start = tempStart < endDate ? tempStart : endDate;
      const end = tempStart < endDate ? endDate : tempStart;
      
      // Appeler l'API qui vérifie la disponibilité pour TOUTE la plage
      // L'API exclut automatiquement les bateaux réservés pour n'importe quel jour de la plage
      const res = await fetch(`/api/availability/boats?from=${start}&to=${end}&part=${partParam}`);
      if (res.ok) {
        const data = await res.json();
        const availableBoatIds = (data.boats || []).map((b: any) => b.id);
        // Vérifier si au moins un bateau de la date de début est disponible pour TOUTE la plage
        // (c'est-à-dire qu'il n'est pas réservé pour aucun jour de la plage)
        const isAvailable = availableBoatIds.some((id: number) => availableBoatsForStartDate.includes(id));
        console.log(`[SearchBar] Vérification plage ${start} → ${end}: ${isAvailable ? 'disponible' : 'indisponible'} (bateaux disponibles: ${availableBoatIds.length}, bateaux de début: ${availableBoatsForStartDate.length})`);
        setEndDateAvailability(prev => {
          const next = new Map(prev);
          next.set(endDate, isAvailable);
          return next;
        });
        return isAvailable;
      }
    } catch (e) {
      console.error('[SearchBar] Erreur lors de la vérification de la date de fin:', e);
    }
    return false;
  }, [tempStart, availableBoatsForStartDate, part, mode, endDateAvailability]);

  const selectDay = async (d: string, stats?: { full: number; amOnly: number; pmOnly: number }) => {
    setDateHint(false);
    
    // Si on a sélectionné "Journée complète" mais que la date n'a que des demi-journées disponibles,
    // changer automatiquement le créneau à "Demi-journée"
    if ((part === 'FULL' || part === 'SUNSET') && stats && stats.full === 0 && (stats.amOnly > 0 || stats.pmOnly > 0)) {
      if (!partFixed) {
        applyPart('HALF');
      }
    }
    
    if (part === 'FULL' || part === 'SUNSET') {
      if (!tempStart) {
        // Premier clic: on initialise la plage et charge les bateaux disponibles
        setTempStart(d);
        setValues(v => ({ ...v, startDate: d, endDate: d }));
        setEndDateAvailability(new Map()); // Réinitialiser le cache
        await loadAvailableBoatsForStartDate(d);
      } else {
        // Second clic: on fixe la plage complète
        if (tempStart === d) {
          // Même jour re-clic: reste une journée
          setValues(v => ({ ...v, startDate: d, endDate: d }));
          setTempStart(null);
          setAvailableBoatsForStartDate([]);
          setEndDateAvailability(new Map());
          return;
        }
        const start = tempStart < d ? tempStart : d;
        const end = tempStart < d ? d : tempStart;
        
        // Vérifier si la date de fin est disponible pour les bateaux de la date de début
        setLoadingEndDates(true);
        const isAvailable = await checkEndDateAvailability(end);
        setLoadingEndDates(false);
        
        if (!isAvailable && availableBoatsForStartDate.length > 0) {
          // Afficher un message d'erreur ou empêcher la sélection
          alert(currentLocale === 'fr' ? 'Aucun bateau disponible pour cette plage de dates' : 'No boat available for this date range');
          return;
        }
        
        setValues(v => ({ ...v, startDate: start, endDate: end }));
        setTempStart(null);
        setAvailableBoatsForStartDate([]);
        setEndDateAvailability(new Map());
      }
    } else {
      // Demi-journée: toujours un seul jour
      setValues(v => ({ ...v, startDate: d, endDate: d }));
      setTempStart(null);
      setAvailableBoatsForStartDate([]);
      setEndDateAvailability(new Map());
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
      {/* Suppression du bloc slug / créneau explicatif en mode expérience */}
      {mode==='experience' && partFixed && (
        <div className="hidden" />
      )}
      
      {/* Ville de départ - EN PREMIER (nécessaire pour débloquer le calendrier) */}
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
      
      {/* Sélecteur de créneau - EN DEUXIÈME (nécessaire pour débloquer le calendrier) */}
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
              if (p.key === 'FULL') lbl = labels.search_part_full || 'Journée complète (8h)';
              else if (p.key === 'HALF') lbl = labels.search_part_half || 'Demi-journée (4h)';
              else if (p.key === 'SUNSET') lbl = labels.search_part_sunset || 'Sunset (2h)';
              return <option key={p.key} value={p.key}>{lbl} {p.flexible ? '(horaires flexibles)' : ''}</option>;
            })}
          </select>
        </div>
      )}
      
      {/* Date début - APRÈS ville et créneau */}
      <div>
        <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85 [.card-popover_&]:text-white">
          {labels.search_start_date}
        </label>
        <input
          type="text"
          readOnly
          onClick={openPicker}
          onFocus={openPicker}
          placeholder={needsCity ? (!values.city.trim()? 'Choisir la ville' : (!part && !partFixed ? 'Choisir le créneau' : 'Sélectionner...')) : (!part && !partFixed ? 'Choisir le créneau' : 'Sélectionner...')}
          className={baseInput + ' ' + ((needsCity && !values.city.trim()) || (!part && !partFixed) ? 'opacity-50 cursor-not-allowed':'cursor-pointer')}
          value={values.startDate}
          disabled={(needsCity && !values.city.trim()) || (!part && !partFixed)}
        />
        {dateHint && !values.startDate && <p className="mt-1 text-[10px] text-red-600">Choisis une date.</p>}
      </div>
      {/* Date fin (multi-jours seulement si FULL) */}
      <div>
        <label className="block text-xs font-medium mb-1 text-slate-800 dark:text-white/85 [.card-popover_&]:text-white">
          {labels.search_end_date}
          {(part !== "FULL" && part !== "SUNSET") && (
            <span className="text-[10px] font-normal text-black dark:text-white [.card-popover_&]:text-white/80">(= début)</span>
          )}
        </label>
        <input
          type="text"
          readOnly
          onClick={()=> openPicker()}
          onFocus={()=> openPicker()}
          placeholder={(part==='FULL' || part==='SUNSET' || !part)? (needsCity ? (!values.city.trim()? 'Choisir la ville' : (!part && !partFixed ? 'Choisir le créneau' : 'Sélectionner...')) : (!part && !partFixed ? 'Choisir le créneau' : 'Sélectionner...')) : (values.startDate? values.startDate : '')}
          className={baseInput + ' ' + ((needsCity && !values.city.trim()) || (!part && !partFixed) ? 'opacity-50 cursor-not-allowed': ((part !== "FULL" && part !== "SUNSET" && part) ? "opacity-60" : "cursor-pointer"))}
          value={values.endDate}
          disabled={!!((needsCity && !values.city.trim()) || (!part && !partFixed) || (part && part !== "FULL" && part !== "SUNSET"))}
        />
      </div>
      
      {/* Horaires personnalisés si créneau flexible et sélectionné (pas pour expériences - horaires demandés dans le formulaire après) */}
      {part && PARTS.find(p => p.key === part)?.flexible && mode !== 'experience' && (
        <div className="col-span-full grid grid-cols-2 gap-3 pt-2 border-t border-black/10">
          <TimePicker
            label={labels.search_custom_start_time || (currentLocale === 'fr' ? 'Heure de début' : 'Start time')}
            value={customStartTime}
            onChange={(startTime) => {
              setCustomStartTime(startTime);
              if (startTime && part === 'HALF') {
                // Calculer automatiquement l'heure de fin (début + 4h)
                const [startHour, startMin] = startTime.split(':').map(Number);
                const endHour = (startHour + 4) % 24;
                const endTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
                setCustomEndTime(endTime);
                setValues(v => ({ ...v, startTime: startTime, endTime: endTime }));
              } else if (startTime) {
                setValues(v => ({ ...v, startTime: startTime }));
              }
            }}
            placeholder={PARTS.find(p => p.key === part)?.start}
            min={(() => {
              const selectedPart = PARTS.find(p => p.key === part);
              return selectedPart?.start || '00:00';
            })()}
            max={(() => {
              const selectedPart = PARTS.find(p => p.key === part);
              if (selectedPart?.key === 'FULL') return '18:00';
              if (selectedPart?.key === 'HALF') return '13:00';
              if (selectedPart?.key === 'SUNSET') return '22:00';
              return '23:59';
            })()}
            partType={part as 'FULL' | 'HALF' | 'SUNSET'}
            isStartTime={true}
          />
          <TimePicker
            label={labels.search_custom_end_time || (currentLocale === 'fr' ? 'Heure de fin' : 'End time')}
            value={customEndTime}
            onChange={(endTime) => {
              setCustomEndTime(endTime);
              if (endTime) {
                setValues(v => ({ ...v, endTime: endTime }));
              }
            }}
            placeholder={PARTS.find(p => p.key === part)?.end}
            disabled={part === 'HALF' && !!customStartTime}
            min={(() => {
              if (part === 'HALF' && customStartTime) {
                // Pour HALF, l'heure de fin est calculée automatiquement
                return customStartTime;
              }
              const selectedPart = PARTS.find(p => p.key === part);
              return selectedPart?.start || '00:00';
            })()}
            max={(() => {
              const selectedPart = PARTS.find(p => p.key === part);
              return selectedPart?.end || '23:59';
            })()}
            partType={part as 'FULL' | 'HALF' | 'SUNSET'}
            isStartTime={false}
          />
          <p className="col-span-2 text-[10px] text-black/50 dark:text-white/50">
            {part === 'HALF' 
              ? (labels.search_half_day_note || (currentLocale === 'fr' 
                  ? 'Pour une demi-journée, choisissez votre heure de début. La durée sera de 4 heures (ex: 9h-13h, 10h-14h, etc.).'
                  : 'For a half-day, choose your start time. Duration will be 4 hours (e.g., 9am-1pm, 10am-2pm, etc.).'))
              : (labels.search_flexible_hours_note || (currentLocale === 'fr' 
                  ? 'Les horaires sont flexibles. Laissez vide pour utiliser les horaires par défaut.'
                  : 'Hours are flexible. Leave empty to use default hours.'))}
          </p>
        </div>
      )}
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
      
      {/* Suppression du bouton "Informations complémentaires" - sera sur la page de réservation du bateau */}
      
      {/* Submit */}
      <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end pt-1">
        <button
          type="submit"
          disabled={((!values.city.trim() && needsCity) || !part || !values.startDate) || isSubmitting}
          className={`rounded-full px-6 h-12 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow flex items-center justify-center gap-2 ${((!values.city.trim() && needsCity) || !part || !values.startDate || isSubmitting)? 'opacity-40 cursor-not-allowed': ''}`}
          style={{ backgroundColor: isSubmitting || ((!values.city.trim() && needsCity) || !part || !values.startDate) ? '#93c5fd' : '#2563eb' }}
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

      {/* Overlay plein écran pour focus - toujours affiché quand le calendrier est ouvert */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={()=>setPickerOpen(false)} />
      )}
      {/* Popover calendrier */}
      {pickerOpen && (part || partFixed) && (mode==='experience' || values.city.trim()) && (
        <div className="fixed inset-0 z-[200] flex items-start lg:items-center justify-center pt-24 sm:pt-32 lg:pt-0 px-4">
          <div ref={popRef} className="relative w-full max-w-2xl p-6 sm:p-7 rounded-3xl card-popover bg-[#0f1f29] text-white border border-white/20 shadow-[0_24px_80px_-18px_rgba(0,0,0,0.8)] animate-fadeIn max-h-[85vh] overflow-auto backdrop-blur-sm">
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
                let clickable = false;
                if (c.date && !past) {
                  if (!stats && !tempStart) {
                    clickable = false;
                  } else if (part === 'FULL' || part === 'SUNSET') {
                    const anyAvail = !!(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                    if (!tempStart) {
                      clickable = anyAvail;
                    } else {
                      // Vérifier si cette date de fin est disponible pour les bateaux de la date de début
                      const isEndDateAvailable = endDateAvailability.get(c.date);
                      if (isEndDateAvailable === false) {
                        clickable = false; // Date de fin non disponible pour les bateaux de la date de début
                      } else {
                        const aDate = new Date(tempStart+'T00:00:00');
                        const bDate = new Date(c.date+'T00:00:00');
                        const diff = Math.abs((bDate.getTime()-aDate.getTime())/86400000)+1;
                        clickable = diff <= 6 && anyAvail; // autoriser si au moins une demi-journée dispo
                        // Si on n'a pas encore vérifié cette date, la marquer comme vérifiable (sera vérifiée au survol ou au clic)
                        if (clickable && isEndDateAvailable === undefined && availableBoatsForStartDate.length > 0) {
                          // Vérifier en arrière-plan
                          if (c.date) {
                            checkEndDateAvailability(c.date).then(isAvail => {
                              if (!isAvail) {
                                // Mettre à jour le cache et forcer un re-render
                                setEndDateAvailability(prev => {
                                  const next = new Map(prev);
                                  next.set(c.date!, false);
                                  return next;
                                });
                              }
                            });
                          }
                        }
                      }
                    }
                  } else if (part === 'HALF') {
                    // Demi-journée : disponible si FULL, AM ou PM existe
                    clickable = !!(stats && (stats.full > 0 || stats.amOnly > 0 || stats.pmOnly > 0));
                  }
                }
                // Indisponible si jour futur mais pas clickable
                let unavailable = false;
                // Vérifier si la date est réservée (tous bateaux confondus)
                const isReserved = stats && (stats as any).reserved === true;
                if (c.date && !past) {
                  if (mode === 'experience') {
                    // Pour les expériences : indisponible si pas de stats ou pas de slots disponibles
                    unavailable = !stats || !(stats.full>0 || stats.amOnly>0 || stats.pmOnly>0);
                  } else {
                    // Pour les bateaux : logique existante
                    if (part === 'FULL') unavailable = !(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                    else if (part === 'HALF') unavailable = !(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                  }
                }
                // S'assurer que les jours passés ou indisponibles ne sont jamais cliquables
                // Pour les expériences à heures fixes, forcer unavailable si pas de stats
                const isClickable = clickable && !past && !unavailable && c.date && (mode !== 'experience' || (stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0)));
                
                // Définir bgClass en tenant compte de isClickable
                let bgClass = 'text-white/30';
                // Priorité 1: Dates sélectionnées (début, fin, ou dans la plage)
                if (selected && !past && isClickable) {
                  if (isStart && isEnd) {
                    // Même jour (début = fin)
                    bgClass = ' bg-blue-500 border-2 border-blue-400 text-white font-bold shadow-lg';
                  } else if (isStart) {
                    // Date de début
                    bgClass = ' bg-blue-500 border-2 border-blue-400 text-white font-bold shadow-lg';
                  } else if (isEnd) {
                    // Date de fin
                    bgClass = ' bg-blue-500 border-2 border-blue-400 text-white font-bold shadow-lg';
                  } else {
                    // Date dans la plage (entre début et fin)
                    bgClass = ' bg-blue-400/40 border border-blue-300/60 text-blue-100 font-semibold';
                  }
                } else if (past) {
                  bgClass = ' bg-white/5 text-white/30 line-through';
                } else if (isReserved) {
                  // Date réservée : afficher en rouge
                  bgClass = ' bg-red-500/30 border-2 border-red-500/60 text-red-100 font-semibold';
                  unavailable = true; // Forcer unavailable si réservé
                } else if (unavailable) {
                  bgClass = ' bg-red-400/15 border border-red-400/40 text-red-200 opacity-50';
                } else if (stats) {
                  if (part === 'FULL' || part === 'SUNSET') {
                    if (stats.full>0) bgClass = ' bg-emerald-300/20 border border-emerald-300/50 text-emerald-200 font-semibold';
                    else if (stats.amOnly>0 || stats.pmOnly>0) bgClass = ' bg-amber-300/20 border border-amber-300/50 text-amber-200 font-semibold';
                  } else if (part === 'HALF') {
                    // Demi-journée : utiliser la même logique que FULL
                    if (stats.full>0) bgClass = ' bg-emerald-300/20 border border-emerald-300/50 text-emerald-200 font-semibold';
                    else if (stats.amOnly>0 || stats.pmOnly>0) bgClass = ' bg-amber-300/20 border border-amber-300/50 text-amber-200 font-semibold';
                  }
                } else if (part==='FULL' && tempStart && c.date) {
                  const aDate = new Date(tempStart+'T00:00:00');
                  const bDate = new Date(c.date+'T00:00:00');
                  const diff = Math.abs((bDate.getTime()-aDate.getTime())/86400000)+1;
                  if (diff<=6) bgClass = ' bg-amber-300/15 border border-amber-300/40 text-amber-200';
                }
                
                return (
                  <div key={c.key}
                    className={`sb-day relative h-11 rounded-lg text-[11px] flex items-center justify-center font-medium transition-all duration-200
                    ${c.date? (isClickable? 'cursor-pointer hover:brightness-110 hover:scale-105':'cursor-not-allowed opacity-60') : ''}
                    ${bgClass}
                    ${selected && !past && isClickable? ' selected-range ' : ''}
                    ${isStart && isClickable? ' range-start ' : ''}
                    ${isEnd && isClickable? ' range-end ' : ''}
                    ${unavailable? ' pointer-events-none' : ''}
                    ${tempStart && c.date && c.date === tempStart? ' ring-2 ring-blue-400 ring-offset-1 ' : ''}`}
                    onClick={(e)=>{ 
                      e.preventDefault();
                      e.stopPropagation();
                      if(!c.date || !isClickable || unavailable) return; 
                      selectDay(c.date, stats); 
                    }}
                    onMouseDown={(e)=>{
                      // Empêcher le clic si la date est indisponible
                      if(unavailable || !isClickable) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    {c.label || ''}
                    {stats && !past && !unavailable && !isReserved && (part==='FULL' || part==='SUNSET' || part==='HALF') && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0) && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-[#0f1f29]/90 border border-white/10 leading-none">{stats.full + stats.amOnly + stats.pmOnly}</span>
                    )}
                    {isReserved && (
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-red-500/80 border border-red-400/60 text-white font-bold leading-none">✕</span>
                    )}
                    {!stats && c.date && !past && !unavailable && !isReserved && (
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
              {part==='HALF' && (
                <>
                  <span className="px-2 py-1 rounded bg-emerald-300/20 border border-emerald-300/40 text-emerald-200 font-semibold">Full</span>
                  <span className="px-2 py-1 rounded bg-amber-300/20 border border-amber-300/40 text-amber-200 font-semibold">Demi-journée (AM ou PM)</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-5 gap-4">
              <p className="text-[10px] text-white/60 flex-1">{(part==='FULL' || part==='SUNSET')? (tempStart? labels.search_help_pick_end_full : labels.search_help_pick_start_full) : labels.search_help_pick_half}.</p>
              <div className="flex items-center gap-2">
                {values.startDate && <button type="button" onClick={()=>{ setValues(v=>({...v,startDate:'', endDate:''})); setTempStart(null); }} className="text-[10px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80">Reset</button>}
                <button type="button" onClick={()=>setPickerOpen(false)} className="text-[11px] px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">OK</button>
              </div>
            </div>
            {loadingMonth && <div className="absolute inset-0 rounded-3xl bg-black/70 backdrop-blur-sm flex items-center justify-center text-[11px] font-medium text-white z-10">Chargement...</div>}
            {loadingEndDates && tempStart && (
              <div className="absolute inset-0 rounded-3xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-[11px] font-medium text-white z-10">
                {currentLocale === 'fr' ? 'Vérification des dates disponibles...' : 'Checking available dates...'}
              </div>
            )}
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
            <Link href="/autre-ville" className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium shadow-sm">Remplir le formulaire</Link>
            <button type="button" onClick={()=> setOtherCityNotice(false)} className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-[11px] text-gray-700 font-medium">Fermer</button>
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
    style2.textContent = `.sb-day.selected-range{position:relative;z-index:1;} .sb-day.selected-range:before{content:'';position:absolute;inset:0;border-radius:0.75rem;background:linear-gradient(135deg,rgba(59,130,246,0.4) 0%,rgba(59,130,246,0.3) 100%);z-index:-1;} .sb-day.range-start:after,.sb-day.range-end:after{content:'';position:absolute;inset:0;border-radius:0.75rem;box-shadow:0 0 0 3px rgba(59,130,246,0.8) inset,0 0 0 2px rgba(59,130,246,1);z-index:0;} .sb-day.range-start.range-end:before{opacity:0.5;} .sb-day:hover{filter:brightness(1.15);transform:scale(1.05);} `;
    document.head.appendChild(style2);
  }
}
