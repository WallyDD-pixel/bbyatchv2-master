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

interface Boat { id: number; name: string; slug: string; imageUrl?: string|null; }
interface Slot { id: number; boatId: number; date: string; part: 'AM'|'PM'|'FULL'|'SUNSET'; status: string; note?: string|null }
interface Reservation {
  id: string;
  boatId?: number|null;
  startDate: string;
  endDate: string;
  status: string;
  part?: string | null;
  totalPrice?: number | null;
  boat?: Boat | null;
}

function localKey(dateStr: string) { const d = new Date(dateStr); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function keyToDate(key: string) { return new Date(key + 'T00:00:00'); }

export default function CalendarClientSimplified({ locale }: { locale: 'fr'|'en' }) {
  // Forcer le français pour l'interface admin
  const t = {
    legend: 'Légende',
    fullDay: 'Journée complète',
    halfDay: 'Demi-journée',
    sunset: 'Sunset',
    reservation: 'Réservation',
    boats: 'Bateaux',
    slots: 'créneaux',
    noBoats: 'Aucun bateau',
    addSlot: 'Ajouter un créneau',
    date: 'Date',
    type: 'Type',
    morning: 'Matin',
    afternoon: 'Après-midi',
    adding: 'Ajout...',
    add: 'Ajouter',
    cancel: 'Annuler',
    newSlot: '+ Nouveau créneau',
    reservationDetails: 'Détails réservation',
    boat: 'Bateau',
    period: 'Période',
    price: 'Prix',
    selectBoatAndDate: 'Sélectionnez un bateau et une date',
    slotAdded: 'Créneau ajouté',
    error: 'Erreur',
  };
  const [boats, setBoats] = useState<Boat[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedBoat, setSelectedBoat] = useState<number | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [reservationInfo, setReservationInfo] = useState<Reservation|null>(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotPart, setNewSlotPart] = useState<'FULL'|'AM'|'PM'|'SUNSET'>('FULL');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (anchor: Date) => {
    const from = startOfDay(addDays(anchor, -31));
    const to = endOfDay(addDays(anchor, 62));
    const fmt = (d: Date) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; };
    try {
      const res = await fetch(`/api/admin/availability?from=${fmt(from)}&to=${fmt(to)}`);
      if (res && res.ok) {
        const data = await res.json();
        setBoats(data.boats||[]);
        setSlots((data.slots||[]).map((s: any)=>({ ...s, date: localKey(s.date) })));
        setReservations(data.reservations||[]);
      }
    } catch { /* silent */ }
  }, []);
  
  useEffect(()=>{ load(date); }, [date, load]);

  const events = useMemo(()=> {
    const ev: any[] = [];
    
    // Afficher uniquement les réservations en rouge
    reservations.forEach(r => {
      if (!r.boatId) return;
      const startDateStr = r.startDate.includes('T') ? r.startDate.split('T')[0] : r.startDate;
      const endDateStr = r.endDate.includes('T') ? r.endDate.split('T')[0] : r.endDate;
      const start = new Date(startDateStr + 'T00:00:00');
      const end = new Date(endDateStr + 'T23:59:59');
      const boatName = r.boat?.name || boats.find(b=>b.id===r.boatId)?.name || 'N/A';
      const price = r.totalPrice ? ` - ${r.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : '';
      ev.push({ 
        id: 'res-'+r.id, 
        title: `${boatName}${price}`, 
        start, 
        end, 
        allDay: true,
        type:'reservation', 
        resData:r 
      });
    });
    
    // Si un bateau est sélectionné, afficher ses créneaux disponibles
    if (selectedBoat) {
      slots.filter(s=>s.boatId===selectedBoat && s.status === 'available').forEach(s => {
        const base = keyToDate(s.date);
        const start = new Date(base);
        const end = new Date(base);
        ev.push({ 
          id: 'slot-'+s.id, 
          title: s.part, 
          start, 
          end, 
          allDay: true,
          type:'slot', 
          slotData:s 
        });
      });
    }
    
    return ev;
  }, [slots, reservations, selectedBoat, boats]);

  const eventPropGetter = (event: any) => {
    if (event.type === 'reservation') {
      return {
        style: {
          background: '#ef4444',
          border: 'none',
          color: '#fff',
          borderRadius: '4px',
          fontWeight: '500',
        }
      };
    }
    if (event.type === 'slot') {
      const colors: Record<string, string> = {
        'FULL': '#3b82f6',
        'AM': '#22c55e',
        'PM': '#22c55e',
        'SUNSET': '#f97316',
      };
      return {
        style: {
          background: colors[event.slotData?.part] || '#6b7280',
          border: 'none',
          color: '#fff',
          borderRadius: '4px',
          fontWeight: '500',
        }
      };
    }
    return {};
  };

  const onSelectEvent = (ev: any) => {
    if (ev.type === 'reservation' && ev.resData) {
      setReservationInfo(ev.resData);
    }
  };

  const boatAvail = useMemo(()=>{
    const agg: Record<number, number> = {};
    slots.forEach(s=>{ 
      if(s.status === 'available') {
        agg[s.boatId] = (agg[s.boatId] || 0) + 1;
      }
    });
    return agg;
  },[slots]);

  async function addSlot() {
    if (!selectedBoat || !newSlotDate) {
      alert(t.selectBoatAndDate);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boatId: selectedBoat,
          date: newSlotDate,
          part: newSlotPart,
        }),
      });
      if (res.ok) {
        await load(date);
        setNewSlotDate('');
        setShowAddSlot(false);
        alert(t.slotAdded);
      }
    } catch {
      alert(t.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendrier principal */}
      <div className='flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm p-4'>
        <Calendar
          localizer={localizer}
          date={date}
          onNavigate={setDate}
          view={view}
          onView={setView}
          events={events}
          startAccessor='start'
          endAccessor='end'
          onSelectEvent={onSelectEvent}
          eventPropGetter={eventPropGetter}
          style={{ height: '70vh' }}
          views={['month']}
        />
      </div>

      {/* Sidebar simplifiée */}
      <aside className='w-full lg:w-80 shrink-0 space-y-4'>
        {/* Légende */}
        <div className='p-4 rounded-xl bg-gray-50 border border-gray-200'>
          <h3 className='font-semibold text-sm mb-3 text-gray-800'>
            {t.legend}
          </h3>
          <div className='space-y-2 text-xs'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded bg-blue-500'></div>
              <span className='text-gray-700'>{t.fullDay}</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded bg-green-500'></div>
              <span className='text-gray-700'>{t.halfDay}</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded bg-orange-500'></div>
              <span className='text-gray-700'>{t.sunset}</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded bg-red-500'></div>
              <span className='text-gray-700'>{t.reservation}</span>
            </div>
          </div>
        </div>

        {/* Liste des bateaux */}
        <div className='p-4 rounded-xl bg-white border border-gray-200'>
          <h3 className='font-semibold text-sm mb-3 text-gray-800'>
            {t.boats}
          </h3>
          <div className='space-y-2 max-h-64 overflow-y-auto'>
            {boats.map(b => {
              const active = selectedBoat === b.id;
              const count = boatAvail[b.id] || 0;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBoat(active ? null : b.id);
                    setShowAddSlot(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className={`font-medium text-sm ${active ? 'text-blue-700' : 'text-gray-800'}`}>
                      {b.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count} {t.slots}
                    </span>
                  </div>
                </button>
              );
            })}
            {boats.length === 0 && (
              <p className='text-xs text-gray-500 text-center py-4'>
                {t.noBoats}
              </p>
            )}
          </div>
        </div>

        {/* Formulaire d'ajout de créneau */}
        {selectedBoat && (
          <div className='p-4 rounded-xl bg-blue-50 border border-blue-200'>
            <h3 className='font-semibold text-sm mb-3 text-blue-800'>
              {t.addSlot}
            </h3>
            {showAddSlot ? (
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs font-medium mb-1 text-blue-800'>
                    {t.date}
                  </label>
                  <input
                    type='date'
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className='w-full h-9 px-3 rounded-lg border border-blue-300 bg-white text-sm'
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className='block text-xs font-medium mb-1 text-blue-800'>
                    {t.type}
                  </label>
                  <select
                    value={newSlotPart}
                    onChange={(e) => setNewSlotPart(e.target.value as 'FULL'|'AM'|'PM'|'SUNSET')}
                    className='w-full h-9 px-3 rounded-lg border border-blue-300 bg-white text-sm'
                  >
                    <option value='FULL'>{t.fullDay}</option>
                    <option value='AM'>{t.morning}</option>
                    <option value='PM'>{t.afternoon}</option>
                    <option value='SUNSET'>{t.sunset}</option>
                  </select>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={addSlot}
                    disabled={saving || !newSlotDate}
                    className='flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium'
                  >
                    {saving ? t.adding : t.add}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSlot(false);
                      setNewSlotDate('');
                    }}
                    className='h-9 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm'
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSlot(true)}
                className='w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium'
              >
                {t.newSlot}
              </button>
            )}
          </div>
        )}

        {/* Modal réservation */}
        {reservationInfo && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-xl shadow-lg p-6 w-full max-w-md'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-bold text-gray-900'>
                  {t.reservationDetails}
                </h3>
                <button
                  onClick={() => setReservationInfo(null)}
                  className='text-gray-400 hover:text-gray-600 text-2xl'
                >
                  ×
                </button>
              </div>
              <div className='space-y-3 text-sm'>
                <div>
                  <strong className='text-gray-600'>{t.boat}:</strong>
                  <div className='text-gray-900 font-medium'>
                    {reservationInfo.boat?.name || boats.find(b=>b.id===reservationInfo.boatId)?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <strong className='text-gray-600'>{t.period}:</strong>
                  <div className='text-gray-900'>
                    {reservationInfo.startDate.split('T')[0]} → {reservationInfo.endDate.split('T')[0]}
                  </div>
                </div>
                {reservationInfo.totalPrice && (
                  <div>
                    <strong className='text-gray-600'>{t.price}:</strong>
                    <div className='text-gray-900 font-semibold text-lg'>
                      {reservationInfo.totalPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

