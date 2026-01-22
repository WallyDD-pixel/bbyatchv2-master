"use client";
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, endOfDay, addDays } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface Boat { id: number; name: string; slug: string; imageUrl?: string|null; }
interface Experience { id: number; titleFr: string; titleEn: string; }
interface Slot { id: number; boatId: number; date: string; part: string; status: string; note?: string | null; }
interface Reservation { id: string; boatId: number | null; startDate: string; endDate: string; status: string; }

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  boats: Boat[];
  experiences: Experience[];
  locale: 'fr' | 'en';
  onSave: (data: {
    boatId: number;
    experienceId?: number | null;
    dates: string[];
    part: 'FULL' | 'AM' | 'PM' | 'SUNSET';
    note?: string;
  }) => Promise<void>;
}

export default function AvailabilityModal({ isOpen, onClose, boats, experiences, locale, onSave }: AvailabilityModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBoatId, setSelectedBoatId] = useState<number | null>(null);
  const [selectedExperienceId, setSelectedExperienceId] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [part, setPart] = useState<'FULL' | 'AM' | 'PM' | 'SUNSET'>('FULL');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkToEvent, setLinkToEvent] = useState(false);
  const [existingSlots, setExistingSlots] = useState<Slot[]>([]);
  const [existingReservations, setExistingReservations] = useState<Reservation[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const loc = locale === 'fr' ? fr : enUS;

  // Charger les disponibilités existantes quand un bateau est sélectionné et qu'on passe à l'étape 2
  useEffect(() => {
    if (step === 2 && selectedBoatId) {
      loadExistingAvailability();
    }
  }, [step, selectedBoatId, currentMonth]);

  const loadExistingAvailability = async () => {
    if (!selectedBoatId) return;
    
    setLoadingAvailability(true);
    try {
      // Calculer la plage de dates à charger (mois actuel + mois précédent et suivant)
      const start = startOfDay(addDays(startOfMonth(currentMonth), -15));
      const end = endOfDay(addDays(endOfMonth(currentMonth), 15));
      const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
      
      const res = await fetch(`/api/admin/availability?from=${fmt(start)}&to=${fmt(end)}`);
      if (res.ok) {
        const data = await res.json();
        // Filtrer les slots et réservations pour le bateau sélectionné
        const boatSlots = (data.slots || []).filter((s: Slot) => s.boatId === selectedBoatId);
        const boatReservations = (data.reservations || []).filter((r: Reservation) => r.boatId === selectedBoatId);
        setExistingSlots(boatSlots);
        setExistingReservations(boatReservations);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Fonction pour normaliser une date en string YYYY-MM-DD en UTC
  // Les slots sont stockés en UTC, donc on doit normaliser en UTC aussi
  const normalizeDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      // Si c'est déjà une string, extraire juste la partie date
      return date.split('T')[0];
    }
    // Utiliser UTC pour correspondre au format de stockage des slots
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour vérifier si une date a une réservation
  const hasReservation = (date: Date): boolean => {
    const dateStr = normalizeDate(date);
    return existingReservations.some(r => {
      const start = normalizeDate(r.startDate);
      const end = normalizeDate(r.endDate);
      return dateStr >= start && dateStr <= end && r.status !== 'cancelled' && r.status !== 'canceled';
    });
  };

  // Fonction pour vérifier si une date a un slot existant
  const hasSlot = (date: Date): { has: boolean; parts: string[] } => {
    const dateStr = normalizeDate(date);
    const slotsForDate = existingSlots.filter(s => {
      // s.date peut être une string ou un objet Date
      const slotDateStr = normalizeDate(s.date);
      const matches = slotDateStr === dateStr && s.status === 'available';
      if (matches) {
        console.log(`[AvailabilityModal] Slot found for ${dateStr}:`, { slotDateStr, part: s.part, boatId: s.boatId, selectedBoatId });
      }
      return matches;
    });
    return {
      has: slotsForDate.length > 0,
      parts: slotsForDate.map(s => s.part)
    };
  };

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const toggleDate = (date: Date) => {
    // Empêcher la sélection si la date a une réservation
    if (hasReservation(date)) {
      alert(locale === 'fr' 
        ? 'Cette date a déjà une réservation. Impossible d\'ajouter un créneau.'
        : 'This date already has a reservation. Cannot add a slot.'
      );
      return;
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const selectDateRange = (start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });
    const newDates = new Set(selectedDates);
    days.forEach(day => {
      newDates.add(format(day, 'yyyy-MM-dd'));
    });
    setSelectedDates(newDates);
  };

  const handleNext = () => {
    if (step === 1 && selectedBoatId) {
      setStep(2);
    } else if (step === 2 && selectedDates.size > 0) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!selectedBoatId || selectedDates.size === 0) return;
    
    setSaving(true);
    try {
      await onSave({
        boatId: selectedBoatId,
        experienceId: linkToEvent ? selectedExperienceId : null,
        dates: Array.from(selectedDates).sort(),
        part,
        note: note.trim() || undefined,
      });
      
      // Réinitialiser et fermer
      setStep(1);
      setSelectedBoatId(null);
      setSelectedExperienceId(null);
      setSelectedDates(new Set());
      setPart('FULL');
      setNote('');
      setLinkToEvent(false);
      setCurrentMonth(new Date());
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
      alert(locale === 'fr' ? 'Erreur lors de l\'enregistrement' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setStep(1);
    setSelectedBoatId(null);
    setSelectedExperienceId(null);
    setSelectedDates(new Set());
    setPart('FULL');
    setNote('');
    setLinkToEvent(false);
    setCurrentMonth(new Date());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📅</span>
              {locale === 'fr' ? 'Définir des disponibilités' : 'Define availability'}
            </h2>
            <button
              onClick={handleClose}
              disabled={saving}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              ✕
            </button>
          </div>
          {/* Progress indicator */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  step >= s ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Sélection du bateau */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? '1. Sélectionner un bateau' : '1. Select a boat'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {locale === 'fr' 
                    ? 'Choisissez le bateau pour lequel vous souhaitez définir des disponibilités'
                    : 'Choose the boat for which you want to define availability'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boats.map(boat => (
                  <button
                    key={boat.id}
                    onClick={() => setSelectedBoatId(boat.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedBoatId === boat.id
                        ? 'border-blue-600 bg-blue-50 shadow-md scale-[1.02]'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {boat.imageUrl ? (
                        <img src={boat.imageUrl} alt={boat.name} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-semibold">
                          🛥️
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{boat.name}</p>
                        {selectedBoatId === boat.id && (
                          <p className="text-xs text-blue-600 mt-1">✓ {locale === 'fr' ? 'Sélectionné' : 'Selected'}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Sélection des dates */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? '2. Sélectionner les dates' : '2. Select dates'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {locale === 'fr' 
                    ? 'Cliquez sur les dates du calendrier pour les sélectionner. Vous pouvez sélectionner plusieurs dates.'
                    : 'Click on calendar dates to select them. You can select multiple dates.'}
                </p>
              </div>

              {/* Calendar navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ←
                </button>
                <h4 className="text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: loc })}
                </h4>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  →
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isSelected = selectedDates.has(dateStr);
                  const isToday = isSameDay(day, new Date());
                  const isPast = day < new Date() && !isToday;
                  const hasRes = hasReservation(day);
                  const slotInfo = hasSlot(day);
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => !isPast && !hasRes && toggleDate(day)}
                      disabled={isPast || hasRes}
                      title={
                        hasRes 
                          ? (locale === 'fr' ? 'Réservation existante - Non sélectionnable' : 'Existing reservation - Not selectable')
                          : slotInfo.has
                          ? (locale === 'fr' ? `Slot existant: ${slotInfo.parts.join(', ')}` : `Existing slot: ${slotInfo.parts.join(', ')}`)
                          : ''
                      }
                      className={`
                        aspect-square rounded-lg text-sm font-medium transition-all relative
                        ${isPast ? 'opacity-30 cursor-not-allowed' : hasRes ? 'opacity-60 cursor-not-allowed bg-red-100 text-red-700 border-2 border-red-300' : 'cursor-pointer hover:scale-110'}
                        ${isSelected 
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' 
                          : isToday && !hasRes
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : slotInfo.has && !hasRes
                          ? 'bg-green-50 text-green-700 border-2 border-green-300'
                          : !hasRes
                          ? 'bg-gray-50 text-gray-700 hover:bg-gray-200'
                          : ''
                        }
                      `}
                    >
                      {format(day, 'd')}
                      {hasRes && (
                        <span className="absolute top-0.5 right-0.5 text-[8px]" title={locale === 'fr' ? 'Réservation' : 'Reservation'}>🚫</span>
                      )}
                      {slotInfo.has && !hasRes && (
                        <span className="absolute top-0.5 right-0.5 text-[8px]" title={locale === 'fr' ? 'Slot existant' : 'Existing slot'}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Légende */}
              {loadingAvailability ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{locale === 'fr' ? 'Chargement des disponibilités...' : 'Loading availability...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-50 border-2 border-green-300"></div>
                    <span>{locale === 'fr' ? 'Slot existant' : 'Existing slot'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
                    <span>{locale === 'fr' ? 'Réservation (non sélectionnable)' : 'Reservation (not selectable)'}</span>
                  </div>
                </div>
              )}

              {/* Selected dates summary */}
              {selectedDates.size > 0 && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">
                      {locale === 'fr' ? 'Dates sélectionnées' : 'Selected dates'} ({selectedDates.size})
                    </span>
                    <button
                      onClick={() => setSelectedDates(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {locale === 'fr' ? 'Effacer' : 'Clear'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {Array.from(selectedDates).sort().map(date => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg"
                      >
                        {format(new Date(date + 'T00:00:00'), 'dd/MM', { locale: loc })}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDates(prev => {
                              const next = new Set(prev);
                              next.delete(date);
                              return next;
                            });
                          }}
                          className="hover:opacity-80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configuration du créneau */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? '3. Configurer le créneau' : '3. Configure slot'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {locale === 'fr' 
                    ? 'Définissez le type de créneau et les options supplémentaires'
                    : 'Define the slot type and additional options'}
                </p>
              </div>

              {/* Type de créneau */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? 'Type de créneau' : 'Slot type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['FULL', 'AM', 'PM', 'SUNSET'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPart(p)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        part === p
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-2xl mb-2 ${
                          part === p ? 'scale-110' : ''
                        } transition-transform`}>
                          {p === 'FULL' ? '🔵' : p === 'AM' || p === 'PM' ? '🟢' : '🟠'}
                        </div>
                        <p className="font-semibold text-sm text-gray-900">
                          {p === 'FULL' 
                            ? locale === 'fr' ? 'Journée complète (8h)' : 'Full day (8h)'
                            : p === 'AM'
                            ? locale === 'fr' ? 'Matin (4h)' : 'Morning (4h)'
                            : p === 'PM'
                            ? locale === 'fr' ? 'Après-midi (4h)' : 'Afternoon (4h)'
                            : 'Sunset (2h)'
                          }
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lier à un événement */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkToEvent}
                    onChange={(e) => setLinkToEvent(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {locale === 'fr' ? 'Lier à un événement' : 'Link to an event'}
                  </span>
                </label>
                {linkToEvent && (
                  <div className="mt-3">
                    <select
                      value={selectedExperienceId || ''}
                      onChange={(e) => setSelectedExperienceId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale === 'fr' ? 'Sélectionner un événement' : 'Select an event'}</option>
                      {experiences.map(exp => (
                        <option key={exp.id} value={exp.id}>
                          {locale === 'fr' ? exp.titleFr : exp.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? 'Note (optionnelle)' : 'Note (optional)'}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder={locale === 'fr' ? 'Ajoutez une note ou un commentaire...' : 'Add a note or comment...'}
                />
              </div>

              {/* Résumé */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  {locale === 'fr' ? 'Résumé' : 'Summary'}
                </h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>{locale === 'fr' ? 'Bateau:' : 'Boat:'}</strong>{' '}
                    {boats.find(b => b.id === selectedBoatId)?.name}
                  </p>
                  <p>
                    <strong>{locale === 'fr' ? 'Dates:' : 'Dates:'}</strong> {selectedDates.size} {locale === 'fr' ? 'date(s)' : 'date(s)'}
                  </p>
                  <p>
                    <strong>{locale === 'fr' ? 'Type:' : 'Type:'}</strong>{' '}
                    {part === 'FULL' 
                      ? locale === 'fr' ? 'Journée complète' : 'Full day'
                      : part === 'AM'
                      ? locale === 'fr' ? 'Matin' : 'Morning'
                      : part === 'PM'
                      ? locale === 'fr' ? 'Après-midi' : 'Afternoon'
                      : 'Sunset'
                    }
                  </p>
                  {linkToEvent && selectedExperienceId && (
                    <p>
                      <strong>{locale === 'fr' ? 'Événement:' : 'Event:'}</strong>{' '}
                      {experiences.find(e => e.id === selectedExperienceId)?.[locale === 'fr' ? 'titleFr' : 'titleEn']}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1 || saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← {locale === 'fr' ? 'Précédent' : 'Previous'}
          </button>
          <div className="flex gap-2">
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedBoatId) ||
                  (step === 2 && selectedDates.size === 0) ||
                  saving
                }
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {locale === 'fr' ? 'Suivant' : 'Next'} →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !selectedBoatId || selectedDates.size === 0}
                className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {locale === 'fr' ? 'Enregistrement...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    ✓ {locale === 'fr' ? 'Valider' : 'Save'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
