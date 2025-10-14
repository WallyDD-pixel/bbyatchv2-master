"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { dateFnsLocalizer } from 'react-big-calendar';
import { fr, enUS } from 'date-fns/locale';

const locales: any = { fr, en: enUS };
const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string, options: any) => new Intl.DateTimeFormat(options?.culture || 'fr-FR', { year:'numeric', month:'2-digit', day:'2-digit' }).format(date),
  parse: (value: string) => new Date(value),
  startOfWeek: (date: Date) => { const d = new Date(date); const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff); d.setHours(0,0,0,0); return d; },
  getDay: (date: Date) => date.getDay(),
  locales,
});

interface Boat { id: number; name: string; slug: string; imageUrl?: string|null }
interface Slot { id: number; boatId: number; date: string; part: 'AM'|'PM'|'FULL'; status: string; note?: string|null }
interface Reservation { id: string; boatId?: number|null; startDate: string; endDate: string; status: string }

function localKey(dateStr: string) { const d = new Date(dateStr); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function keyToDate(key: string) { return new Date(key + 'T00:00:00'); }

export default function CalendarClient({ locale }: { locale: 'fr'|'en' }) {
  // Couleurs pour les créneaux
  const [showMoreDay, setShowMoreDay] = useState<{date: Date, events: any[]} | null>(null);
  const eventPropGetter = (event: any) => {
    if (event.type === 'reservation') {
      return {
        style: {
          background: 'linear-gradient(90deg,#ef4444 60%,#f87171 100%)',
          border: '2px solid #b91c1c',
          color: '#fff',
        }
      };
    }
    // Expériences : violet
    if (event.type === 'expSlot') {
      return {
        style: {
          background: 'linear-gradient(135deg,#a78bfa,#fff)',
          border: '2px solid #7c3aed',
          color: '#fff',
        }
      };
    }
    // Slots classiques
    if (event.type === 'slot') {
      switch (event.slotData?.part) {
        case 'AM':
          return {
            style: {
              background: 'linear-gradient(135deg,#fde047,#fff)',
              border: '2px solid #facc15',
              color: '#333',
            }
          };
        case 'PM':
          return {
            style: {
              background: 'linear-gradient(135deg,#22c55e,#fff)',
              border: '2px solid #16a34a',
              color: '#fff',
            }
          };
        case 'FULL':
          return {
            style: {
              background: 'linear-gradient(135deg,#2563eb,#fff)',
              border: '2px solid #1d4ed8',
              color: '#fff',
            }
          };
        default:
          return {};
      }
    }
    return {};
  };
  // const [reservationInfo, setReservationInfo] = useState<Reservation|null>(null);
  const onSelectEvent = (ev: any) => {
    if (ev.type==='slot' || ev.type==='expSlot') {
      setEditingSlot(ev.slotData || ev.expSlotData);
      setNoteEdit((ev.slotData||ev.expSlotData).note||'');
    } else if (ev.type==='reservation' && ev.resData) {
      setReservationInfo(ev.resData);
    } else {
      setReservationInfo(null);
    }
  };
  const [boats, setBoats] = useState<Boat[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedBoat, setSelectedBoat] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(true); // nouveau: vue globale par défaut
  const [noteNew, setNoteNew] = useState('');
  const [part, setPart] = useState<'AM'|'PM'|'FULL'>('FULL');
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [noteEdit, setNoteEdit] = useState('');
  const [saving, setSaving] = useState(false);
  const [daySummary, setDaySummary] = useState<{date:string; items:{ boat: Boat; parts: string[]; notes: string[] }[]}|null>(null);
  const [reservationInfo, setReservationInfo] = useState<Reservation|null>(null);
  const [activeDay, setActiveDay] = useState<string|null>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [expSlots, setExpSlots] = useState<any[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<number|null>(null);

  const load = useCallback(async (anchor: Date) => {
    const from = startOfDay(addDays(anchor, -31));
    const to = endOfDay(addDays(anchor, 62));
    const fmt = (d: Date) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
    try {
      const [resBoats, resExps] = await Promise.all([
        fetch(`/api/admin/availability?from=${fmt(from)}&to=${fmt(to)}`),
        fetch(`/api/admin/availability/experiences?from=${fmt(from)}&to=${fmt(to)}`).catch(()=>null)
      ]);
      if (resBoats && resBoats.ok) {
        const data = await resBoats.json();
        setBoats(data.boats||[]);
        setSlots((data.slots||[]).map((s: any)=>({ ...s, date: localKey(s.date) })));
        setReservations(data.reservations||[]);
      }
      if (resExps && resExps.ok) {
        const d2 = await resExps.json();
        setExperiences(d2.experiences||[]);
        setExpSlots((d2.slots||[]).map((s:any)=> ({ ...s, date: localKey(s.date) })));
      } else {
        setExperiences([]); setExpSlots([]);
      }
    } catch { /* silent */ }
  }, []);
  useEffect(()=>{ load(date); }, [date, load]);
  useEffect(()=>{ setActiveDay(null); setSelectedExperience(null); }, [selectedBoat, showAll, date]);

  const events = useMemo(()=> {
    const ev: any[] = [];
    // Vue globale
    if ((!selectedBoat && !selectedExperience) && showAll) {
      slots.forEach(s => { /* boat slots */
        const base = keyToDate(s.date);
        let start = new Date(base); start.setHours(8,0,0,0); let end = new Date(base); end.setHours(18,0,0,0);
        if (s.part==='AM') { end = new Date(base); end.setHours(12,30,0,0); }
        else if (s.part==='PM') { start = new Date(base); start.setHours(13,30,0,0); }
        const boatName = boats.find(b=>b.id===s.boatId)?.name || '#';
        ev.push({ id: 'slot-'+s.id, title: boatName+': '+s.part + (s.note? ' • '+s.note:''), start, end, allDay:false, type:'slot', slotData:s });
      });
      expSlots.forEach(s => { /* experience slots */
        const base = keyToDate(s.date);
        let start = new Date(base); start.setHours(7,30,0,0); let end = new Date(base); end.setHours(17,30,0,0);
        if (s.part==='AM') { end = new Date(base); end.setHours(12,0,0,0); }
        else if (s.part==='PM') { start = new Date(base); start.setHours(13,0,0,0); }
        const expName = experiences.find(e=>e.id===s.experienceId)?.[locale==='fr'?'titleFr':'titleEn'] || 'Exp';
        ev.push({ id: 'expSlot-'+s.id, title: 'EXP '+expName+': '+s.part + (s.note? ' • '+s.note:''), start, end, allDay:false, type:'expSlot', expSlotData:s });
      });
      reservations.forEach(r => {
        if (!r.boatId) return;
        const start = new Date(r.startDate); const end = new Date(r.endDate);
        const boatName = boats.find(b=>b.id===r.boatId)?.name || '#';
        ev.push({ id: 'res-'+r.id, title: boatName+': '+(locale==='fr'?'Réservation':'Reservation'), start, end, type:'reservation', resData:r });
      });
      return ev;
    }
    // Vue bateau seule
    if (selectedBoat) {
      slots.filter(s=>s.boatId===selectedBoat).forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base); start.setHours(8,0,0,0); let end = new Date(base); end.setHours(18,0,0,0);
        if (s.part==='AM') { end = new Date(base); end.setHours(12,30,0,0); }
        else if (s.part==='PM') { start = new Date(base); start.setHours(13,30,0,0); }
        ev.push({ id: 'slot-'+s.id, title: s.part + (s.note? ' • '+s.note:''), start, end, allDay:false, type:'slot', slotData:s });
      });
      reservations.filter(r=>r.boatId===selectedBoat).forEach(r => { const start = new Date(r.startDate); const end = new Date(r.endDate); ev.push({ id: 'res-'+r.id, title: (locale==='fr'?'Réservation':'Reservation'), start, end, type:'reservation', resData:r }); });
      return ev;
    }
    // Vue expérience seule
    if (selectedExperience) {
      expSlots.filter(s=>s.experienceId===selectedExperience).forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base); start.setHours(8,0,0,0); let end = new Date(base); end.setHours(18,0,0,0);
        if (s.part==='AM') { end = new Date(base); end.setHours(12,0,0,0); }
        else if (s.part==='PM') { start = new Date(base); start.setHours(13,0,0,0); }
        ev.push({ id: 'expSlot-'+s.id, title: s.part + (s.note? ' • '+s.note:''), start, end, allDay:false, type:'expSlot', expSlotData:s });
      });
      return ev;
    }
    return ev;
  }, [slots, expSlots, reservations, selectedBoat, selectedExperience, showAll, boats, experiences, locale]);

  // Map des disponibilités (nombre de bateaux ayant au moins 1 slot ce jour-là)
  const availabilityMap = useMemo(()=>{
    const map: Record<string, { boats: Set<number>; slots: number }> = {};
    slots.forEach(s => {
      if (s.status && s.status !== 'available') return; // on ne compte que available
      if (!map[s.date]) map[s.date] = { boats: new Set(), slots: 0 };
      map[s.date].boats.add(s.boatId);
      map[s.date].slots += 1;
    });
    return map;
  }, [slots]);

  // Nouveau: agrégat par bateau pour affichage cartes (compte de slots disponibles)
  const boatAvail = useMemo(()=>{
    const agg: Record<number,{ FULL:number; AM:number; PM:number; total:number }> = {};
    slots.forEach(s=>{ if(s.status && s.status!=='available') return; const b = (agg[s.boatId] ||= { FULL:0, AM:0, PM:0, total:0 }); b[s.part]++; b.total++; });
    return agg;
  },[slots]);

  // Nouveau: agrégat par expérience pour affichage cartes (compte de slots disponibles)
  const expAvail = useMemo(()=>{
    const agg: Record<number,{ FULL:number; AM:number; PM:number; total:number }> = {};
    expSlots.forEach(s=>{ 
      if(s.status && s.status!=='available') return; 
      const e = (agg[s.experienceId] ||= { FULL:0, AM:0, PM:0, total:0 }); 
      e[s.part as 'AM' | 'PM' | 'FULL']++; 
      e.total++; 
    });
    return agg;
  },[expSlots]);

  // DateHeader custom (vue mois) pour mettre en avant les jours avec disponibilité
  const DateHeader = ({ label, date }: { label: string; date: Date }) => {
    const key = localKey(date.toISOString());
    const data = availabilityMap[key];
    const has = !!data;
    const isActive = activeDay === key && showAll && !selectedBoat;
    let wrapperCls = 'relative flex items-center justify-between pr-1 pl-1 pt-1 pb-0.5 rounded-sm transition-colors duration-150';
    if (isActive) {
      // Sélection active: plein fond primaire
      wrapperCls += ' bg-[color:var(--primary)] text-white border border-[color:var(--primary)] shadow-sm';
    } else if (has) {
      wrapperCls += ' bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 shadow-[0_0_0_1px_#bfdbfe] text-blue-900 hover:brightness-105';
    } else {
      wrapperCls += ' bg-slate-50 border border-slate-100 text-slate-300';
    }
    const badgeCls = isActive
      ? 'ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-1.5 py-[2px] border border-white/30 text-[9px] font-semibold text-white shadow-sm'
      : 'ml-1 inline-flex items-center gap-1 rounded-full bg-white/80 backdrop-blur px-1.5 py-[2px] border border-blue-200 text-[9px] font-semibold text-blue-700 shadow-sm';
    return (
      <div className={wrapperCls}>
        <span>{label}</span>
        {has && <span className={badgeCls}>{data.boats.size}</span>}
      </div>
    );
  };

  async function saveNote(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    if (!editingSlot) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/availability/slot/${editingSlot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteEdit }),
      });
      if (res.ok) {
        setSlots(slots =>
          slots.map(s =>
            s.id === editingSlot.id ? { ...s, note: noteEdit } : s
          )
        );
        setEditingSlot(null);
      } else {
        // Optionally handle error
        alert('Failed to save note');
      }
    } catch {
      alert('Error saving note');
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    if (!editingSlot) return;
    if (!window.confirm(locale === 'fr' ? 'Supprimer ce créneau ?' : 'Delete this slot?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/availability/slot/${editingSlot.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSlots(slots => slots.filter(s => s.id !== editingSlot.id));
        setEditingSlot(null);
      } else {
        alert(locale === 'fr' ? 'Échec de la suppression' : 'Failed to delete slot');
      }
    } catch {
      alert(locale === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting slot');
    } finally {
      setSaving(false);
    }
  }

  // Main render
  return (
    <div className="flex flex-row gap-6">
      <div className='h-[75vh] bg-white/90 backdrop-blur rounded-xl border border-black/10 p-2 shadow-inner shadow-white/40 relative overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.15),transparent_70%)]' />
        <Calendar
          localizer={localizer}
          date={date}
          onNavigate={setDate}
          view={Views.MONTH}
          onView={()=>{}}
          events={events}
          startAccessor='start'
          endAccessor='end'
          components={{ month: { dateHeader: DateHeader } }}
          onSelectEvent={onSelectEvent}
          eventPropGetter={eventPropGetter}
          style={{ height: '90vh', fontSize: '1.1rem' }}
          onShowMore={(evts, date) => setShowMoreDay({ date, events: evts })}
        />
        {/* Modal infos réservation */}
        {reservationInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-lg" onClick={()=>setReservationInfo(null)}>×</button>
              <h2 className="text-xl font-bold mb-2 text-red-600">Détails de la réservation</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Bateau :</strong> {boats.find(b=>b.id===reservationInfo.boatId)?.name || reservationInfo.boatId || 'N/A'}</div>
                <div><strong>Période :</strong> {reservationInfo.startDate.slice(0,10)} → {reservationInfo.endDate.slice(0,10)}
                  <span className='ml-2 text-xs text-black/60'>({(() => {
                    const d1 = new Date(reservationInfo.startDate);
                    const d2 = new Date(reservationInfo.endDate);
                    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000*60*60*24)) + 1;
                    return diff > 1 ? diff + ' jours' : '1 jour';
                  })()})</span>
                </div>
                <div><strong>Statut :</strong> {
                  reservationInfo.status === 'pending' ? 'En attente' :
                  reservationInfo.status === 'pending_deposit' ? 'Acompte payé, paiement complet en attente' :
                  reservationInfo.status === 'confirmed' ? 'Confirmée' :
                  reservationInfo.status === 'cancelled' ? 'Annulée' :
                  reservationInfo.status === 'paid' ? 'Payée' :
                  reservationInfo.status
                }</div>
                {/* Ajoutez d'autres infos si dispo, ex: client, acompte, facture */}
              </div>
            </div>
          </div>
        )}
        {/* Modal showMore (liste des événements du jour) */}
        {showMoreDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-lg" onClick={()=>setShowMoreDay(null)}>×</button>
              <h2 className="text-xl font-bold mb-2 text-blue-600">{locale==='fr' ? 'Événements du jour' : 'Day events'}</h2>
              <div className="space-y-2 text-sm">
                <div className="mb-2 text-xs text-black/60">{showMoreDay.date.toLocaleDateString('fr-FR')}</div>
                {showMoreDay.events.length === 0 && <div className="text-black/50">{locale==='fr' ? 'Aucun événement' : 'No events'}</div>}
                {showMoreDay.events.map((ev, idx) => (
                  <div key={ev.id || idx} className="border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                    <div className="font-semibold">
                      {ev.type === 'slot' && <span className="text-yellow-600">{boats.find(b=>b.id===ev.slotData?.boatId)?.name || '#'} : {ev.slotData?.part}</span>}
                      {ev.type === 'expSlot' && <span className="text-purple-600">EXP {experiences.find(e=>e.id===ev.expSlotData?.experienceId)?.[locale==='fr'?'titleFr':'titleEn'] || 'Exp'} : {ev.expSlotData?.part}</span>}
                      {ev.type === 'reservation' && <span className="text-red-600">{boats.find(b=>b.id===ev.resData?.boatId)?.name || '#'} : {locale==='fr'?'Réservation':'Reservation'}</span>}
                    </div>
                    {ev.slotData?.note && <div className="text-xs text-black/60">Note : {ev.slotData.note}</div>}
                    {ev.expSlotData?.note && <div className="text-xs text-black/60">Note : {ev.expSlotData.note}</div>}
                    {ev.resData && (
                      <div className="text-xs text-black/60">
                        Période : {ev.resData.startDate.slice(0,10)} → {ev.resData.endDate.slice(0,10)}
                        <span className='ml-2 text-xs text-black/60'>({(() => {
                          const d1 = new Date(ev.resData.startDate);
                          const d2 = new Date(ev.resData.endDate);
                          const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000*60*60*24)) + 1;
                          return diff > 1 ? diff + ' jours' : '1 jour';
                        })()})</span>
                        <br />
                        Statut : {
                          ev.resData.status === 'pending' ? 'En attente' :
                          ev.resData.status === 'pending_deposit' ? 'Acompte payé, paiement complet en attente' :
                          ev.resData.status === 'confirmed' ? 'Confirmée' :
                          ev.resData.status === 'cancelled' ? 'Annulée' :
                          ev.resData.status === 'paid' ? 'Payée' :
                          ev.resData.status
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className='mt-2 text-[10px] text-slate-500'>Jours surlignés = au moins un bateau dispo ({locale==='fr'?'nombre de bateaux':'boat count'}). Glisser pour créer plusieurs jours (sélectionnez un bateau).</p>
      </div>
      <aside className='w-full lg:w-72 shrink-0 space-y-6'>
        <div className='mb-6 p-4 rounded-xl bg-white/80 border border-black/10 shadow-sm'>
          <h3 className='font-bold text-sm mb-2'>{locale==='fr' ? 'Code couleur des créneaux' : 'Slot color legend'}</h3>
          <ul className='space-y-2 text-xs'>
            <li className='flex items-center gap-2'><span style={{display:'inline-block',width:18,height:18,borderRadius:6,background:'linear-gradient(135deg,#fde047,#fff)',border:'2px solid #facc15'}}></span> <span>AM (matin) : jaune</span></li>
            <li className='flex items-center gap-2'><span style={{display:'inline-block',width:18,height:18,borderRadius:6,background:'linear-gradient(135deg,#22c55e,#fff)',border:'2px solid #16a34a'}}></span> <span>PM (après-midi) : vert</span></li>
            <li className='flex items-center gap-2'><span style={{display:'inline-block',width:18,height:18,borderRadius:6,background:'linear-gradient(135deg,#2563eb,#fff)',border:'2px solid #1d4ed8'}}></span> <span>Journée complète : bleu</span></li>
            <li className='flex items-center gap-2'><span style={{display:'inline-block',width:18,height:18,borderRadius:6,background:'linear-gradient(135deg,#a78bfa,#fff)',border:'2px solid #7c3aed'}}></span> <span>Expérience : violet</span></li>
            <li className='flex items-center gap-2'><span style={{display:'inline-block',width:18,height:18,borderRadius:6,background:'linear-gradient(90deg,#ef4444 60%,#f87171 100%)',border:'2px solid #b91c1c'}}></span> <span>Rouge : réservé</span></li>
          </ul>
        </div>
        <div className='space-y-4'>
          <div>
            <div className='flex items-center justify-between mb-1'>
              <h3 className='font-semibold text-sm'>{locale==='fr'?'Bateaux':'Boats'}</h3>
              <button onClick={()=>{ if (showAll) { setShowAll(false); } else { setSelectedBoat(null); setSelectedExperience(null); setShowAll(true); } }} className='text-[10px] px-2 py-1 rounded border border-black/20 hover:bg-black/5'>
                {showAll ? (locale==='fr'?'Masquer tout':'Hide all') : (locale==='fr'?'Vue globale':'Global view')}
              </button>
            </div>
            <div className='grid grid-cols-1 gap-2 max-h-[38vh] overflow-auto pr-1'>
              {boats.map(b=>{ const stats = boatAvail[b.id]; const active = selectedBoat===b.id && !showAll; return (
                <button key={b.id} onClick={()=>{ setSelectedBoat(b.id); setSelectedExperience(null); setShowAll(false); }} className={'group relative text-left rounded-lg border p-2 flex items-center gap-3 transition shadow-sm hover:shadow focus:outline-none '+(active? 'border-[color:var(--primary)] ring-2 ring-[color:var(--primary)]/40 bg-[color:var(--primary)]/5':'border-black/15 bg-white hover:bg-black/5')}>
                  {b.imageUrl && <img src={b.imageUrl} alt='' className='w-16 h-12 object-cover rounded-md border border-black/10' />}
                  {!b.imageUrl && <div className='w-16 h-12 flex items-center justify-center rounded-md border border-black/10 bg-black/5 text-[9px] font-medium'>{b.name}</div>}
                  <div className='flex-1 min-w-0'>
                    <p className='text-[11px] font-semibold leading-tight truncate'>{b.name}</p>
                    <p className='text-[9px] text-black/50'>{stats? stats.total:0} {locale==='fr'?'créneaux':'slots'}</p>
                  </div>
                  {active && <span className='text-[8px] px-2 py-1 rounded-full bg-[color:var(--primary)] text-white font-semibold'>OK</span>}
                </button> ); })}
              {boats.length===0 && <div className='text-xs text-black/50'>{locale==='fr'?'Aucun bateau':'No boats'}</div>}
            </div>
          </div>
          <div>
            <h3 className='font-semibold text-sm mb-1'>{locale==='fr'?'Expériences':'Experiences'}</h3>
            <div className='grid grid-cols-1 gap-2 max-h-[32vh] overflow-auto pr-1'>
              {experiences.map(e=>{ const stats = expAvail[e.id]; const active = selectedExperience===e.id && !showAll; const title = e[locale==='fr'?'titleFr':'titleEn']; return (
                <button key={e.id} onClick={()=>{ setSelectedExperience(e.id); setSelectedBoat(null); setShowAll(false); }} className={'group relative text-left rounded-lg border p-2 flex items-center gap-3 transition shadow-sm hover:shadow focus:outline-none '+(active? 'border-purple-600 ring-2 ring-purple-400/40 bg-purple-50':'border-black/15 bg-white hover:bg-black/5')}>
                  {e.imageUrl && <img src={e.imageUrl} alt='' className='w-12 h-10 object-cover rounded-md border border-black/10' />}
                  {!e.imageUrl && <div className='w-12 h-10 flex items-center justify-center rounded-md border border-black/10 bg-black/5 text-[9px] font-medium'>EXP</div>}
                  <div className='flex-1 min-w-0'>
                    <p className='text-[10px] font-semibold leading-tight truncate'>{title}</p>
                    <p className='text-[8px] text-black/50'>{stats? stats.total:0} {locale==='fr'?'créneaux':'slots'}</p>
                  </div>
                  {active && <span className='text-[8px] px-2 py-1 rounded-full bg-purple-600 text-white font-semibold'>OK</span>}
                </button> ); })}
              {experiences.length===0 && <div className='text-xs text-black/50'>{locale==='fr'?'Aucune expérience':'No experiences'}</div>}
            </div>
          </div>
          {(selectedBoat || selectedExperience) && !showAll && (
            <button onClick={()=>{ setSelectedBoat(null); setSelectedExperience(null); setShowAll(true); }} className='w-full mt-1 text-left px-3 py-2 rounded border text-[11px] bg-black/5 hover:bg-black/10'>↺ {locale==='fr'?'Réinitialiser':'Reset'}</button>
          )}
          <p className='text-[10px] text-black/40'>{locale==='fr'?"Clique une carte (bateau ou expérience) pour gérer les créneaux":"Click a boat or experience to manage slots"}</p>
        </div>
        {editingSlot && (
          <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-5 w-full max-w-sm space-y-4'>
              <h3 className='font-semibold text-sm'>{locale==='fr'?'Modifier créneau':'Edit slot'}</h3>
              <p className='text-xs text-black/60'>{editingSlot.date} {editingSlot.part}</p>
              <textarea value={noteEdit} onChange={e=>setNoteEdit(e.target.value)} className='w-full h-24 border border-black/20 rounded p-2 text-xs' placeholder='Note' />
              <div className='flex gap-2'>
                <button onClick={saveNote} className='flex-1 h-9 rounded bg-[color:var(--primary)] text-white text-xs'>Save</button>
                <button onClick={removeSlot} className='h-9 rounded bg-red-600 text-white text-xs px-3'>Delete</button>
                <button onClick={()=>setEditingSlot(null)} className='h-9 rounded bg-black/10 text-xs px-3'>Close</button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
