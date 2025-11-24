'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import HeaderBar from '@/components/HeaderBar';
import { messages } from '@/i18n/messages';
import { useRouter } from 'next/navigation';

// export const metadata = { title: 'Autre ville - Informations' }; // retiré car composant client

// Créneaux
const PARTS: { key: 'FULL'|'AM'|'PM'; label: string; start: string; end: string }[] = [
  { key:'FULL', label:'Journée entière', start:'08:00', end:'18:00' },
  { key:'AM', label:'Matin', start:'08:00', end:'12:00' },
  { key:'PM', label:'Après-midi', start:'13:00', end:'18:00' },
];

function AutreVillePageInner() {
  // Form state
  const [ville, setVille] = useState('');
  const [passagers, setPassagers] = useState('');
  const [experience, setExperience] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [part, setPart] = useState<'FULL'|'AM'|'PM'|null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStart, setTempStart] = useState<string|null>(null);

  // Calendrier dispo (copie adaptée de SearchBar)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(()=>{ const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const [monthCache, setMonthCache] = useState<Map<string,{date:string; boats:number}[]>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState(false);
  const popRef = useRef<HTMLDivElement|null>(null);
  const monthKey = (y:number,m:number)=>`${y}-${String(m+1).padStart(2,'0')}`;
  const fmtDate = (d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const ensureMonth = useCallback(async (y:number,m:number)=>{
    const key = monthKey(y,m);
    if (monthCache.has(key)) return;
    setLoadingMonth(true);
    try {
      const first = new Date(y,m,1); const last = new Date(y,m+1,0);
      const res = await fetch(`/api/availability/days?from=${fmtDate(first)}&to=${fmtDate(last)}`);
      const data = await res.json();
      setMonthCache(prev=>{ const n = new Map(prev); n.set(key, data.days||[]); return n; });
    } catch {} finally { setLoadingMonth(false); }
  },[monthCache]);
  useEffect(()=>{ ensureMonth(calMonth.y, calMonth.m); },[calMonth, ensureMonth]);

  // Close popover outside
  useEffect(()=>{
    if(!pickerOpen) return;
    const onDown = (e:MouseEvent)=>{ if(popRef.current && !popRef.current.contains(e.target as Node)) setPickerOpen(false); };
    const onKey = (e:KeyboardEvent)=>{ if(e.key==='Escape') setPickerOpen(false); };
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey);
    return ()=>{ window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  },[pickerOpen]);

  const avail = monthCache.get(monthKey(calMonth.y, calMonth.m)) || [];
  const availMap = new Map(avail.map(d=>[d.date,d.boats]));

  const buildMonthMatrix = () => {
    const { y, m } = calMonth; const first = new Date(y,m,1); const startWeekday = (first.getDay()+6)%7; const daysInMonth = new Date(y,m+1,0).getDate();
    const cells: { key:string; label:number|string; date?:string; boats?:number }[] = [];
    for(let i=0;i<startWeekday;i++) cells.push({ key:'e'+i, label:'' });
    for(let d=1; d<=daysInMonth; d++) { const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const boats = availMap.get(dateStr); cells.push({ key: dateStr, label:d, date:dateStr, boats }); }
    return cells;
  };
  const monthCells = buildMonthMatrix();
  const monthLabel = new Date(calMonth.y, calMonth.m).toLocaleDateString('fr-FR',{month:'long', year:'numeric'});
  const todayStr = fmtDate(new Date()); // date du jour pour désactiver / masquer le passé
  const todayObj = new Date();
  const isCurrentMonth = calMonth.y===todayObj.getFullYear() && calMonth.m===todayObj.getMonth();

  const openPicker = () => {
    if(!hasVille){ setVilleHint(true); return; } // bloque si pas de ville réelle
    if(!part){ setPartHint(true); return; }
    const ref = startDate || endDate || fmtDate(new Date()); const d = new Date(ref+'T00:00:00'); setCalMonth({ y:d.getFullYear(), m:d.getMonth() }); setPickerOpen(true);
  };

  const applyPart = (p:'FULL'|'AM'|'PM') => {
    setPart(p); setTempStart(null); if(p!=='FULL' && startDate) { setEndDate(startDate); }
  };

  const selectDay = (dateStr:string) => {
    if(!hasVille) { setVilleHint(true); return; } // sécurité supplémentaire
    const MAX_DAYS = 7; // limite de réservation (jours inclus)
    if(part!=='FULL') { setStartDate(dateStr); setEndDate(dateStr); setPickerOpen(false); setShowBoatsModal(true); return; }
    if(!tempStart) { setTempStart(dateStr); setStartDate(dateStr); setEndDate(dateStr); setRangeError(null); return; }
    if(tempStart===dateStr) { setStartDate(dateStr); setEndDate(dateStr); setTempStart(null); setPickerOpen(false); setShowBoatsModal(true); setRangeError(null); return; }
    // Vérifier distance
    const aDate = new Date(tempStart+'T00:00:00');
    const bDate = new Date(dateStr+'T00:00:00');
    const diff = Math.abs((bDate.getTime()-aDate.getTime())/86400000)+1; // inclusif
    if(diff > MAX_DAYS) { setRangeError(`Limite dépassée: ${MAX_DAYS} jours max.`); return; }
    const a = tempStart < dateStr ? tempStart : dateStr; const b = tempStart < dateStr ? dateStr : tempStart; setStartDate(a); setEndDate(b); setTempStart(null); setPickerOpen(false); setShowBoatsModal(true); setRangeError(null);
  };

  const inSelectedRange = (d:string) => {
    if(!startDate) return false; if(part!=='FULL') return startDate===d; if(tempStart && startDate===endDate){ const a = tempStart < d ? tempStart : d; const b = tempStart < d ? d : tempStart; return d>=a && d<=b; } if(!endDate) return d===startDate; return d>=startDate && d<=endDate;
  };

  // Mini carte récap
  const selectedDates: string[] = (()=>{ if(!startDate) return []; if(!endDate) return [startDate]; if(part!=='FULL') return [startDate]; const arr: string[] = []; let cur = new Date(startDate+'T00:00:00'); const end = new Date(endDate+'T00:00:00'); while(cur<=end){ const d = fmtDate(cur); arr.push(d); cur = new Date(cur.getTime()+86400000);} return arr; })();
  const partDef = part? PARTS.find(p=>p.key===part)! : null;
  const totalDays = part==='FULL' ? selectedDates.length || 1 : 1;

  const onSubmit = (e:React.FormEvent) => {
    e.preventDefault(); if(!part) setPartHint(true); if(!ville || !experience || !message || !email || !part || !rgpd || !startDate) return;
    const payload = { ville, passagers: passagers? parseInt(passagers,10): undefined, experience, part, startDate, endDate: part==='FULL'? endDate: startDate, message, email, tel, boatId: selectedBoat?.id };
    console.log('Autre-ville request', payload); // TODO: POST API route
    setShowSuccess(true);
    setTimeout(()=>{ router.push('/'); }, 2500);
  };

  // Modal bateaux dispo
  const [showBoatsModal, setShowBoatsModal] = useState(false);
  const [boatsLoading, setBoatsLoading] = useState(false);
  const [boatsAvail, setBoatsAvail] = useState<any[]>([]);
  const [boatsError, setBoatsError] = useState<string|null>(null);
  const [selectedBoat, setSelectedBoat] = useState<any|null>(null);
  const [attemptedClose, setAttemptedClose] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [partHint, setPartHint] = useState(false);
  const [rangeError, setRangeError] = useState<string|null>(null);
  const [villeHint, setVilleHint] = useState(false); // nouvel état pour ville non sélectionnée
  const locale = 'fr';
  const hasVille = ville.trim().length>0; // ville réellement saisie
  const t = messages[locale];
  const router = useRouter();

  useEffect(()=>{
    const loadBoats = async () => {
      if(!showBoatsModal || !startDate || !part) return; // rien
      // Ajustement: pour FULL multi-jour on ne filtre la dispo que sur le jour de début (endDate peut être indispo).
      const from = startDate; const to = (part==='FULL') ? startDate : startDate; // part FULL ignore endDate pour la recherche dispo
      setBoatsLoading(true); setBoatsError(null); setBoatsAvail([]);
      try {
        const res = await fetch(`/api/availability/boats?from=${from}&to=${to}&part=${part}`);
        if(!res.ok) throw new Error('HTTP');
        const data = await res.json();
        setBoatsAvail(data.boats||[]);
      } catch(e:any){ setBoatsError('Erreur chargement'); } finally { setBoatsLoading(false); }
    };
    loadBoats();
  },[showBoatsModal, startDate, endDate, part]);

  useEffect(()=>{ if(showBoatsModal && !hasVille){ setShowBoatsModal(false); } }, [hasVille, showBoatsModal]);

  return (
    <>
      <HeaderBar initialLocale={locale as any} />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-semibold mb-1">Demande pour une autre ville</h1>
        <p className="text-sm text-black/60 mb-6">Précise le port / la zone, les dates souhaitées et ton besoin. Nous revenons vers toi rapidement.</p>
        <form onSubmit={onSubmit} className="space-y-8 bg-white rounded-xl border border-black/10 p-6 shadow-sm relative">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-1 text-black/70">Ville / Port souhaité *</label>
                <input required value={ville} onChange={e=>{ setVille(e.target.value); if(e.target.value.trim()) setVilleHint(false); }} className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" placeholder="Ex: Menton, Saint-Tropez, Monaco..."/>
                {!hasVille && villeHint && <p className="mt-1 text-[10px] text-red-600">Saisis la ville avant de choisir les dates.</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-black/70">Créneau *</label>
                <select value={part||''} onChange={e=>{ const v=e.target.value as any; if(!v){ setPart(null); return;} applyPart(v); }} required className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
                  <option value="" disabled>Choisir...</option>
                  {PARTS.map(p=> <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/70">Date début *</label>
                  <input readOnly onClick={openPicker} onFocus={openPicker} value={startDate} placeholder={!hasVille? 'Choisir ville' : (!part? 'Choisir créneau' : 'Sélectionner...')} disabled={!part || !hasVille} className={`w-full h-11 px-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${(!part || !hasVille)? 'opacity-50 cursor-not-allowed border-black/10':'border-black/15 cursor-pointer'}`}/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/70 flex items-center gap-1">Date fin {part!=='FULL' && <span className="text-[10px] font-normal text-black/40">(= début)</span>}</label>
                  <input readOnly onClick={()=> part==='FULL' && openPicker()} onFocus={()=> part==='FULL' && openPicker()} value={part==='FULL'? endDate: startDate} placeholder={part==='FULL'? (!hasVille? 'Choisir ville' : (!part? 'Choisir créneau' : 'Sélectionner...')) : ''} disabled={!part || !hasVille || (part!=='FULL')} className={`w-full h-11 px-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${(!part || !hasVille || part!=='FULL')? 'opacity-60 border-black/10':'border-black/15 cursor-pointer'}`}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-black/70">Nombre de personnes (approx.)</label>
                <input value={passagers} onChange={e=> setPassagers(e.target.value.replace(/\D+/g,''))} inputMode="numeric" className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" placeholder="Ex: 6"/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-black/70">Type d'expérience recherchée *</label>
                <select required value={experience} onChange={e=>setExperience(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
                  <option value="">Sélectionner...</option>
                  <option>Journée bateau</option>
                  <option>Croisière coucher de soleil</option>
                  <option>Transfert</option>
                  <option>Evénement / Privatisation</option>
                  <option>Autre</option>
                </select>
              </div>
              {selectedBoat && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-3 text-[11px] flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900 mb-1">Bateau sélectionné</p>
                    <p className="text-emerald-800"><span className="font-medium">{selectedBoat.name}</span>{selectedBoat.capacity? ` • ${selectedBoat.capacity} pax` : ''}</p>
                    <p className="text-emerald-700/80">{part==='FULL' ? 'Créneau journée' : (part==='AM'? 'Matin':'Après-midi')} {startDate && `le ${startDate}${(part==='FULL' && endDate && endDate!==startDate)? ' → '+endDate:''}`}</p>
                    {selectedBoat.pricePerDay && (
                      <p className="mt-1 text-emerald-900 font-medium">Prix total estimé: {new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(selectedBoat.pricePerDay * totalDays)} {totalDays>1? `(${totalDays} jours)` : ''}</p>
                    )}
                  </div>
                  <button type="button" onClick={()=>setSelectedBoat(null)} className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white hover:brightness-110">Retirer</button>
                </div>
              )}
            </div>
            <div className="space-y-5">
              {/* Mini carte récap des jours sélectionnés */}
              <div className="rounded-lg border border-black/10 bg-gradient-to-br from-blue-50/60 to-white p-4 min-h-[140px]">
                <h3 className="text-xs font-semibold mb-2 text-blue-900 flex items-center gap-1">📅 Récap sélection</h3>
                {!part && <p className="text-[11px] text-black/50">Choisis un créneau pour voir les disponibilités.</p>}
                {part && !startDate && <p className="text-[11px] text-black/50">Sélectionne au moins un jour.</p>}
                {part && startDate && (
                  <ul className="space-y-1 max-h-40 overflow-auto pr-1">
                    {selectedDates.map(d=> {
                      const boats = availMap.get(d);
                      return (
                        <li key={d} className="flex items-center justify-between text-[11px] bg-white/80 rounded border border-blue-200 px-2 py-1">
                          <span className="font-medium text-blue-800">{new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{ weekday:'short', day:'2-digit', month:'2-digit'})}</span>
                          <span className="text-blue-700 flex items-center gap-2">
                            {boats? <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{boats} b.</span> : <span className="text-black/30">0 b.</span>}
                            {partDef && <span className="text-[10px] text-black/60">{partDef.start}–{partDef.end}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {part && startDate && selectedDates.length===0 && <p className="text-[11px] text-black/50">Aucune date.</p>}
                <p className="mt-2 text-[10px] text-black/40">Nombre = bateaux ayant au moins 1 slot dispo ce jour.</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-black/70">Message / Contexte *</label>
                <textarea required value={message} onChange={e=>setMessage(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" placeholder="Décris ton besoin, horaires, ambiance, contraintes..."></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/70">Email *</label>
                  <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" placeholder="ton@email.com"/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black/70">Téléphone (optionnel)</label>
                  <input value={tel} onChange={e=>setTel(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" placeholder="+33 ..."/>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-black/60">
                <input type="checkbox" checked={rgpd} onChange={e=>setRgpd(e.target.checked)} id="rgpd" className="accent-[var(--primary)]" />
                <label htmlFor="rgpd">J'accepte d'être contacté à propos de ma demande.</label>
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Link href="/" className="text-xs text-black/50 hover:text-black underline">← Retour</Link>
            <button type="submit" disabled={!ville || !experience || !message || !email || !part || !rgpd || !startDate} className="px-6 h-11 rounded-full bg-[color:var(--primary)] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">Envoyer</button>
          </div>

          {/* Popover calendrier */}
          {pickerOpen && part && hasVille && (
            <div ref={popRef} className="absolute z-50 top-40 left-4 w-[min(560px,calc(100%-2rem))] bg-white border border-black/15 rounded-xl shadow-lg p-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <button type="button" disabled={isCurrentMonth} onClick={()=>setCalMonth(m=>{ const nm=m.m-1; return { y: nm<0? m.y-1 : m.y, m:(nm+12)%12 }; })} className={`text-xs px-2 py-1 rounded ${isCurrentMonth? 'opacity-30 cursor-not-allowed':'hover:bg-black/5'}`}>←</button>
                <div className="text-xs font-semibold uppercase tracking-wide">{monthLabel}</div>
                <button type="button" onClick={()=>setCalMonth(m=>{ const nm=m.m+1; return { y: nm>11? m.y+1 : m.y, m: nm%12 }; })} className="text-xs px-2 py-1 rounded hover:bg-black/5">→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-black/60 mb-1">
                {['L','Ma','Me','J','V','S','D'].map(d=> <div key={d}>{d}</div> )}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center select-none">
                {monthCells.map(c=> {
                  const selected = c.date && inSelectedRange(c.date);
                  const isStart = c.date && c.date===startDate;
                  const isEnd = c.date && c.date===endDate;
                  const range = part==='FULL' && selected && startDate && endDate && startDate!==endDate;
                  const past = !!c.date && c.date < todayStr; // passé
                  let clickable = false;
                  if(c.date && !past){
                    if(part!=='FULL') clickable = !!c.boats; else clickable = tempStart ? true : !!c.boats;
                  }
                  return (
                    <div key={c.key} onClick={()=>{ if(!c.date) return; if(!clickable) return; selectDay(c.date); }} className={`relative h-9 rounded-md text-[11px] flex items-center justify-center transition-colors
                      ${c.date? (clickable? 'cursor-pointer':'') : ''}
                      ${past? ' bg-gray-100 text-black/30 line-through': ((c.boats || (part==='FULL' && tempStart && c.date))? ' bg-blue-50 border border-blue-200 text-blue-800 font-semibold':'text-black/40')}
                      ${selected && !past? ' ring-2 ring-[var(--primary)]/50':''}
                      ${range && !past? ' bg-gradient-to-br from-blue-100 to-blue-50':''}
                      ${isStart && !past? ' outline outline-2 outline-[var(--primary)]':''}
                      ${isEnd && !past? ' outline outline-2 outline-[var(--primary)]':''}
                    `}>{c.label || ''}{c.boats && !past && <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-[1px] rounded-full bg-white/80 border border-blue-200 leading-none">{c.boats}</span>}</div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 gap-3">
                <p className="text-[10px] text-black/50">{part==='FULL' ? (tempStart? 'Clique une date de fin (max 7 jours, peut être sans dispo)' : 'Clique une date de début (doit être dispo)') : 'Clique un jour (½ journée)'}.</p>
                <div className="flex items-center gap-2">
                  {startDate && <button type="button" onClick={()=>{ setStartDate(''); setEndDate(''); setTempStart(null); setRangeError(null); }} className="text-[10px] px-2 py-1 rounded bg-black/5 hover:bg-black/10">Reset</button>}
                  <button type="button" onClick={()=>setPickerOpen(false)} className="text-[10px] px-2 py-1 rounded bg-[var(--primary)] text-white hover:brightness-110">OK</button>
                </div>
              </div>
              {rangeError && <p className="mt-2 text-[10px] text-red-600 font-medium">{rangeError}</p>}
              {loadingMonth && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center text-[11px] font-medium">Chargement...</div>}
            </div>
          )}
          {!part && partHint && <p className="mt-3 text-[11px] text-center text-red-600">Sélectionne un créneau pour voir les dates.</p>}
          {!hasVille && villeHint && <p className="mt-1 text-[11px] text-center text-red-600">Renseigne la ville pour accéder aux disponibilités.</p>}
        </form>
        {showBoatsModal && (
          <div className="fixed inset-0 z-[70] flex items-start md:items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-gradient-to-r from-[color:var(--primary)]/10 to-white">
                <h2 className="text-sm font-semibold">Bateaux disponibles {part==='FULL' && endDate && startDate!==endDate ? <span className="font-normal text-black/60">(plage {startDate} → {endDate})</span> : <span className="font-normal text-black/60">({startDate}{part==='FULL' && endDate && startDate===endDate? '' : ''})</span>}</h2>
                <button onClick={()=>{ if(!selectedBoat && boatsAvail.length>0){ setAttemptedClose(true); return; } setShowBoatsModal(false); }} className={`text-xs px-3 py-1 rounded-full border ${!selectedBoat && boatsAvail.length>0? 'border-red-300 text-red-500 hover:bg-red-50':'border-black/20 hover:bg-black/5'}`}>{!selectedBoat && boatsAvail.length>0? 'Sélection requise':'Fermer'}</button>
              </div>
              <div className="p-6 overflow-auto flex-1">
                {boatsLoading && <p className="text-xs text-black/50 animate-pulse">Chargement...</p>}
                {boatsError && <p className="text-xs text-red-600">{boatsError}</p>}
                {!boatsLoading && !boatsError && boatsAvail.length===0 && <p className="text-xs text-black/50">Aucun bateau disponible à la date de début sélectionnée.</p>}
                {attemptedClose && !selectedBoat && boatsAvail.length>0 && <p className="text-[11px] text-red-600 mb-3">Sélectionne un bateau pour fermer.</p>}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {boatsAvail.map(b=> (
                    <div key={b.id} className={`group rounded-2xl bg-white border ${selectedBoat?.id===b.id? 'border-[color:var(--primary)] ring-2 ring-[color:var(--primary)]/40':'border-black/10'} shadow-sm hover:shadow-md transition overflow-hidden flex flex-col`}>
                      <div className="relative h-36 bg-black/5">
                        {b.imageUrl ? <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[11px] text-black/50">{b.name}</div>}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          <div className="text-[10px] px-2 py-1 rounded-full bg-white/90 backdrop-blur border border-black/10 shadow font-medium text-[color:var(--primary)]">ID #{b.id}</div>
                          {b.pricePerDay && <div className="text-[10px] px-2 py-1 rounded-full bg-white/90 border border-emerald-200 text-emerald-700 font-medium">{new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(b.pricePerDay)}/j</div>}
                        </div>
                        {selectedBoat?.id===b.id && <div className="absolute inset-0 bg-[color:var(--primary)]/20 mix-blend-multiply" />}
                      </div>
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <p className="text-sm font-semibold leading-tight line-clamp-2">{b.name}</p>
                        <div className="grid grid-cols-3 gap-1 text-[9px]">
                          <div className="rounded bg-black/5 px-1 py-1 text-center"><span className="font-semibold">{b.fullCount}</span><br/>FULL</div>
                          <div className="rounded bg-black/5 px-1 py-1 text-center"><span className="font-semibold">{b.amCount}</span><br/>AM</div>
                          <div className="rounded bg-black/5 px-1 py-1 text-center"><span className="font-semibold">{b.pmCount}</span><br/>PM</div>
                        </div>
                        {b.pricePerDay && part==='FULL' && totalDays>1 && <p className="text-[10px] text-black/60">≈ {new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(b.pricePerDay * totalDays)} ({totalDays} j)</p>}
                        <button type="button" onClick={()=>{ setSelectedBoat(b); setAttemptedClose(false); setShowBoatsModal(false); }} className={`mt-auto text-[11px] h-9 rounded-full font-medium hover:brightness-110 ${selectedBoat?.id===b.id? 'bg-emerald-600 text-white':'bg-[color:var(--primary)] text-white'}`}>{selectedBoat?.id===b.id? 'Sélectionné':'Sélectionner'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-3 border-t border-black/10 text-[10px] text-black/50 flex justify-between items-center">
                <p>Basé sur la disponibilité du jour de début (fin ou jours intermédiaires peuvent être indisponibles).</p>
                <button onClick={()=>{ if(!selectedBoat && boatsAvail.length>0){ setAttemptedClose(true); return;} setShowBoatsModal(false); }} className="text-[10px] underline disabled:opacity-40" disabled={!selectedBoat && boatsAvail.length>0}>Fermer</button>
              </div>
            </div>
          </div>
        )}
        <p className="mt-4 text-[10px] text-black/40">Nous te répondons rapidement (souvent &lt; 2h ouvrées).</p>
      </div>
      <FooterWrapper locale={locale as any} t={t} />
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-black/10 p-8 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_30%_30%,var(--primary)_0,transparent_60%)]" />
            <div className="relative">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4 animate-pulse">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary)]">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Demande envoyée</h3>
              <p className="text-sm text-black/60 leading-relaxed">Nous validons ta demande et revenons vers toi très vite.<br/><span className="text-[var(--primary)] font-medium">Redirection...</span></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AutreVillePage(){
  return <AutreVillePageInner />;
}
