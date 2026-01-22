"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import AvailabilityModal from './AvailabilityModal';

interface Boat { id: number; name: string; slug: string; imageUrl?: string|null; }
interface Slot { id: number; boatId: number; date: string; part: string; status: string; note?: string | null; }
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

function localKey(dateStr: string) { 
  const d = new Date(dateStr); 
  const y=d.getFullYear(); 
  const m=String(d.getMonth()+1).padStart(2,'0'); 
  const da=String(d.getDate()).padStart(2,'0'); 
  return `${y}-${m}-${da}`; 
}
function keyToDate(key: string) { return new Date(key + 'T00:00:00'); }

export default function CalendarClient({ locale }: { locale: 'fr'|'en' }) {
  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<number|null>(null);
  const [showAll, setShowAll] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservationInfo, setReservationInfo] = useState<Reservation|null>(null);
  const [slotInfo, setSlotInfo] = useState<any|null>(null);
  const [expSlotInfo, setExpSlotInfo] = useState<any|null>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [expSlots, setExpSlots] = useState<any[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<number|null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [calendarUpdateKey, setCalendarUpdateKey] = useState(0);
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [hoveredEvent, setHoveredEvent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);

  const load = useCallback(async (anchor: Date) => {
    const from = startOfDay(addDays(anchor, -31));
    const to = endOfDay(addDays(anchor, 62));
    const fmt = (d: Date) => { 
      const y=d.getFullYear(); 
      const m=String(d.getMonth()+1).padStart(2,'0'); 
      const da=String(d.getDate()).padStart(2,'0'); 
      return `${y}-${m}-${da}`; 
    };
    
    try {
      const [slotsRes, expRes] = await Promise.all([
        fetch(`/api/admin/availability?from=${fmt(from)}&to=${fmt(to)}`),
        fetch(`/api/admin/availability/experiences?from=${fmt(from)}&to=${fmt(to)}`)
      ]);
      
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        // L'API /api/admin/availability retourne { boats, slots, reservations }
        const boatsList = slotsData.boats || [];
        console.log('[Load] Boats loaded from availability API:', boatsList.length, boatsList);
        setBoats(boatsList);
        
        const localKey = (dateStr: string) => {
          const d = new Date(dateStr);
          const y=d.getFullYear();
          const m=String(d.getMonth()+1).padStart(2,'0');
          const da=String(d.getDate()).padStart(2,'0');
          return `${y}-${m}-${da}`;
        };
        const slotsList = (slotsData.slots || []).map((s:any)=> ({ ...s, date: localKey(s.date) }));
        console.log('[Load] Slots loaded:', slotsList.length, slotsList);
        setSlots(slotsList);
        setReservations(slotsData.reservations || []);
      }
      
      if (expRes.ok) {
        const expData = await expRes.json();
        setExperiences(expData.experiences || []);
        const localKey = (dateStr: string) => {
          const d = new Date(dateStr);
          const y=d.getFullYear();
          const m=String(d.getMonth()+1).padStart(2,'0');
          const da=String(d.getDate()).padStart(2,'0');
          return `${y}-${m}-${da}`;
        };
        setExpSlots((expData.slots||[]).map((s:any)=> ({ ...s, date: localKey(s.date) })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  // Convertir les données en événements FullCalendar
  const calendarEvents = useMemo(() => {
    const ev: any[] = [];
    
    // Vue globale
    if ((!selectedBoat && !selectedExperience) && showAll) {
      // Slots de bateaux
      slots.forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base);
        let end = new Date(base);
        
        if (s.part === 'AM') {
          start.setHours(8, 0, 0, 0);
          end.setHours(12, 30, 0, 0);
        } else if (s.part === 'PM') {
          start.setHours(13, 30, 0, 0);
          end.setHours(18, 0, 0, 0);
        } else if (s.part === 'SUNSET') {
          start.setHours(18, 0, 0, 0);
          end.setHours(20, 0, 0, 0);
        } else if (s.part === 'FULL') {
          start.setHours(8, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        }
        
        const boatName = boats.find(b => b.id === s.boatId)?.name || '#';
        ev.push({
          id: 'slot-' + s.id,
          title: boatName + ': ' + s.part + (s.note ? ' • ' + s.note : ''),
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          backgroundColor: s.part === 'FULL' ? '#3b82f6' : s.part === 'AM' || s.part === 'PM' ? '#10b981' : '#f59e0b',
          borderColor: s.part === 'FULL' ? '#2563eb' : s.part === 'AM' || s.part === 'PM' ? '#059669' : '#d97706',
          extendedProps: { type: 'slot', slotData: s }
        });
      });
      
      // Slots d'expériences
      expSlots.forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base);
        let end = new Date(base);
        
        if (s.part === 'AM') {
          start.setHours(8, 0, 0, 0);
          end.setHours(12, 0, 0, 0);
        } else if (s.part === 'PM') {
          start.setHours(13, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        } else if (s.part === 'FULL') {
          start.setHours(8, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        }
        
        const expName = experiences.find(e => e.id === s.experienceId)?.[locale === 'fr' ? 'titleFr' : 'titleEn'] || 'Exp';
        const boatName = s.boatId ? boats.find(b => b.id === s.boatId)?.name : '';
        ev.push({
          id: 'expSlot-' + s.id,
          title: (boatName ? boatName + ' - ' : '') + expName + ' (' + s.part + ')',
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          backgroundColor: '#a855f7',
          borderColor: '#9333ea',
          extendedProps: { type: 'expSlot', expSlotData: s }
        });
      });
      
      // Réservations
      reservations.forEach(r => {
        if (!r.boatId) return;
        const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
        const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        const boatName = r.boat?.name || boats.find(b => b.id === r.boatId)?.name || '#';
        const price = r.totalPrice ? `${r.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '';
        
        ev.push({
          id: 'res-' + r.id,
          title: `${boatName}${price ? ' - ' + price : ''}`,
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: true,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          extendedProps: { type: 'reservation', resData: r }
        });
      });
    } else if (selectedBoat) {
      // Vue bateau seule
      slots.filter(s => s.boatId === selectedBoat).forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base);
        let end = new Date(base);
        
        if (s.part === 'AM') {
          start.setHours(8, 0, 0, 0);
          end.setHours(12, 30, 0, 0);
        } else if (s.part === 'PM') {
          start.setHours(13, 30, 0, 0);
          end.setHours(18, 0, 0, 0);
        } else if (s.part === 'SUNSET') {
          start.setHours(18, 0, 0, 0);
          end.setHours(20, 0, 0, 0);
        } else if (s.part === 'FULL') {
          start.setHours(8, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        }
        
        ev.push({
          id: 'slot-' + s.id,
          title: s.part + (s.note ? ' • ' + s.note : ''),
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          backgroundColor: s.part === 'FULL' ? '#3b82f6' : s.part === 'AM' || s.part === 'PM' ? '#10b981' : '#f59e0b',
          borderColor: s.part === 'FULL' ? '#2563eb' : s.part === 'AM' || s.part === 'PM' ? '#059669' : '#d97706',
          extendedProps: { type: 'slot', slotData: s }
        });
      });
      
      reservations.filter(r => r.boatId === selectedBoat).forEach(r => {
        const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
        const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        
        ev.push({
          id: 'res-' + r.id,
          title: locale === 'fr' ? 'Réservation' : 'Reservation',
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: true,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          extendedProps: { type: 'reservation', resData: r }
        });
      });
    } else if (selectedExperience) {
      // Vue expérience seule
      expSlots.filter(s => s.experienceId === selectedExperience).forEach(s => {
        const base = keyToDate(s.date);
        let start = new Date(base);
        let end = new Date(base);
        
        if (s.part === 'AM') {
          start.setHours(8, 0, 0, 0);
          end.setHours(12, 0, 0, 0);
        } else if (s.part === 'PM') {
          start.setHours(13, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        } else if (s.part === 'FULL') {
          start.setHours(8, 0, 0, 0);
          end.setHours(18, 0, 0, 0);
        }
        
        ev.push({
          id: 'expSlot-' + s.id,
          title: s.part + (s.note ? ' • ' + s.note : ''),
          start: start.toISOString(),
          end: end.toISOString(),
          allDay: false,
          backgroundColor: '#a855f7',
          borderColor: '#9333ea',
          extendedProps: { type: 'expSlot', expSlotData: s }
        });
      });
    }
    
    return ev;
  }, [slots, expSlots, reservations, selectedBoat, selectedExperience, showAll, boats, experiences, locale]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    const extProps = event.extendedProps;
    
    // Fermer les autres modals
    setReservationInfo(null);
    setSlotInfo(null);
    setExpSlotInfo(null);
    
    if (extProps.type === 'reservation' && extProps.resData) {
      setReservationInfo(extProps.resData);
    } else if (extProps.type === 'slot' && extProps.slotData) {
      setSlotInfo(extProps.slotData);
    } else if (extProps.type === 'expSlot' && extProps.expSlotData) {
      setExpSlotInfo(extProps.expSlotData);
    }
  };

  const handleEventMouseEnter = (info: any, jsEvent: MouseEvent) => {
    setHoveredEvent(info.event);
    setTooltipPosition({ x: jsEvent.clientX, y: jsEvent.clientY });
  };

  const handleEventMouseLeave = () => {
    setHoveredEvent(null);
    setTooltipPosition(null);
  };

  const handleEventDidMount = (info: any) => {
    const { event, el } = info;
    
    const handleMouseEnter = (e: MouseEvent) => {
      setHoveredEvent(event);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseLeave = () => {
      // Petit délai pour permettre le passage de la souris vers le tooltip
      setTimeout(() => {
        const tooltip = document.querySelector('.fixed.z-\\[60\\]');
        if (!el.matches(':hover') && !tooltip?.matches(':hover')) {
          setHoveredEvent(null);
          setTooltipPosition(null);
        }
      }, 100);
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    // Stocker les handlers pour le nettoyage
    (el as any).__fcMouseHandlers = { handleMouseEnter, handleMouseLeave };
  };

  // Nettoyer les listeners quand les événements sont supprimés
  useEffect(() => {
    return () => {
      // Nettoyer tous les listeners lors du démontage
      document.querySelectorAll('.fc-event').forEach((el) => {
        const handlers = (el as any).__fcMouseHandlers;
        if (handlers) {
          el.removeEventListener('mouseenter', handlers.handleMouseEnter);
          el.removeEventListener('mouseleave', handlers.handleMouseLeave);
          if (handlers.handleClick) {
            el.removeEventListener('click', handlers.handleClick);
          }
        }
      });
    };
  }, [calendarEvents]);

  const handleDateSelect = (selectInfo: any) => {
    if (selectedBoat || selectedExperience) {
      setShowAvailabilityModal(true);
    }
  };

  const handleModalSave = async (data: {
    boatId: number;
    experienceId?: number | null;
    dates: string[];
    part: 'FULL' | 'AM' | 'PM' | 'SUNSET';
    note?: string;
  }) => {
    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const dateStr of data.dates) {
        try {
          let res: Response;
          
          if (data.experienceId) {
            res = await fetch('/api/admin/availability/experiences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                experienceId: data.experienceId,
                boatId: data.boatId,
                date: dateStr,
                part: data.part,
                note: data.note || null,
              }),
            });
          } else {
            res = await fetch('/api/admin/availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boatId: data.boatId,
                date: dateStr,
                part: data.part,
                note: data.note || null,
              }),
            });
          }
          
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error creating slot:', error);
          errorCount++;
        }
      }

      setCalendarUpdateKey(prev => prev + 1);
      await load(date);
      
      if (successCount > 0 && errorCount === 0) {
        alert(locale === 'fr' ? 'Créneaux créés avec succès' : 'Slots created successfully');
      }
    } catch (error) {
      console.error('Error in handleModalSave:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .fc {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .fc-toolbar {
          padding: 1rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
          border-radius: 12px 12px 0 0;
        }
        .fc-button {
          background: #3b82f6 !important;
          border: none !important;
          padding: 0.5rem 1rem !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }
        .fc-button:hover {
          background: #2563eb !important;
          transform: translateY(-1px);
        }
        .fc-button-active {
          background: #1e40af !important;
        }
        .fc-daygrid-day {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.5);
        }
        .fc-timegrid-slot {
          border-top: 1px solid rgba(226, 232, 240, 0.3);
        }
        .fc-event {
          border-radius: 6px !important;
          padding: 8px 10px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          border: none !important;
          cursor: pointer !important;
          min-height: 32px !important;
          line-height: 1.4 !important;
          margin: 2px 0 !important;
        }
        .fc-event:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .fc-daygrid-event {
          min-height: 32px !important;
          padding: 8px 10px !important;
          cursor: pointer !important;
        }
        .fc-event {
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        .fc-event:hover {
          opacity: 0.9 !important;
        }
        .fc-daygrid-day-frame {
          min-height: 140px !important;
        }
        .fc-daygrid-day-events {
          margin-top: 4px !important;
        }
        .fc-day-today {
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .fc-col-header-cell {
          background: rgba(255, 255, 255, 0.9);
          padding: 12px !important;
          font-weight: 600;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }
        .fc-timegrid-col {
          border-right: 1px solid rgba(226, 232, 240, 0.5);
        }
        .fc-timegrid-axis {
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>
      <div className="flex flex-col lg:flex-row gap-6">
      <div className='flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-lg relative overflow-hidden'>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale={frLocale}
          firstDay={1}
          events={calendarEvents}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          selectable={selectedBoat !== null || selectedExperience !== null}
          select={handleDateSelect}
          height="75vh"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={true}
          nowIndicator={true}
          dayMaxEvents={3}
          dayMaxEventRows={3}
          moreLinkClick="popover"
          eventDisplay="block"
          eventMaxStack={3}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          views={{
            dayGridMonth: {
              dayMaxEvents: 3,
              dayMaxEventRows: 3,
              moreLinkClick: 'popover',
              eventMinHeight: 30,
              eventShortHeight: 30
            },
            timeGridWeek: {
              slotMinTime: '07:00:00',
              slotMaxTime: '22:00:00',
              allDaySlot: true
            },
            timeGridDay: {
              slotMinTime: '07:00:00',
              slotMaxTime: '22:00:00',
              allDaySlot: true
            }
          }}
        />
      </div>

      {/* Sidebar */}
      <aside className='w-full lg:w-72 shrink-0 space-y-6'>
        <div className='mb-6 p-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm'>
          <h3 className='font-bold text-sm mb-3 text-gray-800 flex items-center gap-2'>
            <span className="text-lg">🗂</span>
            {locale === 'fr' ? 'Code couleur' : 'Color code'}
          </h3>
          <ul className='space-y-2.5 text-xs'>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#3b82f6',border:'2px solid #2563eb'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Bleu : Journée complète (8h)':'Blue: Full day (8h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#10b981',border:'2px solid #059669'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Vert : Demi-journée (4h)':'Green: Half-day (4h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#f59e0b',border:'2px solid #d97706'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Orange : Sunset (2h)':'Orange: Sunset (2h)'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#a855f7',border:'2px solid #9333ea'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Violet : Événements/Expériences':'Purple: Events/Experiences'}</span>
            </li>
            <li className='flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors'>
              <span style={{display:'inline-block',width:20,height:20,borderRadius:4,background:'#ef4444',border:'2px solid #dc2626'}}></span> 
              <span className="text-gray-700 font-medium">{locale==='fr'?'Rouge : Réservations':'Red: Reservations'}</span>
            </li>
          </ul>
        </div>

        <div className='space-y-4'>
          <div>
            <div className='flex items-center justify-between mb-1'>
              <h3 className='font-semibold text-sm'>{locale==='fr'?'Bateaux':'Boats'}</h3>
              <button 
                onClick={()=>{ 
                  if (showAll) { 
                    setShowAll(false); 
                  } else { 
                    setSelectedBoat(null); 
                    setSelectedExperience(null); 
                    setShowAll(true); 
                  } 
                }} 
                className='text-[10px] px-2 py-1 rounded border border-black/20 hover:bg-black/5'
              >
                {showAll ? (locale==='fr'?'Masquer tout':'Hide all') : (locale==='fr'?'Vue globale':'Global view')}
              </button>
            </div>
            <div className='space-y-2 max-h-64 overflow-y-auto'>
              {boats.map(boat => (
                <button
                  key={boat.id}
                  onClick={() => {
                    setSelectedBoat(boat.id);
                    setSelectedExperience(null);
                    setShowAll(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedBoat === boat.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {boat.imageUrl ? (
                      <img src={boat.imageUrl} alt={boat.name} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-semibold">
                        🛥️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{boat.name}</p>
                      {selectedBoat === boat.id && (
                        <p className="text-xs text-blue-600 mt-1">✓ {locale==='fr'?'Sélectionné':'Selected'}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className='font-semibold text-sm mb-1'>{locale==='fr'?'Expériences':'Experiences'}</h3>
            <div className='space-y-2 max-h-48 overflow-y-auto'>
              {experiences.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => {
                    setSelectedExperience(exp.id);
                    setSelectedBoat(null);
                    setShowAll(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedExperience === exp.id
                      ? 'border-purple-600 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {exp.imageUrl ? (
                      <img src={exp.imageUrl} alt={exp.titleFr} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center text-purple-400 font-semibold">
                        🎯
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{locale==='fr' ? exp.titleFr : exp.titleEn}</p>
                      {selectedExperience === exp.id && (
                        <p className="text-xs text-purple-600 mt-1">✓ {locale==='fr'?'Sélectionné':'Selected'}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className='p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'>
            <h3 className='font-semibold text-sm mb-2 text-blue-900'>
              {locale==='fr' ? 'Gérer les disponibilités' : 'Manage availability'}
            </h3>
            <p className='text-xs text-blue-800 mb-4'>
              {locale==='fr' 
                ? 'Sélectionnez un bateau pour ajouter des créneaux de disponibilité ou une expérience pour gérer ses horaires.'
                : 'Select a boat to add availability slots or an experience to manage its schedules.'}
            </p>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className='w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg'
            >
              <span>📅</span>
              {locale==='fr' ? 'Définir des disponibilités' : 'Define availability'}
            </button>
          </div>
        </div>
      </aside>

      {/* Modal de disponibilité */}
      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        boats={boats}
        experiences={experiences}
        locale={locale}
        onSave={handleModalSave}
      />

      {/* Modal de détails de réservation */}
      {reservationInfo && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 100000 }}>
            <button 
              className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black z-10" 
              onClick={() => setReservationInfo(null)}
              style={{ zIndex: 100001 }}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              {locale==='fr'?'Détails de la réservation':'Reservation details'}
            </h2>
            <div className="space-y-4 text-sm">
              {(() => {
                const boat = reservationInfo.boat || boats.find((b: Boat) => b.id === reservationInfo.boatId);
                const boatName = boat?.name || 'N/A';
                const startDateStr = reservationInfo.startDate.includes('T') ? reservationInfo.startDate.split('T')[0] : reservationInfo.startDate;
                const endDateStr = reservationInfo.endDate.includes('T') ? reservationInfo.endDate.split('T')[0] : reservationInfo.endDate;
                const partLabel = reservationInfo.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                                 reservationInfo.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                                 reservationInfo.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                                 reservationInfo.part === 'SUNSET' ? 'Sunset' : reservationInfo.part || (locale==='fr'?'Non spécifié':'Not specified');
                const statusLabel = reservationInfo.status === 'confirmed' ? (locale==='fr'?'Confirmée':'Confirmed') :
                                   reservationInfo.status === 'pending' ? (locale==='fr'?'En attente':'Pending') :
                                   reservationInfo.status === 'pending_deposit' ? (locale==='fr'?'En attente d\'acompte':'Pending deposit') :
                                   reservationInfo.status === 'paid' ? (locale==='fr'?'Payée':'Paid') :
                                   reservationInfo.status === 'canceled' ? (locale==='fr'?'Annulée':'Canceled') :
                                   reservationInfo.status || (locale==='fr'?'Inconnu':'Unknown');
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Bateau':'Boat'}:</strong>
                        <div className="text-base font-semibold text-blue-600">{boatName}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Client':'Client'}:</strong>
                        <div className="text-base font-semibold">
                          {reservationInfo.user?.name || 
                           `${reservationInfo.user?.firstName || ''} ${reservationInfo.user?.lastName || ''}`.trim() || 
                           reservationInfo.user?.email || 
                           'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {boat?.imageUrl && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <strong className="text-gray-700 block mb-2">{locale==='fr'?'Photo du bateau':'Boat photo'}:</strong>
                        <img src={boat.imageUrl} alt={boatName} className="w-full max-w-md h-auto rounded-lg object-cover" />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Date de début':'Start date'}:</strong>
                        <div className="text-base font-semibold">{startDateStr}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Date de fin':'End date'}:</strong>
                        <div className="text-base font-semibold">{endDateStr}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Type de créneau':'Time slot'}:</strong>
                        <div className="text-base font-semibold">{partLabel}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Nombre de passagers':'Passengers'}:</strong>
                        <div className="text-base font-semibold">{reservationInfo.passengers || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Statut':'Status'}:</strong>
                        <div className="text-base font-semibold">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            reservationInfo.status === 'confirmed' || reservationInfo.status === 'paid'
                              ? 'bg-green-100 text-green-800' 
                              : reservationInfo.status === 'pending' || reservationInfo.status === 'pending_deposit'
                              ? 'bg-yellow-100 text-yellow-800'
                              : reservationInfo.status === 'canceled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'ID de réservation':'Reservation ID'}:</strong>
                        <div className="text-base font-semibold font-mono text-xs">{reservationInfo.id}</div>
                      </div>
                    </div>
                    
                    {reservationInfo.totalPrice && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <strong className="text-gray-700">{locale==='fr'?'Prix total':'Total price'}:</strong>
                        <div className="text-2xl font-bold text-green-700 mt-2">
                          {reservationInfo.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                    )}
                    
                    {reservationInfo.user?.email && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <strong className="text-gray-700">{locale==='fr'?'Email du client':'Client email'}:</strong>
                        <div className="text-base font-semibold">{reservationInfo.user.email}</div>
                      </div>
                    )}
                    
                    {reservationInfo.metadata && (() => {
                      let parsedMetadata: any = null;
                      try {
                        parsedMetadata = typeof reservationInfo.metadata === 'string' 
                          ? JSON.parse(reservationInfo.metadata) 
                          : reservationInfo.metadata;
                      } catch (e) {
                        // Si ce n'est pas du JSON valide, on l'affiche tel quel
                      }
                      
                      const translateKey = (key: string): string => {
                        const translations: Record<string, { fr: string; en: string }> = {
                          waterToys: { fr: 'Jouets aquatiques', en: 'Water toys' },
                          wantsExcursion: { fr: 'Souhaite une excursion', en: 'Wants excursion' },
                          optionIds: { fr: 'Options sélectionnées', en: 'Selected options' },
                          boatCapacity: { fr: 'Capacité du bateau', en: 'Boat capacity' },
                          boatLength: { fr: 'Longueur du bateau (m)', en: 'Boat length (m)' },
                          boatSpeed: { fr: 'Vitesse du bateau (km/h)', en: 'Boat speed (km/h)' },
                          departurePort: { fr: 'Port de départ', en: 'Departure port' },
                          bookingDate: { fr: 'Date de réservation', en: 'Booking date' },
                          userRole: { fr: 'Rôle de l\'utilisateur', en: 'User role' },
                          skipperRequired: { fr: 'Skipper requis', en: 'Skipper required' },
                          effectiveSkipperPrice: { fr: 'Prix du skipper', en: 'Skipper price' },
                          experienceId: { fr: 'ID de l\'expérience', en: 'Experience ID' },
                          expSlug: { fr: 'Slug de l\'expérience', en: 'Experience slug' },
                          experienceTitleFr: { fr: 'Titre de l\'expérience (FR)', en: 'Experience title (FR)' },
                          experienceTitleEn: { fr: 'Titre de l\'expérience (EN)', en: 'Experience title (EN)' },
                        };
                        return translations[key]?.[locale] || key;
                      };
                      
                      const formatValue = (key: string, value: any): string => {
                        if (key === 'bookingDate' && value) {
                          try {
                            const date = new Date(value);
                            return date.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (e) {
                            return String(value);
                          }
                        }
                        if (typeof value === 'boolean') {
                          return value ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No');
                        }
                        if (Array.isArray(value)) {
                          return value.length > 0 ? value.join(', ') : (locale === 'fr' ? 'Aucune' : 'None');
                        }
                        if (typeof value === 'number') {
                          if (key.includes('Price') || key.includes('price')) {
                            return `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
                          }
                          return value.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');
                        }
                        return String(value);
                      };
                      
                      return (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <strong className="text-gray-700">{locale==='fr'?'Informations supplémentaires':'Additional information'}:</strong>
                          {parsedMetadata ? (
                            <div className="text-base mt-2 space-y-2">
                              {parsedMetadata.experienceId && (
                                <div>
                                  <strong className="text-gray-600">{locale==='fr'?'Expérience liée':'Linked experience'}:</strong>
                                  <div className="text-blue-700 font-semibold">
                                    {parsedMetadata.experienceTitleFr || parsedMetadata.experienceTitleEn || parsedMetadata.expSlug || `ID: ${parsedMetadata.experienceId}`}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                {Object.entries(parsedMetadata)
                                  .filter(([key]) => !['experienceId', 'expSlug', 'experienceTitleFr', 'experienceTitleEn'].includes(key))
                                  .map(([key, value]) => (
                                    <div key={key} className="bg-white p-3 rounded-lg border border-blue-100">
                                      <strong className="text-gray-600 text-sm block mb-1">{translateKey(key)}:</strong>
                                      <div className="text-gray-800 font-semibold">{formatValue(key, value)}</div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-base mt-1 whitespace-pre-wrap">{reservationInfo.metadata}</div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails de disponibilité (slot) */}
      {slotInfo && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black"
              onClick={() => setSlotInfo(null)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-blue-600">
              {locale==='fr'?'Détails de la disponibilité':'Availability details'}
            </h2>
            <div className="space-y-4 text-sm">
              {(() => {
                // S'assurer que boatId est un nombre pour la comparaison
                const boatId = typeof slotInfo.boatId === 'string' ? parseInt(slotInfo.boatId, 10) : Number(slotInfo.boatId);
                console.log('[Modal] Slot info:', slotInfo);
                console.log('[Modal] BoatId from slot:', boatId, typeof boatId);
                console.log('[Modal] Available boats:', boats.map((b: Boat) => ({ id: b.id, name: b.name, idType: typeof b.id })));
                const boat = boats.find((b: Boat) => Number(b.id) === Number(boatId));
                console.log('[Modal] Found boat:', boat);
                const boatName = boat?.name || `N/A (boatId: ${boatId})`;
                const partLabel = slotInfo.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                                 slotInfo.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                                 slotInfo.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                                 slotInfo.part === 'SUNSET' ? 'Sunset' : slotInfo.part || '';
                const statusLabel = (slotInfo.status || 'available') === 'available' 
                  ? (locale==='fr'?'Disponible':'Available')
                  : (locale==='fr'?'Indisponible':'Unavailable');
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Bateau':'Boat'}:</strong>
                        <div className="text-base font-semibold text-blue-600">{boatName}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Type de créneau':'Time slot'}:</strong>
                        <div className="text-base font-semibold">{partLabel}</div>
                      </div>
                    </div>
                    {boat?.imageUrl && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <strong className="text-gray-700 block mb-2">{locale==='fr'?'Photo du bateau':'Boat photo'}:</strong>
                        <img src={boat.imageUrl} alt={boatName} className="w-full max-w-md h-auto rounded-lg object-cover" />
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Date':'Date'}:</strong>
                      <div className="text-base font-semibold">{slotInfo.date}</div>
                    </div>
                    {slotInfo.note && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <strong className="text-gray-700">{locale==='fr'?'Note':'Note'}:</strong>
                        <div className="text-base mt-1">{slotInfo.note}</div>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Statut':'Status'}:</strong>
                      <div className="text-base font-semibold">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          (slotInfo.status || 'available') === 'available' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails d'expérience */}
      {expSlotInfo && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 text-2xl text-black/50 hover:text-black"
              onClick={() => setExpSlotInfo(null)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-purple-600">
              {locale==='fr'?'Détails de l\'expérience':'Experience details'}
            </h2>
            <div className="space-y-4 text-sm">
              {(() => {
                const exp = experiences.find((e: any) => e.id === expSlotInfo.experienceId);
                const boat = expSlotInfo.boatId ? boats.find((b: Boat) => b.id === expSlotInfo.boatId) : null;
                const expName = exp?.[locale === 'fr' ? 'titleFr' : 'titleEn'] || 'N/A';
                const partLabel = expSlotInfo.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                                 expSlotInfo.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                                 expSlotInfo.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                                 expSlotInfo.part === 'SUNSET' ? 'Sunset' : expSlotInfo.part || '';
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Expérience':'Experience'}:</strong>
                        <div className="text-base font-semibold text-purple-600">{expName}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">{locale==='fr'?'Type de créneau':'Time slot'}:</strong>
                        <div className="text-base font-semibold">{partLabel}</div>
                      </div>
                    </div>
                    {exp?.imageUrl && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <strong className="text-gray-700 block mb-2">{locale==='fr'?'Photo de l\'expérience':'Experience photo'}:</strong>
                        <img src={exp.imageUrl} alt={expName} className="w-full max-w-md h-auto rounded-lg object-cover" />
                      </div>
                    )}
                    {boat && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <strong className="text-gray-700">{locale==='fr'?'Bateau associé':'Associated boat'}:</strong>
                        <div className="text-base font-semibold text-blue-600">{boat.name}</div>
                        {boat.imageUrl && (
                          <img src={boat.imageUrl} alt={boat.name} className="w-full max-w-md h-auto rounded-lg object-cover mt-2" />
                        )}
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <strong className="text-gray-700">{locale==='fr'?'Date':'Date'}:</strong>
                      <div className="text-base font-semibold">{expSlotInfo.date}</div>
                    </div>
                    {expSlotInfo.note && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <strong className="text-gray-700">{locale==='fr'?'Note':'Note'}:</strong>
                        <div className="text-base mt-1">{expSlotInfo.note}</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip au survol */}
      {hoveredEvent && tooltipPosition && !reservationInfo && !slotInfo && !expSlotInfo && (() => {
        const extProps = hoveredEvent.extendedProps;
        const isReservation = extProps.type === 'reservation';
        const isExpSlot = extProps.type === 'expSlot';
        const isSlot = extProps.type === 'slot';
        
        if (isReservation && extProps.resData) {
          const r = extProps.resData;
          const boatName = r.boat?.name || boats.find((b: Boat) => b.id === r.boatId)?.name || 'N/A';
          const clientName = r.user?.name || `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.user?.email || 'N/A';
          const price = r.totalPrice ? `${r.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '';
          const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
          const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
          
          return (
            <div
              className="fixed z-[60] bg-white border-2 border-red-200 rounded-xl shadow-2xl p-4 max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: `${Math.min(tooltipPosition.x + 15, window.innerWidth - 320)}px`, 
                top: `${Math.min(tooltipPosition.y + 15, window.innerHeight - 200)}px`,
                transform: 'translateZ(0)'
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
              }}
              onMouseLeave={() => {
                setTimeout(() => {
                  if (!document.querySelector('.fixed.z-\\[60\\]')?.matches(':hover')) {
                    setHoveredEvent(null);
                    setTooltipPosition(null);
                  }
                }, 100);
              }}
            >
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-base text-red-600 border-b border-gray-200 pb-2">{boatName}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong className="text-gray-600">{locale==='fr'?'Période':'Period'}:</strong>
                    <div className="text-gray-800 font-medium">{startDateStr} → {endDateStr}</div>
                  </div>
                  {price && (
                    <div>
                      <strong className="text-gray-600">{locale==='fr'?'Prix':'Price'}:</strong>
                      <div className="text-gray-800 font-medium">{price}</div>
                    </div>
                  )}
                </div>
                <div>
                  <strong className="text-gray-600">{locale==='fr'?'Client':'Client'}:</strong>
                  <div className="text-gray-800 font-medium">{clientName}</div>
                </div>
                {r.part && (
                  <div>
                    <strong className="text-gray-600">{locale==='fr'?'Type':'Type'}:</strong>
                    <div className="text-gray-800 font-medium">
                      {r.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                       r.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                       r.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                       r.part === 'SUNSET' ? 'Sunset' : r.part}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        } else if (isSlot && extProps.slotData) {
          const s = extProps.slotData;
          const boat = boats.find((b: Boat) => b.id === s.boatId);
          const boatName = boat?.name || 'N/A';
          const partLabel = s.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                           s.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                           s.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                           s.part === 'SUNSET' ? 'Sunset' : s.part || '';
          
          return (
            <div
              className="fixed z-[60] bg-white border-2 border-blue-200 rounded-xl shadow-2xl p-4 max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: `${Math.min(tooltipPosition.x + 15, window.innerWidth - 320)}px`, 
                top: `${Math.min(tooltipPosition.y + 15, window.innerHeight - 200)}px`,
                transform: 'translateZ(0)'
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
              }}
              onMouseLeave={() => {
                setTimeout(() => {
                  const tooltip = document.querySelector('.fixed.z-\\[60\\]');
                  if (!tooltip?.matches(':hover')) {
                    setHoveredEvent(null);
                    setTooltipPosition(null);
                  }
                }, 100);
              }}
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  {boat?.imageUrl ? (
                    <img src={boat.imageUrl} alt={boatName} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-semibold text-2xl">
                      🛥️
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-base text-blue-600">{boatName}</div>
                    <div className="text-gray-600 mt-1">{partLabel}</div>
                  </div>
                </div>
                {s.note && (
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <strong className="text-gray-600">{locale==='fr'?'Note':'Note'}:</strong>
                    <div className="text-gray-800 mt-1">{s.note}</div>
                  </div>
                )}
                <div className="text-gray-500 text-[10px]">
                  {locale==='fr' ? 'Disponibilité' : 'Availability'} • {s.status || 'available'}
                </div>
              </div>
            </div>
          );
        } else if (isExpSlot && extProps.expSlotData) {
          const s = extProps.expSlotData;
          const exp = experiences.find((e: any) => e.id === s.experienceId);
          const boat = s.boatId ? boats.find((b: Boat) => b.id === s.boatId) : null;
          const expName = exp?.[locale === 'fr' ? 'titleFr' : 'titleEn'] || 'N/A';
          const partLabel = s.part === 'FULL' ? (locale==='fr'?'Journée entière':'Full day') : 
                           s.part === 'AM' ? (locale==='fr'?'Matin':'Morning') : 
                           s.part === 'PM' ? (locale==='fr'?'Après-midi':'Afternoon') : 
                           s.part === 'SUNSET' ? 'Sunset' : s.part || '';
          
          return (
            <div
              className="fixed z-[60] bg-white border-2 border-purple-200 rounded-xl shadow-2xl p-4 max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: `${Math.min(tooltipPosition.x + 15, window.innerWidth - 320)}px`, 
                top: `${Math.min(tooltipPosition.y + 15, window.innerHeight - 200)}px`,
                transform: 'translateZ(0)'
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
              }}
              onMouseLeave={() => {
                setTimeout(() => {
                  const tooltip = document.querySelector('.fixed.z-\\[60\\]');
                  if (!tooltip?.matches(':hover')) {
                    setHoveredEvent(null);
                    setTooltipPosition(null);
                  }
                }, 100);
              }}
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  {exp?.imageUrl ? (
                    <img src={exp.imageUrl} alt={expName} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-purple-200 rounded-lg flex items-center justify-center text-purple-400 font-semibold text-2xl">
                      🎯
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-base text-purple-600">{expName}</div>
                    {boat && (
                      <div className="text-gray-600 mt-1">{locale==='fr' ? 'Bateau' : 'Boat'}: {boat.name}</div>
                    )}
                    <div className="text-gray-600 mt-1">{partLabel}</div>
                  </div>
                </div>
                {s.note && (
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <strong className="text-gray-600">{locale==='fr'?'Note':'Note'}:</strong>
                    <div className="text-gray-800 mt-1">{s.note}</div>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return null;
      })()}
      </div>
    </>
  );
}
