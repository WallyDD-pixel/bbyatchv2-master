"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AgencyUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
}

interface BoatOption {
  id: number;
  label: string;
  price: number | null;
}

interface Boat {
  id: number;
  name: string;
  slug: string;
  capacity: number;
  pricePerDay: number;
  priceAm: number | null;
  pricePm: number | null;
  priceSunset: number | null;
  priceAgencyPerDay: number | null;
  priceAgencyAm: number | null;
  priceAgencyPm: number | null;
  priceAgencySunset: number | null;
  skipperRequired: boolean;
  skipperPrice: number | null;
  options?: BoatOption[];
}

interface Props {
  locale: 'fr' | 'en';
  agencyUsers: AgencyUser[];
  boats: Boat[];
}

export default function CreateReservationForm({ locale, agencyUsers, boats }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    boatId: '',
    startDate: '',
    endDate: '',
    part: 'FULL' as 'FULL' | 'AM' | 'PM' | 'SUNSET',
    passengers: '',
    selectedOptions: [] as number[],
    totalPrice: '',
    depositAmount: '',
    notes: '',
  });

  const selectedBoat = boats.find(b => b.id.toString() === formData.boatId) as Boat | undefined;
  const selectedUser = agencyUsers.find(u => u.id === formData.userId);

  // Calculer le nombre de jours
  const nbJours = (() => {
    if (!formData.startDate) return 1;
    const s = new Date(formData.startDate + 'T00:00:00');
    const e = formData.endDate ? new Date(formData.endDate + 'T00:00:00') : s;
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  })();

  // Calculer le prix estimé
  const calculateEstimatedPrice = () => {
    if (!selectedBoat) return null;
    const part = formData.part;
    const isAgency = true; // Toujours agence pour cette interface
    
    let basePrice = 0;
    if (part === 'FULL') {
      basePrice = (selectedBoat.priceAgencyPerDay ?? selectedBoat.pricePerDay) * nbJours;
    } else if (part === 'AM') {
      basePrice = selectedBoat.priceAgencyAm ?? selectedBoat.priceAm ?? 0;
    } else if (part === 'PM') {
      basePrice = selectedBoat.priceAgencyPm ?? selectedBoat.pricePm ?? 0;
    } else if (part === 'SUNSET') {
      basePrice = selectedBoat.priceAgencySunset ?? selectedBoat.priceSunset ?? 0;
    }

    // Skipper
    const settings = { defaultSkipperPrice: 350 }; // TODO: récupérer depuis API si besoin
    const skipperPrice = selectedBoat.skipperPrice ?? settings.defaultSkipperPrice;
    const skipperDays = (part === 'FULL' || part === 'SUNSET') ? Math.max(nbJours, 1) : 1;
    const skipperTotal = selectedBoat.skipperRequired ? (skipperPrice * skipperDays) : 0;

    // Options
    const optionsTotal = (selectedBoat.options || [])
      .filter((opt) => formData.selectedOptions.includes(opt.id))
      .reduce((sum, opt) => sum + (opt.price || 0), 0);

    return basePrice + skipperTotal + optionsTotal;
  };

  const estimatedPrice = calculateEstimatedPrice();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/reservations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId,
          boatId: parseInt(formData.boatId, 10),
          startDate: formData.startDate,
          endDate: formData.endDate || formData.startDate,
          part: formData.part,
          passengers: formData.passengers ? parseInt(formData.passengers, 10) : null,
          totalPrice: parseInt(formData.totalPrice, 10) || estimatedPrice || 0,
          depositAmount: parseInt(formData.depositAmount, 10) || 0,
          optionIds: formData.selectedOptions,
          notes: formData.notes || null,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/reservations');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {locale === 'fr' ? 'Réservation créée avec succès !' : 'Reservation created successfully!'}
        </div>
      )}

      {/* Sélection de l'agence */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Agence *' : 'Agency *'}
        </label>
        <select
          required
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        >
          <option value="">{locale === 'fr' ? 'Sélectionner une agence...' : 'Select an agency...'}</option>
          {agencyUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
            </option>
          ))}
        </select>
        {selectedUser && (
          <p className="mt-1 text-xs text-black/50">{selectedUser.email}</p>
        )}
      </div>

      {/* Sélection du bateau */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Bateau *' : 'Boat *'}
        </label>
        <select
          required
          value={formData.boatId}
          onChange={(e) => setFormData({ ...formData, boatId: e.target.value })}
          className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        >
          <option value="">{locale === 'fr' ? 'Sélectionner un bateau...' : 'Select a boat...'}</option>
          {boats.map((boat) => (
            <option key={boat.id} value={boat.id}>
              {boat.name} ({boat.capacity} pax)
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-black/70 mb-2">
            {locale === 'fr' ? 'Date de début *' : 'Start date *'}
          </label>
          <input
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-black/70 mb-2">
            {locale === 'fr' ? 'Date de fin' : 'End date'}
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            min={formData.startDate}
            disabled={formData.part !== 'FULL' && formData.part !== 'SUNSET'}
            className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {(formData.part === 'FULL' || formData.part === 'SUNSET') && formData.startDate && (
            <p className="mt-1 text-xs text-black/50">
              {locale === 'fr' ? `${nbJours} jour${nbJours > 1 ? 's' : ''}` : `${nbJours} day${nbJours > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </div>

      {/* Type de prestation */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Type de prestation *' : 'Service type *'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['FULL', 'AM', 'PM', 'SUNSET'] as const).map((p) => {
            const labels: Record<typeof p, { fr: string; en: string }> = {
              FULL: { fr: 'Journée entière', en: 'Full day' },
              AM: { fr: 'Matin', en: 'Morning' },
              PM: { fr: 'Après-midi', en: 'Afternoon' },
              SUNSET: { fr: 'Sunset (2h)', en: 'Sunset (2h)' },
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, part: p, endDate: p === 'FULL' || p === 'SUNSET' ? formData.endDate : formData.startDate });
                }}
                className={`h-11 rounded-lg border text-sm font-medium transition ${
                  formData.part === p
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white'
                    : 'border-black/15 bg-white text-black/70 hover:border-black/30'
                }`}
              >
                {labels[p][locale]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passagers */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Nombre de passagers' : 'Number of passengers'}
        </label>
        <input
          type="number"
          min="1"
          max={selectedBoat?.capacity || 100}
          value={formData.passengers}
          onChange={(e) => setFormData({ ...formData, passengers: e.target.value })}
          className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        {selectedBoat && (
          <p className="mt-1 text-xs text-black/50">
            {locale === 'fr' ? `Capacité maximale : ${selectedBoat.capacity} passagers` : `Max capacity: ${selectedBoat.capacity} passengers`}
          </p>
        )}
      </div>

      {/* Options */}
      {selectedBoat && selectedBoat.options && selectedBoat.options.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-black/70 mb-2">
            {locale === 'fr' ? 'Options' : 'Options'}
          </label>
          <div className="space-y-2">
            {selectedBoat.options.map((opt) => {
              const isSelected = formData.selectedOptions.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/5'
                      : 'border-black/15 hover:border-black/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, selectedOptions: [...formData.selectedOptions, opt.id] });
                      } else {
                        setFormData({ ...formData, selectedOptions: formData.selectedOptions.filter(id => id !== opt.id) });
                      }
                    }}
                    className="accent-[color:var(--primary)]"
                  />
                  <span className="flex-1 text-sm">{opt.label}</span>
                  {opt.price != null && (
                    <span className="text-sm font-semibold text-[color:var(--primary)]">
                      +{opt.price.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Prix estimé */}
      {estimatedPrice !== null && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            {locale === 'fr' ? 'Prix estimé (hors carburant)' : 'Estimated price (excluding fuel)'}
          </p>
          <p className="text-lg font-bold text-blue-800">
            {estimatedPrice.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €
          </p>
          {selectedBoat?.skipperRequired && (
            <p className="mt-2 text-xs text-blue-700">
              {locale === 'fr' ? 'Inclut le skipper obligatoire' : 'Includes required skipper'}
            </p>
          )}
        </div>
      )}

      {/* Prix total */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Prix total (€) *' : 'Total price (€) *'}
        </label>
        <input
          type="number"
          required
          min="0"
          step="1"
          value={formData.totalPrice}
          onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
          placeholder={estimatedPrice?.toString() || '0'}
          className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <p className="mt-1 text-xs text-black/50">
          {locale === 'fr' ? 'Prix final incluant toutes les options. Le carburant sera ajouté séparément après la location.' : 'Final price including all options. Fuel will be added separately after rental.'}
        </p>
      </div>

      {/* Acompte */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Acompte (€)' : 'Deposit (€)'}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={formData.depositAmount}
          onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
          placeholder="0"
          className="w-full h-11 rounded-lg border border-black/15 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <p className="mt-1 text-xs text-black/50">
          {locale === 'fr' ? 'Montant de l\'acompte payé (optionnel)' : 'Deposit amount paid (optional)'}
        </p>
      </div>

      {/* Notes internes */}
      <div>
        <label className="block text-sm font-semibold text-black/70 mb-2">
          {locale === 'fr' ? 'Notes internes' : 'Internal notes'}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-black/15 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
          placeholder={locale === 'fr' ? 'Notes internes pour cette réservation...' : 'Internal notes for this reservation...'}
        />
      </div>

      {/* Boutons */}
      <div className="flex items-center gap-3 pt-4 border-t border-black/10">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow"
          style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
        >
          {saving ? (locale === 'fr' ? 'Création...' : 'Creating...') : (locale === 'fr' ? 'Créer la réservation' : 'Create reservation')}
        </button>
        <Link
          href="/admin/reservations"
          className="h-11 px-6 rounded-full border border-black/15 text-black/70 text-sm font-medium hover:bg-black/5 inline-flex items-center"
        >
          {locale === 'fr' ? 'Annuler' : 'Cancel'}
        </Link>
      </div>
    </form>
  );
}

