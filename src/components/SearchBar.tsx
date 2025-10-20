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
};




type City = { id: string; name: string };

// Remplacement: PARTS ne dépend plus de labels (évite ReferenceError)
const PARTS: { key: "FULL" | "AM" | "PM"; start: string; end: string }[] = [
  { key: "FULL", start: "08:00", end: "18:00" },
  { key: "AM", start: "08:00", end: "12:00" },
  { key: "PM", start: "13:00", end: "18:00" },
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
}: {
  labels: Record<string, string>;
  onSubmit: (values: SearchValues & { part?: string }) => void;
  className?: string;
  mode?: 'boats' | 'experience';
  experienceSlug?: string;
  hideCity?: boolean;
  hidePassengers?: boolean;
  partFixed?: 'FULL'|'AM'|'PM';
}) {
    // Liste dynamique des villes depuis l'API
    const [cities, setCities] = useState<string[]>([]);
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
  const [values, setValues] = useState<SearchValues>({
    city: mode==='experience'? '': '',
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '18:00',
    passengers: 2,
  });
  const [part, setPart] = useState<"FULL" | "AM" | "PM" | null>(partFixed || null);
  const [passengersField, setPassengersField] = useState('2');
  const [otherCityNotice, setOtherCityNotice] = useState(false);
  const needsCity = mode !== 'experience';

  // --- Date picker état ---
  const [pickerOpen, setPickerOpen] = useState(false);
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
        const res = await fetch(`/api/availability/days?from=${fmtDate(first)}&to=${fmtDate(last)}`);
        const data = await res.json();
        setMonthCache(prev=>{ const n = new Map(prev); n.set(key, data.days||[]); return n; });
      }
    } catch { /* ignore */ } finally { setLoadingMonth(false); }
  },[monthCache, mode, experienceSlug]);

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

  const applyPart = (p: "FULL" | "AM" | "PM") => {
    const def = PARTS.find((x) => x.key === p)!;
    setValues((v) => ({
      ...v,
      startTime: def.start,
      endTime: def.end,
      endDate: p === "FULL" ? v.endDate : v.startDate,
    }));
    setPart(p);
    setTempStart(null);
  };

  const update = (key: keyof SearchValues, val: string | number) =>
    setValues((v) => {
      const next: any = { ...v, [key]: val };
      if (key === "startDate" && part && part !== "FULL") {
        next.endDate = val; // impose même jour pour AM/PM
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
    if (part === 'FULL') {
      if (!tempStart) {
        // Premier clic: on initialise la plage
        setTempStart(d);
        setValues(v => ({ ...v, startDate: d, endDate: d }));
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
        setValues(v => ({ ...v, startDate: start, endDate: end }));
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

  return (
    <form
      className={`relative w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end
      rounded-2xl p-4 sm:p-5 border shadow-[0_4px_28px_-6px_rgba(0,0,0,0.25)]
      bg-gradient-to-br from-white/55 via-white/35 to-white/25 dark:from-[#1c2a35]/70 dark:via-[#1c2a35]/55 dark:to-[#1c2a35]/35
      backdrop-blur-xl border-white/60 dark:border-white/10
      ring-1 ring-[color:var(--primary)]/15
      ${className ?? ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (mode!=='experience' && !values.city.trim()) { setCityHint(true); return; }
        if (!part && !partFixed) { setPartHint(true); return; }
        if (!values.startDate) { setDateHint(true); return; }
        let pax = parseInt(passengersField || '0', 10);
        if (!pax || pax < 1) pax = 1;
        if (pax !== values.passengers) setValues(v=>({...v, passengers: pax }));
        onSubmit({ ...values, passengers: pax, part: partFixed || part || undefined });
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
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
              📍
            </span>
            <input
              className={`${baseInput} pl-9`}
              list="city-list"
              placeholder={labels.search_city}
              value={values.city}
              onChange={(e) => { update("city", e.target.value); if(e.target.value.trim()) setCityHint(false); }}
            />
            {!values.city.trim() && cityHint && <p className="mt-1 text-[10px] text-red-600">{labels.search_hint_city_first}</p>}
          </div>
          <datalist id="city-list">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
              const lbl = p.key === 'FULL' ? (labels.search_part_full || 'Journée entière') : p.key === 'AM' ? (labels.search_part_am || 'Matin') : (labels.search_part_pm || 'Après-midi');
              return <option key={p.key} value={p.key}>{lbl}</option>;
            })}
          </select>
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
          onClick={openPicker}
          onFocus={openPicker}
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
          {part !== "FULL" && (
            <span className="text-[10px] font-normal text-black dark:text-white">(= début)</span>
          )}
        </label>
        <input
          type="text"
          readOnly
          onClick={()=> part==='FULL' && openPicker()}
          onFocus={()=> part==='FULL' && openPicker()}
          placeholder={part==='FULL'? (needsCity ? (!values.city.trim()? 'Choisir la ville' : 'Sélectionner...') : 'Sélectionner...') : (!part? '' : values.startDate? values.startDate : '')}
          className={baseInput + ' ' + ((!part || (needsCity && !values.city.trim()))? 'opacity-50 cursor-not-allowed': (part !== "FULL" ? "opacity-60" : "cursor-pointer"))}
          value={values.endDate}
          disabled={!part || (needsCity && !values.city.trim()) || part !== "FULL"}
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
      {/* Submit */}
      <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end pt-1">
        <button
          type="submit"
          disabled={(!values.city.trim() && needsCity) || !part || !values.startDate}
          className={`rounded-full px-6 h-12 text-sm font-semibold text-white bg-[var(--primary)] hover:brightness-110 active:brightness-95 transition shadow-sm ${((!values.city.trim() && needsCity) || !part || !values.startDate)? 'opacity-40 cursor-not-allowed hover:brightness-100': ''}`}
        >
          {labels.search_submit}
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
                let clickable = false;
                if (c.date && !past) {
                  if (!stats && !tempStart) {
                    clickable = false;
                  } else if (part === 'FULL') {
                    const anyAvail = !!(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                    if (!tempStart) {
                      clickable = anyAvail;
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
                // Indisponible si jour futur mais pas clickable
                let unavailable = false;
                if (c.date && !past) {
                  if (part === 'FULL') unavailable = !(stats && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0));
                  else if (part === 'AM') unavailable = !(stats && (stats.full>0 || stats.amOnly>0));
                  else if (part === 'PM') unavailable = !(stats && (stats.full>0 || stats.pmOnly>0));
                }
                let bgClass = 'text-white/30';
                if (past) {
                  bgClass = ' bg-white/5 text-white/30 line-through';
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
                    {stats && !past && !unavailable && part==='FULL' && (stats.full>0 || stats.amOnly>0 || stats.pmOnly>0) && (
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
              <p className="text-[10px] text-white/60 flex-1">{part==='FULL'? (tempStart? labels.search_help_pick_end_full : labels.search_help_pick_start_full) : labels.search_help_pick_half}.</p>
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
