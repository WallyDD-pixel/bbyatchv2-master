"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Views, View } from 'react-big-calendar';
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

interface Boat { id: number; name: string; slug: string; imageUrl?: string|null; options?: Array<{ id: number; label: string; price: number | null }> }
interface Slot { id: number; boatId: number; date: string; part: 'AM'|'PM'|'FULL'|'SUNSET'; status: string; note?: string|null }
interface Reservation {
  id: string;
  boatId?: number|null;
  startDate: string;
  endDate: string;
  status: string;
  part?: string | null;
  passengers?: number | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  metadata?: string | null;
  boat?: Boat | null;
  user?: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string } | null;
}

function localKey(dateStr: string) { const d = new Date(dateStr); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function keyToDate(key: string) { return new Date(key + 'T00:00:00'); }

export default function CalendarClient({ locale }: { locale: 'fr'|'en' }) {
  // Couleurs pour les créneaux
  const [showMoreDay, setShowMoreDay] = useState<{date: Date, events: any[]} | null>(null);
  const eventPropGetter = (event: any) => {
    // Réservations : Rouge (événements spéciaux)
    if (event.type === 'reservation') {
      const part = event.resData?.part || 'FULL';
      // Si c'est un événement spécial (expérience avec horaires fixes), on garde le rouge
      const isSpecialEvent = event.resData?.metadata ? (() => {
        try {
          const meta = JSON.parse(event.resData.metadata);
          return meta?.experienceTitleFr || meta?.expSlug;
        } catch { return false; }
      })() : false;
      
      return {
        style: {
          background: isSpecialEvent ? 'linear-gradient(90deg,#ef4444 60%,#f87171 100%)' : 'linear-gradient(90deg,#ef4444 60%,#f87171 100%)',
          border: '2px solid #b91c1c',
          color: '#fff',
        }
      };
    }
    // Expériences : Rouge (événements spéciaux)
    if (event.type === 'expSlot') {
      return {
        style: {
          background: 'linear-gradient(90deg,#ef4444 60%,#f87171 100%)',
          border: '2px solid #b91c1c',
          color: '#fff',
        }
      };
    }
    // Slots classiques - Nouveau code couleur
    if (event.type === 'slot') {
      switch (event.slotData?.part) {
        case 'AM':
        case 'PM':
          // Vert : Demi-journée (4h)
          return {
            style: {
              background: '#22c55e',
              border: '2px solid #16a34a',
              color: '#fff',
            }
          };
        case 'SUNSET':
          // Orange : Sunset (2h)
          return {
            style: {
              background: '#f97316',
              border: '2px solid #ea580c',
              color: '#fff',
            }
          };
        case 'FULL':
          // Bleu : Journée complète (8h)
          return {
            style: {
              background: '#2563eb',
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
    // Masquer le tooltip quand on clique sur un événement
    setHoveredEvent(null);
    setTooltipPosition(null);
    
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
  const [boatExperiencesList, setBoatExperiencesList] = useState<any[]>([]); // Expériences liées au bateau sélectionné
  const [view, setView] = useState<View>(Views.MONTH);
  const [hoveredEvent, setHoveredEvent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  
  // États pour la gestion des liens bateau-expérience
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [linkBoatId, setLinkBoatId] = useState<number | null>(null);
  const [linkExperienceId, setLinkExperienceId] = useState<number | null>(null);
  const [linkPrice, setLinkPrice] = useState<string>('');
  const [boatExperiences, setBoatExperiences] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  
  // États pour la création de créneaux
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotEndDate, setNewSlotEndDate] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [newSlotPart, setNewSlotPart] = useState<'FULL'|'AM'|'PM'|'SUNSET'>('FULL');
  const [newSlotNote, setNewSlotNote] = useState('');

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
  
  // Charger les expériences liées au bateau sélectionné
  useEffect(() => {
    if (selectedBoat) {
      fetch(`/api/admin/boat-experiences?boatId=${selectedBoat}`)
        .then(res => res.json())
        .then(data => {
          const expList = (data.boatExperiences || []).map((be: any) => be.experience);
          setBoatExperiencesList(expList);
        })
        .catch(() => setBoatExperiencesList([]));
    } else {
      setBoatExperiencesList([]);
    }
  }, [selectedBoat]);

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
        // Corriger les dates pour éviter les problèmes de fuseau horaire
        const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
        const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        const boatName = r.boat?.name || boats.find(b=>b.id===r.boatId)?.name || '#';
        const price = r.totalPrice ? `${r.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '';
        ev.push({ 
          id: 'res-'+r.id, 
          title: `${boatName}${price ? ' - ' + price : ''}`, 
          start, 
          end, 
          allDay: true, // Marquer comme événement journée entière pour un meilleur affichage
          type:'reservation', 
          resData:r 
        });
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
      reservations.filter(r=>r.boatId===selectedBoat).forEach(r => { 
        const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
        const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        ev.push({ 
          id: 'res-'+r.id, 
          title: (locale==='fr'?'Réservation':'Reservation'), 
          start, 
          end, 
          allDay: true,
          type:'reservation', 
          resData:r 
        }); 
      });
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
    const agg: Record<number,{ FULL:number; AM:number; PM:number; SUNSET:number; total:number }> = {};
    slots.forEach(s=>{ 
      if(s.status && s.status!=='available') return; 
      const b = (agg[s.boatId] ||= { FULL:0, AM:0, PM:0, SUNSET:0, total:0 }); 
      const part = s.part as 'FULL'|'AM'|'PM'|'SUNSET';
      if (part === 'FULL' || part === 'AM' || part === 'PM' || part === 'SUNSET') {
        b[part]++;
      }
      b.total++; 
    });
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

  // Map des dates avec des notes (pour afficher l'icône de cloche)
  const datesWithNotes = useMemo(()=>{
    const map = new Set<string>();
    slots.forEach(s => {
      if (s.note && s.note.trim()) {
        map.add(s.date);
      }
    });
    expSlots.forEach(s => {
      if (s.note && s.note.trim()) {
        map.add(s.date);
      }
    });
    return map;
  }, [slots, expSlots]);

  // DateHeader custom (vue mois) style Google Calendar avec badge de notification
  const DateHeader = ({ label, date }: { label: string; date: Date }) => {
    const key = localKey(date.toISOString());
    const data = availabilityMap[key];
    const has = !!data;
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const hasNote = datesWithNotes.has(key);
    
    // Compter les événements pour ce jour (corriger la comparaison de dates)
    const dayEvents = events.filter((ev: any) => {
      if (!ev.start) return false;
      const evDate = new Date(ev.start);
      const cellDate = new Date(date);
      // Normaliser les dates à minuit pour la comparaison
      evDate.setHours(0, 0, 0, 0);
      cellDate.setHours(0, 0, 0, 0);
      // Vérifier si l'événement commence ce jour ou si c'est un événement multi-jours qui couvre ce jour
      const evStart = evDate.getTime();
      const evEnd = ev.end ? new Date(ev.end).setHours(23, 59, 59, 999) : evStart;
      const cellStart = cellDate.getTime();
      const cellEnd = cellDate.getTime() + 86400000 - 1; // Fin de la journée
      return (evStart <= cellEnd && evEnd >= cellStart);
    });
    const eventCount = dayEvents.length;
    const hasMultipleEvents = eventCount > 3; // Afficher badge si plus de 3 événements
    
    return (
      <div className="rbc-date-cell" style={{ padding: '8px', textAlign: 'right', position: 'relative' }}>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); }}
          style={{
            display: 'inline-block',
            minWidth: '24px',
            textAlign: 'center',
            padding: '2px 4px',
            borderRadius: '50%',
            color: isToday ? '#fff' : '#3c4043',
            backgroundColor: isToday ? '#1a73e8' : 'transparent',
            fontWeight: isToday ? 500 : 400,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isToday) {
              (e.target as HTMLElement).style.backgroundColor = '#f1f3f4';
            }
          }}
          onMouseLeave={(e) => {
            if (!isToday) {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          {label}
        </a>
        {/* Icône de cloche pour les dates avec notes */}
        {hasNote && (
          <span 
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              fontSize: '12px',
              lineHeight: '1',
              color: '#f59e0b',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))',
            }}
            title={locale === 'fr' ? 'Note associée à cette date' : 'Note associated with this date'}
          >
            🔔
          </span>
        )}
        {hasMultipleEvents && (
          <span 
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ea4335',
              border: '1px solid #fff',
              boxShadow: '0 0 0 1px #ea4335',
            }}
            title={`${eventCount} ${locale === 'fr' ? 'événements' : 'events'}`}
          />
        )}
      </div>
    );
  };

  async function saveNote(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    if (!editingSlot) return;
    setSaving(true);
    try {
      // Détecter si c'est un slot d'expérience (a un experienceId) ou un slot de bateau
      const isExpSlot = (editingSlot as any).experienceId !== undefined;
      const endpoint = isExpSlot 
        ? '/api/admin/availability/experiences'
        : `/api/admin/availability/slot/${editingSlot.id}`;
      
      const res = await fetch(endpoint, {
        method: isExpSlot ? 'PATCH' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSlot.id,
          note: noteEdit.trim() || null 
        }),
      });
      
      if (res.ok) {
        if (isExpSlot) {
          setExpSlots(slots =>
            slots.map(s =>
              s.id === editingSlot.id ? { ...s, note: noteEdit.trim() || null } : s
            )
          );
        } else {
          setSlots(slots =>
            slots.map(s =>
              s.id === editingSlot.id ? { ...s, note: noteEdit.trim() || null } : s
            )
          );
        }
        setEditingSlot(null);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'unknown' }));
        alert(locale === 'fr' 
          ? `Impossible d'enregistrer la note: ${errorData.error || 'Erreur inconnue'}` 
          : `Failed to save note: ${errorData.error || 'Unknown error'}`
        );
      }
    } catch (e: any) {
      alert(locale === 'fr' 
        ? `Erreur lors de l'enregistrement: ${e?.message || 'Erreur inconnue'}` 
        : `Error saving note: ${e?.message || 'Unknown error'}`
      );
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

  // Fonction pour générer une liste de dates entre deux dates
  function generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  // Fonction pour ajouter/retirer une date de la sélection
  function toggleDateSelection(date: string): void {
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date);
      } else {
        return [...prev, date].sort();
      }
    });
  }

  // Fonction pour sélectionner une plage de dates
  function selectDateRange(): void {
    if (!newSlotDate || !newSlotEndDate) return;
    
    const dates = generateDateRange(newSlotDate, newSlotEndDate);
    setSelectedDates(dates);
  }

  // Fonctions pour gérer les liens bateau-expérience
  async function loadBoatExperiences() {
    if (!linkBoatId) return;
    setLoadingLinks(true);
    try {
      const res = await fetch(`/api/admin/boat-experiences?boatId=${linkBoatId}`);
      const data = await res.json();
      if (data.boatExperiences) {
        setBoatExperiences(data.boatExperiences);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des liens:', error);
    } finally {
      setLoadingLinks(false);
    }
  }

  async function createBoatExperienceLink() {
    if (!linkBoatId || !linkExperienceId) {
      alert(locale === 'fr' ? 'Sélectionnez un bateau et une expérience' : 'Select a boat and experience');
      return;
    }

    setLoadingLinks(true);
    try {
      const res = await fetch('/api/admin/boat-experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boatId: linkBoatId,
          experienceId: linkExperienceId,
          price: linkPrice ? Number(linkPrice) : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(locale === 'fr' ? 'Lien créé avec succès !' : 'Link created successfully!');
        setLinkPrice('');
        loadBoatExperiences(); // Recharger la liste
      } else {
        const error = await res.json();
        alert(locale === 'fr' ? `Erreur: ${error.error}` : `Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la création du lien:', error);
      alert(locale === 'fr' ? 'Erreur lors de la création du lien' : 'Error creating link');
    } finally {
      setLoadingLinks(false);
    }
  }

  async function deleteBoatExperienceLink(boatId: number, experienceId: number) {
    if (!confirm(locale === 'fr' ? 'Supprimer ce lien ?' : 'Delete this link?')) return;

    setLoadingLinks(true);
    try {
      const res = await fetch(`/api/admin/boat-experiences?boatId=${boatId}&experienceId=${experienceId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert(locale === 'fr' ? 'Lien supprimé avec succès !' : 'Link deleted successfully!');
        loadBoatExperiences(); // Recharger la liste
      } else {
        const error = await res.json();
        alert(locale === 'fr' ? `Erreur: ${error.error}` : `Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du lien:', error);
      alert(locale === 'fr' ? 'Erreur lors de la suppression du lien' : 'Error deleting link');
    } finally {
      setLoadingLinks(false);
    }
  }

  // Charger les liens quand le bateau change
  useEffect(() => {
    if (linkBoatId && showLinkManager) {
      loadBoatExperiences();
    }
  }, [linkBoatId, showLinkManager]);

  async function addSlot(): Promise<void> {
    if (selectedBoat && !selectedExperience) {
      alert(locale === 'fr' 
        ? 'Veuillez sélectionner une expérience pour ce bateau avant d\'ajouter un créneau.'
        : 'Please select an experience for this boat before adding a slot.'
      );
      return;
    }
    if (!selectedBoat && !selectedExperience) {
      alert(locale === 'fr' ? 'Sélectionnez un bateau ou une expérience' : 'Select a boat or experience');
      return;
    }

    let datesToProcess: string[] = [];
    
    if (isMultiDateMode) {
      if (selectedDates.length === 0) {
        alert(locale === 'fr' ? 'Sélectionnez au moins une date' : 'Select at least one date');
        return;
      }
      datesToProcess = selectedDates;
    } else {
      if (!newSlotDate) {
        alert(locale === 'fr' ? 'Sélectionnez une date' : 'Select a date');
        return;
      }
      datesToProcess = [newSlotDate];
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Créer les créneaux pour chaque date sélectionnée
      for (const date of datesToProcess) {
        try {
          let res: Response;
          
          if (selectedExperience) {
            // Créer un créneau d'expérience (avec boatId si un bateau est sélectionné)
            res = await fetch('/api/admin/availability/experiences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                experienceId: selectedExperience,
                boatId: selectedBoat || null, // Inclure boatId si un bateau est sélectionné
                date: date,
                part: newSlotPart,
                note: newSlotNote.trim() || null,
              }),
            });
            
            if (res.ok) {
              const result = await res.json();
              if (result.toggled === 'added' && result.slot) {
                setExpSlots(slots => [...slots, { ...result.slot, date: localKey(result.slot.date) }]);
                successCount++;
              }
            } else {
              errorCount++;
            }
          } else if (selectedBoat) {
            // Créer un créneau de bateau
            res = await fetch('/api/admin/availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boatId: selectedBoat,
                date: date,
                part: newSlotPart,
                note: newSlotNote.trim() || null,
              }),
            });
            
            if (res.ok) {
              const result = await res.json();
              if (result.toggled === 'added' && result.slot) {
                setSlots(slots => [...slots, { ...result.slot, date: localKey(result.slot.date) }]);
                successCount++;
              }
            } else {
              errorCount++;
            }
          }
        } catch {
          errorCount++;
        }
      }

      // Recharger les données
      await load(date);

      // Réinitialiser les champs
      setNewSlotDate('');
      setNewSlotEndDate('');
      setSelectedDates([]);
      setNewSlotNote('');
      setShowAddSlot(false);

      // Afficher le résultat
      if (successCount > 0 && errorCount === 0) {
        alert(locale === 'fr' 
          ? `${successCount} créneau${successCount > 1 ? 'x' : ''} ajouté${successCount > 1 ? 's' : ''} avec succès`
          : `${successCount} slot${successCount > 1 ? 's' : ''} added successfully`
        );
      } else if (successCount > 0 && errorCount > 0) {
        alert(locale === 'fr' 
          ? `${successCount} créneau${successCount > 1 ? 'x' : ''} ajouté${successCount > 1 ? 's' : ''}, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`
          : `${successCount} slot${successCount > 1 ? 's' : ''} added, ${errorCount} error${errorCount > 1 ? 's' : ''}`
        );
      } else {
        alert(locale === 'fr' 
          ? 'Aucun créneau n\'a pu être ajouté'
          : 'No slots could be added'
        );
      }
    } catch (e: any) {
      alert(locale === 'fr' 
        ? `Erreur lors de l'ajout: ${e?.message || 'Erreur inconnue'}` 
        : `Error adding slots: ${e?.message || 'Unknown error'}`
      );
    } finally {
      setSaving(false);
    }
  }

  // Main render
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className='flex-1 min-w-0 h-[75vh] bg-white rounded-xl border border-gray-200 shadow-lg relative overflow-hidden transition-all duration-300' style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <Calendar
          localizer={localizer}
          date={date}
          onNavigate={(newDate) => {
            setDate(newDate);
          }}
          view={view}
          onView={(newView) => {
            setView(newView);
          }}
          events={events}
          startAccessor='start'
          endAccessor='end'
          onSelectSlot={(slotInfo) => {
            // Gestion du clic sur une date vide
            if (selectedBoat || selectedExperience) {
              const clickedDate = slotInfo.start.toISOString().split('T')[0];
              
              // Ouvrir le formulaire si nécessaire et activer le mode multi-dates
              if (!showAddSlot) {
                setShowAddSlot(true);
                setIsMultiDateMode(true);
              }
              
              // Toujours ajouter/retirer la date de la sélection
              setSelectedDates(prev => {
                if (prev.includes(clickedDate)) {
                  return prev.filter(d => d !== clickedDate);
                } else {
                  return [...prev, clickedDate].sort();
                }
              });
            }
          }}
          selectable={selectedBoat !== null || selectedExperience !== null}
          components={{ 
            month: { dateHeader: DateHeader },
            event: (props: any) => {
              const event = props.event;
              const isReservation = event.type === 'reservation';
              const boatName = isReservation ? (event.resData?.boat?.name || boats.find((b: Boat) => b.id === event.resData?.boatId)?.name || '') : (boats.find((b: Boat) => b.id === event.slotData?.boatId)?.name || '');
              const price = isReservation && event.resData?.totalPrice ? `${event.resData.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '';
              
              return (
                <div
                  className="w-full h-full px-1.5 py-0.5 text-xs font-normal cursor-pointer group/event"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (isReservation) {
                      setHoveredEvent(event);
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredEvent(null);
                    setTooltipPosition(null);
                  }}
                  onClick={() => onSelectEvent(event)}
                  title={boatName + (price ? ' - ' + price : '')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEvent(event);
                    }
                  }}
                >
                  <div className="truncate leading-tight font-medium group-hover/event:font-semibold transition-all" style={{ lineHeight: '1.3' }}>{boatName}</div>
                  {price && <div className="text-[10px] opacity-75 truncate mt-0.5 group-hover/event:opacity-100 transition-opacity" style={{ lineHeight: '1.2' }}>{price}</div>}
                </div>
              );
            }
          }}
          onSelectEvent={onSelectEvent}
          eventPropGetter={eventPropGetter}
          style={{ height: '70vh' }}
          onShowMore={(evts, date) => setShowMoreDay({ date, events: evts })}
        />
        {/* Modal "X autres" événements - Amélioré */}
        {showMoreDay && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
            onClick={() => setShowMoreDay(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                <h3 id="modal-title" className="text-xl font-bold text-gray-900">
                  {locale === 'fr' ? 'Événements du' : 'Events on'} {showMoreDay.date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <button 
                  onClick={() => setShowMoreDay(null)}
                  className="text-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                  aria-label={locale === 'fr' ? 'Fermer' : 'Close'}
                >
                  ×
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {showMoreDay.events.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{locale === 'fr' ? 'Aucun événement' : 'No events'}</p>
                ) : (
                  showMoreDay.events.map((ev: any, idx: number) => {
                    const isReservation = ev.type === 'reservation';
                    const boatName = isReservation 
                      ? (ev.resData?.boat?.name || boats.find((b: Boat) => b.id === ev.resData?.boatId)?.name || 'N/A')
                      : (boats.find((b: Boat) => b.id === ev.slotData?.boatId)?.name || 'N/A');
                    const partLabel = ev.resData?.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                                     ev.resData?.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                                     ev.resData?.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                                     ev.resData?.part === 'SUNSET' ? 'Sunset' : ev.slotData?.part || '';
                    
                    const eventColor = isReservation ? '#ea4335' : 
                                      ev.slotData?.part === 'FULL' ? '#4285f4' :
                                      ev.slotData?.part === 'AM' || ev.slotData?.part === 'PM' ? '#34a853' :
                                      ev.slotData?.part === 'SUNSET' ? '#fbbc04' : '#999';
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setShowMoreDay(null);
                          onSelectEvent(ev);
                        }}
                        className="p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white cursor-pointer transition-all duration-200 group"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowMoreDay(null);
                            onSelectEvent(ev);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-4 h-4 rounded flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: eventColor }}
                          />
                          <span className="font-bold text-base text-gray-900 group-hover:text-[color:var(--primary)] transition-colors">{boatName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 ml-7">
                          <span className="font-medium">{partLabel}</span>
                          {isReservation && ev.resData?.totalPrice && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="font-semibold text-[color:var(--primary)]">
                                {ev.resData.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Modal infos réservation détaillée */}
        {reservationInfo && (() => {
          const r = reservationInfo;
          const boatName = r.boat?.name || boats.find(b=>b.id===r.boatId)?.name || 'N/A';
          const clientName = r.user?.name || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.user?.email || 'N/A';
          const meta = r.metadata ? (() => { try { return JSON.parse(r.metadata); } catch { return null; } })() : null;
          const partLabel = r.part === 'FULL' ? (locale==='fr'?'Journée entière (8h)':'Full day (8h)') : 
                           r.part === 'AM' ? (locale==='fr'?'Matin (4h)':'Morning (4h)') : 
                           r.part === 'PM' ? (locale==='fr'?'Après-midi (4h)':'Afternoon (4h)') : 
                           r.part === 'SUNSET' ? 'Sunset (2h)' : r.part || '';
          
          // Horaires
          const getTimeRange = () => {
            if (r.part === 'AM') return '9h-13h';
            if (r.part === 'PM') return '14h-18h';
            if (r.part === 'SUNSET') return '18h-20h';
            if (r.part === 'FULL') return '9h-17h';
            return '';
          };
          
          // Options sélectionnées
          const selectedOptionIds = meta?.optionIds || [];
          const selectedOptions = r.boat?.options?.filter((o: any) => selectedOptionIds.includes(o.id)) || [];
          
          // Expérience
          const experienceTitle = meta?.experienceTitleFr || meta?.experienceTitleEn || meta?.expSlug || null;
          
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                <button className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black" onClick={()=>{setReservationInfo(null); setHoveredEvent(null); setTooltipPosition(null);}}>×</button>
                <h2 className="text-2xl font-bold mb-4 text-red-600">{locale==='fr'?'Détails de la réservation':'Reservation details'}</h2>
                
                <div className="space-y-4 text-sm">
                  {/* Informations principales */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <strong className="text-gray-700">{locale==='fr'?'Bateau':'Boat'}:</strong>
                      <div className="text-base font-semibold text-[color:var(--primary)]">{boatName}</div>
                    </div>
                    <div>
                      <strong className="text-gray-700">{locale==='fr'?'Client':'Client'}:</strong>
                      <div className="text-base font-semibold">{clientName}</div>
                      {r.user?.email && <div className="text-xs text-gray-500">{r.user.email}</div>}
                    </div>
                  </div>
                  
                  {/* Période et type */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="mb-2">
                      <strong className="text-gray-700">{locale==='fr'?'Période':'Period'}:</strong>
                      <div className="text-base">
                        {(() => {
                          const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate.slice(0,10);
                          const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate.slice(0,10);
                          const d1 = new Date(startDateStr + 'T00:00:00');
                          const d2 = new Date(endDateStr + 'T00:00:00');
                          const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000*60*60*24)) + 1;
                          return (
                            <>
                              {startDateStr} → {endDateStr}
                              <span className='ml-2 text-xs text-gray-600'>
                                ({diff > 1 ? diff + (locale==='fr'?' jours':' days') : (locale==='fr'?'1 jour':'1 day')})
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-700">{locale==='fr'?'Type de prestation':'Service type'}:</strong>
                      <div className="text-base">{partLabel}</div>
                      {getTimeRange() && <div className="text-xs text-gray-600">{locale==='fr'?'Horaires':'Times'}: {getTimeRange()}</div>}
                    </div>
                  </div>
                  
                  {/* Expérience si applicable */}
                  {experienceTitle && (
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Expérience':'Experience'}:</strong>
                      <div className="text-base font-semibold">{experienceTitle}</div>
                    </div>
                  )}
                  
                  {/* Passagers et enfants */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    {r.passengers && (
                      <div className="mb-2">
                        <strong className="text-gray-700">{locale==='fr'?'Nombre de passagers':'Number of passengers'}:</strong>
                        <div className="text-base">{r.passengers}</div>
                      </div>
                    )}
                    {meta?.childrenCount && (
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Enfants à bord':'Children on board'}:</strong>
                        <div className="text-base">{meta.childrenCount}</div>
                        {meta.childrenAges && <div className="text-xs text-gray-600">{locale==='fr'?'Âges':'Ages'}: {meta.childrenAges}</div>}
                      </div>
                    )}
                  </div>
                  
                  {/* Options sélectionnées */}
                  {selectedOptions.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Options sélectionnées':'Selected options'}:</strong>
                      <ul className="mt-2 space-y-1">
                        {selectedOptions.map((opt: any) => (
                          <li key={opt.id} className="text-sm">• {opt.label} {opt.price ? `(+${opt.price}€)` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Demandes spécifiques */}
                  {meta?.specialNeeds && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Demandes spécifiques':'Special requests'}:</strong>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{meta.specialNeeds}</div>
                    </div>
                  )}
                  
                  {/* Horaires flexibles */}
                  {meta?.preferredTime && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Horaire souhaité':'Preferred time'}:</strong>
                      <div className="text-sm mt-1">{meta.preferredTime}</div>
                    </div>
                  )}
                  
                  {/* Prix */}
                  <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                    <div className="grid grid-cols-2 gap-4">
                      {r.totalPrice && (
                        <div>
                          <strong className="text-gray-700">{locale==='fr'?'Prix total':'Total price'}:</strong>
                          <div className="text-lg font-bold text-[color:var(--primary)]">{r.totalPrice?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        </div>
                      )}
                      {r.depositAmount !== null && r.depositAmount !== undefined && (
                        <div>
                          <strong className="text-gray-700">{locale==='fr'?'Acompte':'Deposit'}:</strong>
                          <div className="text-base font-semibold">{r.depositAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        </div>
                      )}
                      {r.remainingAmount !== null && r.remainingAmount !== undefined && (
                        <div>
                          <strong className="text-gray-700">{locale==='fr'?'Reste à payer':'Remaining'}:</strong>
                          <div className="text-base font-semibold">{r.remainingAmount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Statut */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <strong className="text-gray-700">{locale==='fr'?'Statut':'Status'}:</strong>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        r.status === 'deposit_paid' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'pending_deposit' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.status === 'pending' ? (locale==='fr'?'En attente':'Pending') :
                         r.status === 'pending_deposit' ? (locale==='fr'?'Acompte en attente':'Deposit pending') :
                         r.status === 'deposit_paid' ? (locale==='fr'?'Acompte payé':'Deposit paid') :
                         r.status === 'completed' ? (locale==='fr'?'Terminée':'Completed') :
                         r.status === 'cancelled' ? (locale==='fr'?'Annulée':'Cancelled') :
                         r.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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
                        Période : {(() => {
                          const startDateStr = ev.resData.startDate.includes('T') ? ev.resData.startDate.split('T')[0] : ev.resData.startDate.slice(0,10);
                          const endDateStr = ev.resData.endDate.includes('T') ? ev.resData.endDate.split('T')[0] : ev.resData.endDate.slice(0,10);
                          const d1 = new Date(startDateStr + 'T00:00:00');
                          const d2 = new Date(endDateStr + 'T00:00:00');
                          const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000*60*60*24)) + 1;
                          return (
                            <>
                              {startDateStr} → {endDateStr}
                              <span className='ml-2'>({diff > 1 ? diff + ' jours' : '1 jour'})</span>
                            </>
                          );
                        })()}
                        <br />
                        Statut : {
                          ev.resData.status === 'pending' ? 'En attente' :
                          ev.resData.status === 'pending_deposit' ? 'Acompte payé, paiement complet en attente' :
                          ev.resData.status === 'deposit_paid' ? 'Acompte payé' :
                          ev.resData.status === 'confirmed' ? 'Confirmée' :
                          ev.resData.status === 'cancelled' ? 'Annulée' :
                          ev.resData.status === 'paid' ? 'Payée' :
                          ev.resData.status === 'completed' ? 'Terminée' :
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
        <div className='mb-6 p-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm'>
          <h3 className='font-bold text-sm mb-3 text-gray-800 flex items-center gap-2'>
            <span className="text-lg">🗂</span>
            {locale==='fr' ? 'Code couleur' : 'Color code'}
          </h3>
          <ul className='space-y-2.5 text-xs'>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#4285f4',borderLeft:'3px solid #1967d2'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Bleu : Journée complète (8h)':'Blue: Full day (8h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#34a853',borderLeft:'3px solid #137333'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Vert : Demi-journée (4h)':'Green: Half-day (4h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#fbbc04',borderLeft:'3px solid #f9ab00'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Orange : Sunset (2h)':'Orange: Sunset (2h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#ea4335',borderLeft:'3px solid #c5221f'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Rouge : Événements spéciaux':'Red: Special events'}</span>
            </li>
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
                  {active && <span className='text-[8px] px-2 py-1 rounded-full bg-blue-600 text-white font-semibold'>OK</span>}
                </button> ); })}
              {boats.length===0 && <div className='text-xs text-black/50'>{locale==='fr'?'Aucun bateau':'No boats'}</div>}
            </div>
          </div>
          <div>
            <h3 className='font-semibold text-sm mb-1'>
              {selectedBoat 
                ? (locale==='fr'?'Expériences du bateau':'Boat experiences')
                : (locale==='fr'?'Expériences':'Experiences')
              }
            </h3>
            <div className='grid grid-cols-1 gap-2 max-h-[32vh] overflow-auto pr-1'>
              {(selectedBoat ? boatExperiencesList : experiences).map(e=>{ 
                const stats = expAvail[e.id]; 
                const active = selectedExperience===e.id && !showAll; 
                const title = e[locale==='fr'?'titleFr':'titleEn']; 
                return (
                <button 
                  key={e.id} 
                  onClick={()=>{ 
                    if (selectedBoat) {
                      // Si un bateau est sélectionné, on peut sélectionner une expérience sans désélectionner le bateau
                      setSelectedExperience(e.id); 
                      setShowAll(false); 
                    } else {
                      // Sinon, comportement normal
                      setSelectedExperience(e.id); 
                      setSelectedBoat(null); 
                      setShowAll(false); 
                    }
                  }} 
                  className={'group relative text-left rounded-lg border p-2 flex items-center gap-3 transition shadow-sm hover:shadow focus:outline-none '+(active? 'border-purple-600 ring-2 ring-purple-400/40 bg-purple-50':'border-black/15 bg-white hover:bg-black/5')}
                >
                  {e.imageUrl && <img src={e.imageUrl} alt='' className='w-12 h-10 object-cover rounded-md border border-black/10' />}
                  {!e.imageUrl && <div className='w-12 h-10 flex items-center justify-center rounded-md border border-black/10 bg-black/5 text-[9px] font-medium'>EXP</div>}
                  <div className='flex-1 min-w-0'>
                    <p className='text-[10px] font-semibold leading-tight truncate'>{title}</p>
                    <p className='text-[8px] text-black/50'>{stats? stats.total:0} {locale==='fr'?'créneaux':'slots'}</p>
                  </div>
                  {active && <span className='text-[8px] px-2 py-1 rounded-full bg-purple-600 text-white font-semibold'>OK</span>}
                </button> ); 
              })}
              {(selectedBoat ? boatExperiencesList : experiences).length===0 && (
                <div className='text-xs text-black/50'>
                  {selectedBoat 
                    ? (locale==='fr'?'Aucune expérience liée à ce bateau':'No experiences linked to this boat')
                    : (locale==='fr'?'Aucune expérience':'No experiences')
                  }
                </div>
              )}
            </div>
          </div>
          {(selectedBoat || selectedExperience) && !showAll && (
            <button onClick={()=>{ setSelectedBoat(null); setSelectedExperience(null); setShowAll(true); }} className='w-full mt-1 text-left px-3 py-2 rounded border text-[11px] bg-black/5 hover:bg-black/10'>↺ {locale==='fr'?'Réinitialiser':'Reset'}</button>
          )}
          <p className='text-[10px] text-black/40'>{locale==='fr'?"Clique une carte (bateau ou expérience) pour gérer les créneaux":"Click a boat or experience to manage slots"}</p>
        </div>
        
        {/* Section pour ajouter des créneaux */}
        {(selectedBoat || selectedExperience) && !showAll && (
          <div className={`p-4 rounded-xl border shadow-sm ${
            selectedBoat && selectedExperience
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
              : selectedBoat 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
          }`}>
            <div className='flex items-center justify-between mb-3'>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${
                selectedBoat && selectedExperience
                  ? 'text-blue-800'
                  : selectedBoat 
                  ? 'text-green-800' 
                  : 'text-purple-800'
              }`}>
                <span className="text-lg">➕</span>
                {selectedBoat && selectedExperience
                  ? (locale==='fr' ? 'Ajouter un créneau (Bateau + Expérience)' : 'Add slot (Boat + Experience)')
                  : (locale==='fr' ? 'Ajouter un créneau' : 'Add availability slot')
                }
              </h3>
            </div>
            {selectedBoat && !selectedExperience && (
              <div className='mb-3 p-2 rounded-lg bg-blue-50 border border-blue-200'>
                <p className='text-xs text-blue-800'>
                  {locale==='fr' 
                    ? '💡 Sélectionnez une expérience ci-dessus pour créer un créneau spécifique à ce bateau et cette expérience.'
                    : '💡 Select an experience above to create a slot specific to this boat and experience.'
                  }
                </p>
              </div>
            )}
            
            {!showAddSlot ? (
              <button 
                onClick={() => {
                  if (selectedBoat && !selectedExperience) {
                    alert(locale==='fr' 
                      ? 'Veuillez d\'abord sélectionner une expérience pour ce bateau.'
                      : 'Please first select an experience for this boat.'
                    );
                    return;
                  }
                  setShowAddSlot(true);
                }}
                className={`w-full h-10 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  selectedBoat && selectedExperience
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : selectedBoat 
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <span>➕</span>
                {locale==='fr' ? 'Nouveau créneau' : 'New slot'}
              </button>
            ) : (
              <div className='space-y-3'>
                {/* Mode de sélection */}
                <div className='flex items-center gap-3 mb-3'>
                  <button
                    type='button'
                    onClick={() => {
                      setIsMultiDateMode(false);
                      setSelectedDates([]);
                      setNewSlotEndDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !isMultiDateMode 
                        ? (selectedBoat ? 'bg-green-600 text-white' : 'bg-purple-600 text-white')
                        : (selectedBoat ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200')
                    }`}
                  >
                    {locale==='fr' ? 'Date unique' : 'Single date'}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setIsMultiDateMode(true);
                      setNewSlotDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isMultiDateMode 
                        ? (selectedBoat ? 'bg-green-600 text-white' : 'bg-purple-600 text-white')
                        : (selectedBoat ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200')
                    }`}
                  >
                    {locale==='fr' ? 'Plusieurs dates' : 'Multiple dates'}
                  </button>
                </div>

                {!isMultiDateMode ? (
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${
                      selectedBoat ? 'text-green-800' : 'text-purple-800'
                    }`}>
                      {locale==='fr' ? 'Date' : 'Date'}
                    </label>
                    <input
                      type='date'
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className={`w-full h-9 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 ${
                        selectedBoat 
                          ? 'border-green-300 focus:ring-green-500/30'
                          : 'border-purple-300 focus:ring-purple-500/30'
                      }`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          selectedBoat ? 'text-green-800' : 'text-purple-800'
                        }`}>
                          {locale==='fr' ? 'Date début' : 'Start date'}
                        </label>
                        <input
                          type='date'
                          value={newSlotDate}
                          onChange={(e) => setNewSlotDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 ${
                            selectedBoat 
                              ? 'border-green-300 focus:ring-green-500/30'
                              : 'border-purple-300 focus:ring-purple-500/30'
                          }`}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          selectedBoat ? 'text-green-800' : 'text-purple-800'
                        }`}>
                          {locale==='fr' ? 'Date fin' : 'End date'}
                        </label>
                        <input
                          type='date'
                          value={newSlotEndDate}
                          onChange={(e) => setNewSlotEndDate(e.target.value)}
                          className={`w-full h-9 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 ${
                            selectedBoat 
                              ? 'border-green-300 focus:ring-green-500/30'
                              : 'border-purple-300 focus:ring-purple-500/30'
                          }`}
                          min={newSlotDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    
                    {newSlotDate && newSlotEndDate && (
                      <button
                        type='button'
                        onClick={selectDateRange}
                        className={`w-full h-8 rounded-lg text-xs font-medium transition-colors ${
                          selectedBoat
                            ? 'bg-green-100 hover:bg-green-200 text-green-700'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                        }`}
                      >
                        {locale==='fr' ? 'Sélectionner cette plage' : 'Select this range'}
                      </button>
                    )}

                    {selectedDates.length > 0 && (
                      <div className={`p-3 rounded-lg border ${
                        selectedBoat
                          ? 'bg-green-50 border-green-200'
                          : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className='flex items-center justify-between mb-2'>
                          <span className={`text-xs font-medium ${
                            selectedBoat ? 'text-green-800' : 'text-purple-800'
                          }`}>
                            {locale==='fr' ? 'Dates sélectionnées' : 'Selected dates'} ({selectedDates.length})
                          </span>
                          <button
                            type='button'
                            onClick={() => setSelectedDates([])}
                            className={`text-xs ${
                              selectedBoat 
                                ? 'text-green-600 hover:text-green-800'
                                : 'text-purple-600 hover:text-purple-800'
                            }`}
                          >
                            {locale==='fr' ? 'Effacer' : 'Clear'}
                          </button>
                        </div>
                        <div className='flex flex-wrap gap-1 max-h-20 overflow-y-auto'>
                          {selectedDates.map(date => (
                            <span
                              key={date}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-white text-[10px] font-medium ${
                                selectedBoat ? 'bg-green-600' : 'bg-purple-600'
                              }`}
                            >
                              {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                              <button
                                type='button'
                                onClick={() => toggleDateSelection(date)}
                                className={`hover:opacity-80 rounded-full w-3 h-3 flex items-center justify-center`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`text-xs p-2 rounded ${
                      selectedBoat
                        ? 'text-green-700 bg-green-50'
                        : 'text-purple-700 bg-purple-50'
                    }`}>
                      💡 {locale==='fr' 
                        ? 'Astuce: Définissez une plage de dates ou cliquez sur les dates individuelles dans le calendrier'
                        : 'Tip: Set a date range or click individual dates in the calendar'
                      }
                    </div>
                  </div>
                )}
                
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    selectedBoat ? 'text-green-800' : 'text-purple-800'
                  }`}>
                    {locale==='fr' ? 'Type de créneau' : 'Slot type'}
                  </label>
                  <select
                    value={newSlotPart}
                    onChange={(e) => setNewSlotPart(e.target.value as 'FULL'|'AM'|'PM'|'SUNSET')}
                    className={`w-full h-9 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 ${
                      selectedBoat
                        ? 'border-green-300 focus:ring-green-500/30'
                        : 'border-purple-300 focus:ring-purple-500/30'
                    }`}
                  >
                    <option value='FULL'>{locale==='fr' ? 'Journée complète (8h)' : 'Full day (8h)'}</option>
                    <option value='AM'>{locale==='fr' ? 'Matin (4h)' : 'Morning (4h)'}</option>
                    <option value='PM'>{locale==='fr' ? 'Après-midi (4h)' : 'Afternoon (4h)'}</option>
                    <option value='SUNSET'>Sunset (2h)</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-xs font-medium mb-1 ${
                    selectedBoat ? 'text-green-800' : 'text-purple-800'
                  }`}>
                    {locale==='fr' ? 'Note (optionnelle)' : 'Note (optional)'}
                  </label>
                  <textarea
                    value={newSlotNote}
                    onChange={(e) => setNewSlotNote(e.target.value)}
                    className={`w-full h-16 px-3 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 resize-none ${
                      selectedBoat
                        ? 'border-green-300 focus:ring-green-500/30'
                        : 'border-purple-300 focus:ring-purple-500/30'
                    }`}
                    placeholder={locale==='fr' ? 'Note ou commentaire...' : 'Note or comment...'}
                  />
                </div>
                
                <div className='flex gap-2'>
                  <button
                    onClick={addSlot}
                    disabled={saving || (!isMultiDateMode && !newSlotDate) || (isMultiDateMode && selectedDates.length === 0)}
                    className={`flex-1 h-9 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors ${
                      selectedBoat
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {saving ? (
                      locale==='fr' ? 'Ajout...' : 'Adding...'
                    ) : (
                      isMultiDateMode && selectedDates.length > 0 ? (
                        locale==='fr' 
                          ? `Ajouter ${selectedDates.length} créneaux`
                          : `Add ${selectedDates.length} slots`
                      ) : (
                        locale==='fr' ? 'Ajouter' : 'Add'
                      )
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSlot(false);
                      setNewSlotDate('');
                      setNewSlotEndDate('');
                      setSelectedDates([]);
                      setNewSlotNote('');
                      setIsMultiDateMode(false);
                    }}
                    className='h-9 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm transition-colors'
                  >
                    {locale==='fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
            
            <p className='text-[10px] text-green-700 mt-2'>
              {selectedBoat && (
                locale==='fr' 
                  ? `Bateau sélectionné: ${boats.find(b => b.id === selectedBoat)?.name || 'N/A'}`
                  : `Selected boat: ${boats.find(b => b.id === selectedBoat)?.name || 'N/A'}`
              )}
              {selectedExperience && (
                locale==='fr'
                  ? `Expérience sélectionnée: ${experiences.find(e => e.id === selectedExperience)?.[locale==='fr'?'titleFr':'titleEn'] || 'N/A'}`
                  : `Selected experience: ${experiences.find(e => e.id === selectedExperience)?.[locale==='fr'?'titleFr':'titleEn'] || 'N/A'}`
              )}
            </p>
          </div>
        )}
        
        {!selectedBoat && !selectedExperience && showAll && (
          <div className='p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'>
            <div className='text-center'>
              <span className="text-2xl mb-2 block">🎯</span>
              <h3 className='font-semibold text-sm text-blue-800 mb-2'>
                {locale==='fr' ? 'Gérer les disponibilités' : 'Manage availability'}
              </h3>
              <p className='text-xs text-blue-700 leading-relaxed'>
                {locale==='fr' 
                  ? 'Sélectionnez un bateau pour ajouter des créneaux de disponibilité ou une expérience pour gérer ses horaires.'
                  : 'Select a boat to add availability slots or an experience to manage its schedules.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Section pour lier bateaux et expériences */}
        <div className='p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='font-bold text-sm text-purple-800 flex items-center gap-2'>
              <span className="text-lg">🔗</span>
              {locale==='fr' ? 'Lier Bateau ↔ Expérience' : 'Link Boat ↔ Experience'}
            </h3>
            <button 
              onClick={() => setShowLinkManager(!showLinkManager)}
              className='text-xs px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors'
            >
              {showLinkManager ? '−' : '+'}
            </button>
          </div>
          
          {!showLinkManager ? (
            <p className='text-xs text-purple-700 leading-relaxed'>
              {locale==='fr' 
                ? 'Associez des expériences spécifiques à vos bateaux pour enrichir l\'offre de réservation.'
                : 'Associate specific experiences with your boats to enrich the booking offer.'
              }
            </p>
          ) : (
            <div className='space-y-3'>
              {/* Sélection du bateau */}
              <div>
                <label className='block text-xs font-medium mb-1 text-purple-800'>
                  {locale==='fr' ? 'Bateau' : 'Boat'}
                </label>
                <select 
                  value={linkBoatId || ''} 
                  onChange={(e) => setLinkBoatId(e.target.value ? Number(e.target.value) : null)}
                  className='w-full h-9 px-3 rounded-lg border border-purple-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                >
                  <option value="">{locale==='fr' ? 'Sélectionner un bateau' : 'Select a boat'}</option>
                  {boats.map(boat => (
                    <option key={boat.id} value={boat.id}>{boat.name}</option>
                  ))}
                </select>
              </div>

              {/* Sélection de l'expérience */}
              <div>
                <label className='block text-xs font-medium mb-1 text-purple-800'>
                  {locale==='fr' ? 'Expérience' : 'Experience'}
                </label>
                <select 
                  value={linkExperienceId || ''} 
                  onChange={(e) => setLinkExperienceId(e.target.value ? Number(e.target.value) : null)}
                  className='w-full h-9 px-3 rounded-lg border border-purple-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                >
                  <option value="">{locale==='fr' ? 'Sélectionner une expérience' : 'Select an experience'}</option>
                  {experiences.map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {locale==='fr' ? exp.titleFr : exp.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prix optionnel */}
              <div>
                <label className='block text-xs font-medium mb-1 text-purple-800'>
                  {locale==='fr' ? 'Prix spécifique (€, optionnel)' : 'Specific price (€, optional)'}
                </label>
                <input 
                  type='number' 
                  value={linkPrice} 
                  onChange={(e) => setLinkPrice(e.target.value)}
                  className='w-full h-9 px-3 rounded-lg border border-purple-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                  placeholder={locale==='fr' ? 'Prix pour cette combinaison' : 'Price for this combination'}
                />
              </div>

              {/* Bouton de création */}
              <button 
                onClick={createBoatExperienceLink}
                disabled={loadingLinks || !linkBoatId || !linkExperienceId}
                className='w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors'
              >
                {loadingLinks ? (
                  locale==='fr' ? 'Création...' : 'Creating...'
                ) : (
                  locale==='fr' ? 'Créer le lien' : 'Create link'
                )}
              </button>

              {/* Liste des liens existants pour le bateau sélectionné */}
              {linkBoatId && (
                <div className='mt-4 pt-3 border-t border-purple-200'>
                  <h4 className='text-xs font-medium text-purple-800 mb-2'>
                    {locale==='fr' ? 'Expériences liées à ce bateau :' : 'Experiences linked to this boat:'}
                  </h4>
                  {loadingLinks ? (
                    <div className='flex items-center gap-2 text-xs text-purple-600'>
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      {locale==='fr' ? 'Chargement...' : 'Loading...'}
                    </div>
                  ) : boatExperiences.length === 0 ? (
                    <p className='text-xs text-purple-600'>
                      {locale==='fr' ? 'Aucune expérience liée' : 'No linked experiences'}
                    </p>
                  ) : (
                    <div className='space-y-2 max-h-32 overflow-y-auto'>
                      {boatExperiences.map(link => (
                        <div key={link.experienceId} className='flex items-center justify-between p-2 rounded bg-white border border-purple-200'>
                          <div className='flex-1 min-w-0'>
                            <p className='text-xs font-medium text-purple-800 truncate'>
                              {locale==='fr' ? link.experience.titleFr : link.experience.titleEn}
                            </p>
                            {link.price && (
                              <p className='text-xs text-purple-600'>{link.price}€</p>
                            )}
                          </div>
                          <button 
                            onClick={() => deleteBoatExperienceLink(link.boatId, link.experienceId)}
                            className='text-xs text-red-600 hover:text-red-800 ml-2'
                            title={locale==='fr' ? 'Supprimer le lien' : 'Delete link'}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {editingSlot && (
          <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-5 w-full max-w-sm space-y-4'>
              <h3 className='font-semibold text-sm'>{locale==='fr'?'Modifier créneau':'Edit slot'}</h3>
              <p className='text-xs text-black/60'>{editingSlot.date} {editingSlot.part}</p>
              <textarea value={noteEdit} onChange={e=>setNoteEdit(e.target.value)} className='w-full h-24 border border-black/20 rounded p-2 text-xs' placeholder='Note' />
              <div className='flex gap-2'>
                <button onClick={saveNote} className='flex-1 h-9 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs transition-colors'>Save</button>
                <button onClick={removeSlot} className='h-9 rounded bg-red-600 text-white text-xs px-3'>Delete</button>
                <button onClick={()=>setEditingSlot(null)} className='h-9 rounded bg-black/10 text-xs px-3'>Close</button>
              </div>
            </div>
          </div>
        )}
      </aside>
      
      {/* Tooltip au survol - Masquer si le modal de réservation est ouvert */}
      {hoveredEvent && hoveredEvent.type === 'reservation' && tooltipPosition && !reservationInfo && (() => {
        const r = hoveredEvent.resData;
        const boatName = r.boat?.name || boats.find((b: Boat) => b.id === r.boatId)?.name || 'N/A';
        const clientName = r.user?.name || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.user?.email || 'N/A';
        const meta = r.metadata ? (() => { try { return JSON.parse(r.metadata); } catch { return null; } })() : null;
        const partLabel = r.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                         r.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                         r.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                         r.part === 'SUNSET' ? 'Sunset' : r.part || '';
        const getTimeRange = () => {
          if (r.part === 'AM') return '9h-13h';
          if (r.part === 'PM') return '14h-18h';
          if (r.part === 'SUNSET') return '18h-20h';
          if (r.part === 'FULL') return '9h-17h';
          return '';
        };
        const experienceTitle = meta?.experienceTitleFr || meta?.experienceTitleEn || meta?.expSlug || null;
        const selectedOptionIds = meta?.optionIds || [];
        const selectedOptions = r.boat?.options?.filter((o: any) => selectedOptionIds.includes(o.id)) || [];
        
        return (
          <div
            className="fixed z-[60] bg-white border-2 border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm pointer-events-none animate-in fade-in zoom-in-95 duration-150"
            style={{ 
              left: `${Math.min(tooltipPosition.x + 15, window.innerWidth - 320)}px`, 
              top: `${Math.min(tooltipPosition.y + 15, window.innerHeight - 200)}px`,
              transform: 'translateZ(0)'
            }}
          >
            <div className="space-y-2.5 text-xs">
              <div className="font-bold text-base text-[color:var(--primary)] border-b border-gray-200 pb-2">{boatName}</div>
              <div className="grid grid-cols-2 gap-2">
                {getTimeRange() && (
                  <div>
                    <strong className="text-gray-600">{locale==='fr'?'Horaires':'Times'}:</strong>
                    <div className="text-gray-800 font-medium">{getTimeRange()}</div>
                  </div>
                )}
                <div>
                  <strong className="text-gray-600">{locale==='fr'?'Type':'Type'}:</strong>
                  <div className="text-gray-800 font-medium">{partLabel}</div>
                </div>
              </div>
              {experienceTitle && (
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                  <strong className="text-purple-700">{locale==='fr'?'Expérience':'Experience'}:</strong>
                  <div className="text-purple-900 font-medium">{experienceTitle}</div>
                </div>
              )}
              <div>
                <strong className="text-gray-600">{locale==='fr'?'Client':'Client'}:</strong>
                <div className="text-gray-800 font-medium">{clientName}</div>
              </div>
              {selectedOptions.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                  <strong className="text-yellow-700">{locale==='fr'?'Options':'Options'}:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {selectedOptions.map((opt: any) => (
                      <li key={opt.id} className="text-yellow-900">• {opt.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
