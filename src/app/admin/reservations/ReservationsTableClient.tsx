"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

interface Reservation {
  id: string;
  reference?: string | null;
  startDate: string;
  endDate: string;
  part: string | null;
  totalPrice: number | null;
  depositAmount: number | null;
  remainingAmount: number | null;
  status: string;
  finalFuelAmount: number | null;
  user?: { email?: string; firstName?: string | null; lastName?: string | null; role?: string | null } | null;
  boat?: { name: string; slug: string } | null;
}

interface Props {
  reservations: Reservation[];
  locale: "fr" | "en";
  updateReservationStatus: (formData: FormData) => void;
  updateFinalFuelAmount: (formData: FormData) => void;
  deleteReservations: (ids: string[]) => Promise<void>;
}

export default function ReservationsTableClient({
  reservations,
  locale,
  updateReservationStatus,
  updateFinalFuelAmount,
  deleteReservations,
}: Props) {
  // États pour les filtres
  const [filterAgency, setFilterAgency] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [filterBoat, setFilterBoat] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Fonctions utilitaires définies dans le composant client
  const dateFmt = (d: Date) => d.toISOString().slice(0, 10);
  const dayCount = (r: Reservation) => {
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  };
  const partLabel = (p: string | null | undefined) =>
    p === "FULL"
      ? locale === "fr"
        ? "Journée entière"
        : "Full day"
      : p === "AM"
      ? locale === "fr"
        ? "Matin"
        : "Morning"
      : p === "PM"
      ? locale === "fr"
        ? "Après-midi"
        : "Afternoon"
      : "—";
  const money = (v: number | undefined | null) =>
    v == null ? "—" : (v / 1).toLocaleString(locale === "fr" ? "fr-FR" : "en-US") + " €";
  const statusLabel = (s: string) => {
    switch (s) {
      case "pending_deposit":
        return locale === "fr" ? "Acompte en attente" : "Deposit pending";
      case "deposit_paid":
        return locale === "fr" ? "Acompte payé" : "Deposit paid";
      case "completed":
        return locale === "fr" ? "Terminée" : "Completed";
      case "cancelled":
        return locale === "fr" ? "Annulée" : "Cancelled";
      default:
        return s;
    }
  };
  const badgeClass = (s: string) => {
    switch (s) {
      case "deposit_paid":
        return "bg-emerald-100 text-emerald-700";
      case "pending_deposit":
        return "bg-amber-100 text-amber-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-black/10 text-black/60";
    }
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  
  // Filtrer les réservations
  const filteredReservations = reservations.filter((r) => {
    const userName = [r.user?.firstName, r.user?.lastName]
      .filter(Boolean)
      .join(" ") || r.user?.email || '';
    const userEmail = r.user?.email || '';
    const boatName = r.boat?.name || '';
    
    // Vérifier si l'utilisateur est une agence en utilisant le rôle
    const isAgency = r.user?.role === 'agency';
    
    if (filterAgency === 'agency' && !isAgency) return false;
    if (filterAgency === 'client' && isAgency) return false;
    
    if (filterName && !userName.toLowerCase().includes(filterName.toLowerCase()) && 
        !userEmail.toLowerCase().includes(filterName.toLowerCase())) return false;
    
    if (filterBoat && !boatName.toLowerCase().includes(filterBoat.toLowerCase())) return false;
    
    if (filterStatus && r.status !== filterStatus) return false;
    
    return true;
  });
  
  // Extraire les noms uniques des bateaux pour le filtre
  const uniqueBoats = Array.from(new Set(reservations.map(r => r.boat?.name).filter(Boolean) as string[])).sort();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReservations.map((r) => r.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        locale === "fr"
          ? `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} réservation(s) ?`
          : `Are you sure you want to delete ${selectedIds.size} reservation(s)?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteReservations(Array.from(selectedIds));
      setSelectedIds(new Set());
    });
  };

  return (
    <>
      {/* Filtres de recherche */}
      <div className="mb-4 p-4 rounded-xl border border-black/10 bg-white shadow-sm">
        <h3 className="text-sm font-semibold text-black/70 mb-3">
          {locale === 'fr' ? 'Filtres de recherche' : 'Search filters'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtre par type (agence/client) */}
          <div>
            <label className="block text-xs font-medium text-black/60 mb-1">
              {locale === 'fr' ? 'Type' : 'Type'}
            </label>
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="w-full h-9 rounded-lg border border-black/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              <option value="">{locale === 'fr' ? 'Tous' : 'All'}</option>
              <option value="agency">{locale === 'fr' ? 'Agences' : 'Agencies'}</option>
              <option value="client">{locale === 'fr' ? 'Clients directs' : 'Direct clients'}</option>
            </select>
          </div>
          
          {/* Filtre par nom/email */}
          <div>
            <label className="block text-xs font-medium text-black/60 mb-1">
              {locale === 'fr' ? 'Nom ou email' : 'Name or email'}
            </label>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder={locale === 'fr' ? 'Rechercher...' : 'Search...'}
              className="w-full h-9 rounded-lg border border-black/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
          
          {/* Filtre par bateau */}
          <div>
            <label className="block text-xs font-medium text-black/60 mb-1">
              {locale === 'fr' ? 'Bateau' : 'Boat'}
            </label>
            <input
              type="text"
              value={filterBoat}
              onChange={(e) => setFilterBoat(e.target.value)}
              placeholder={locale === 'fr' ? 'Nom du bateau...' : 'Boat name...'}
              className="w-full h-9 rounded-lg border border-black/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
          
          {/* Filtre par statut */}
          <div>
            <label className="block text-xs font-medium text-black/60 mb-1">
              {locale === 'fr' ? 'Statut' : 'Status'}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-9 rounded-lg border border-black/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              <option value="">{locale === 'fr' ? 'Tous' : 'All'}</option>
              <option value="pending_deposit">{locale === 'fr' ? 'Acompte en attente' : 'Deposit pending'}</option>
              <option value="deposit_paid">{locale === 'fr' ? 'Acompte payé' : 'Deposit paid'}</option>
              <option value="completed">{locale === 'fr' ? 'Terminée' : 'Completed'}</option>
              <option value="cancelled">{locale === 'fr' ? 'Annulée' : 'Cancelled'}</option>
            </select>
          </div>
        </div>
        {(filterAgency || filterName || filterBoat || filterStatus) && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setFilterAgency('');
                setFilterName('');
                setFilterBoat('');
                setFilterStatus('');
              }}
              className="text-xs text-[color:var(--primary)] hover:underline"
            >
              {locale === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
            </button>
            <span className="text-xs text-black/50">
              {locale === 'fr' 
                ? `${filteredReservations.length} réservation(s) trouvée(s)`
                : `${filteredReservations.length} reservation(s) found`}
            </span>
          </div>
        )}
      </div>
      
      {/* Barre d'actions pour les sélections */}
      {selectedIds.size > 0 && (
        <div className="mt-4 mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium text-blue-900">
            {locale === "fr"
              ? `${selectedIds.size} réservation(s) sélectionnée(s)`
              : `${selectedIds.size} reservation(s) selected`}
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {isPending
              ? locale === "fr"
                ? "Suppression..."
                : "Deleting..."
              : locale === "fr"
              ? "🗑️ Supprimer les sélectionnées"
              : "🗑️ Delete selected"}
          </button>
        </div>
      )}

      <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-black/10 bg-white p-3 sm:p-5 shadow-sm overflow-x-auto -mx-3 sm:mx-0">
        <table className="min-w-full text-[10px] sm:text-xs md:text-sm align-middle">
          <thead>
            <tr className="text-left text-black/70 bg-black/[0.035]">
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-10 sm:w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredReservations.length && filteredReservations.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer"
                  title={locale === "fr" ? "Tout sélectionner" : "Select all"}
                />
              </th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">Ref</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">User</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell">Email</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3">Boat</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Début" : "Start"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Fin" : "End"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">{locale === "fr" ? "Jours" : "Days"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Partie" : "Part"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell">{locale === "fr" ? "Total" : "Total"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell">{locale === "fr" ? "Acompte" : "Deposit"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden xl:table-cell">{locale === "fr" ? "Reste" : "Remaining"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3">{locale === "fr" ? "Statut" : "Status"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Fact. acompte" : "Dep. Inv."}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Fact. finale" : "Final Inv."}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">{locale === "fr" ? "Carburant" : "Fuel"}</th>
              <th className="py-2 sm:py-2.5 px-2 sm:px-3">{locale === "fr" ? "Changer" : "Change"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.length === 0 && (
              <tr>
                <td colSpan={17} className="py-8 text-center text-black/60">
                  {locale === "fr" 
                    ? (reservations.length === 0 ? "Aucune réservation." : "Aucune réservation ne correspond aux filtres.")
                    : (reservations.length === 0 ? "No reservations." : "No reservations match the filters.")}
                </td>
              </tr>
            )}
            {filteredReservations.map((r) => {
              const userName = [r.user?.firstName, r.user?.lastName]
                .filter(Boolean)
                .join(" ") || r.user?.email || r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-t border-black/10 hover:bg-black/[0.03] cursor-pointer ${
                    selectedIds.has(r.id) ? "bg-blue-50" : ""
                  }`}
                  onClick={(e) => {
                    // Ne pas rediriger si on clique sur un checkbox, un input, un select, un button ou un lien
                    const target = e.target as HTMLElement;
                    if (
                      target.tagName === 'INPUT' ||
                      target.tagName === 'SELECT' ||
                      target.tagName === 'BUTTON' ||
                      target.tagName === 'A' ||
                      target.closest('input, select, button, a, form')
                    ) {
                      return;
                    }
                    window.location.href = `/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`;
                  }}
                >
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer"
                    />
                  </td>
                  <td
                    className="py-2 sm:py-2.5 px-2 sm:px-3 text-[9px] sm:text-[10px] text-black/60 max-w-[90px] truncate hidden lg:table-cell"
                    title={r.id}
                  >
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="text-[color:var(--primary)] hover:underline"
                    >
                      {r.reference || r.id.slice(-6)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap hidden md:table-cell">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block text-[color:var(--primary)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {userName}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap text-black/60 hidden xl:table-cell">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.user?.email}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap font-medium">
                    {r.boat ? (
                      <Link
                        href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                        className="text-[color:var(--primary)] hover:underline text-[10px] sm:text-xs"
                      >
                        {r.boat.name}
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                        className="text-[color:var(--primary)] hover:underline text-[10px] sm:text-xs"
                      >
                        {r.id.slice(-6)}
                      </Link>
                    )}
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap hidden lg:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dateFmt(new Date(r.startDate))}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap hidden lg:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dateFmt(new Date(r.endDate))}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center hidden md:table-cell">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dayCount(r)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {partLabel(r.part)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-medium hidden xl:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {money(r.totalPrice)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right hidden xl:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {money(r.depositAmount)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right hidden xl:table-cell text-[9px] sm:text-[10px]">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {money(r.remainingAmount)}
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                    <Link
                      href={`/admin/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 sm:px-2.5 h-5 sm:h-6 text-[9px] sm:text-[10px] font-semibold ${badgeClass(
                          r.status
                        )}`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`/api/invoices/${r.id}`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-full border border-black/15 px-2 sm:px-2.5 h-6 sm:h-7 text-[9px] sm:text-[10px] hover:bg-black/5 transition-colors"
                    >
                      PDF
                    </a>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`/api/invoices/final/${r.id}`}
                      target="_blank"
                      className={`inline-flex items-center justify-center rounded-full border border-black/15 px-2 sm:px-2.5 h-6 sm:h-7 text-[9px] sm:text-[10px] hover:bg-black/5 transition-colors ${
                        r.status !== "completed"
                          ? "pointer-events-none opacity-40"
                          : ""
                      }`}
                    >
                      PDF
                    </a>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[90px] sm:min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    <form action={updateFinalFuelAmount} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        type="number"
                        name="finalFuelAmount"
                        defaultValue={r.finalFuelAmount || ""}
                        placeholder="0"
                        min="0"
                        step="1"
                        disabled={r.status !== "completed"}
                        className="border border-black/20 rounded-md h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px] bg-white w-16 sm:w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={r.status !== "completed"}
                        className="h-6 sm:h-7 px-1.5 sm:px-2 rounded-md bg-blue-600 text-white text-[9px] sm:text-[10px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        title={
                          locale === "fr"
                            ? "Mettre à jour le montant du carburant"
                            : "Update fuel amount"
                        }
                      >
                        €
                      </button>
                    </form>
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[120px] sm:min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                    <form action={updateReservationStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <select
                        name="status"
                        defaultValue={r.status}
                        className="border border-black/20 rounded-md h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px] bg-white flex-1 min-w-0"
                      >
                        <option value="pending_deposit">
                          {locale === "fr" ? "Acompte attente" : "Pending deposit"}
                        </option>
                        <option value="deposit_paid">
                          {locale === "fr" ? "Acompte payé" : "Deposit paid"}
                        </option>
                        <option value="completed">
                          {locale === "fr" ? "Terminée" : "Completed"}
                        </option>
                        <option value="cancelled">
                          {locale === "fr" ? "Annulée" : "Cancelled"}
                        </option>
                      </select>
                      <button
                        type="submit"
                        className="h-6 sm:h-7 px-2 sm:px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[9px] sm:text-[11px] transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        OK
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

