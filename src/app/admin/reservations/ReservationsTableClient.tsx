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
  user?: { email?: string; firstName?: string | null; lastName?: string | null } | null;
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
    if (selectedIds.size === reservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reservations.map((r) => r.id)));
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
      {/* Barre d'actions pour les sélections */}
      {selectedIds.size > 0 && (
        <div className="mt-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {locale === "fr"
              ? `${selectedIds.size} réservation(s) sélectionnée(s)`
              : `${selectedIds.size} reservation(s) selected`}
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm align-middle">
          <thead>
            <tr className="text-left text-black/70 bg-black/[0.035]">
              <th className="py-2.5 px-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === reservations.length && reservations.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                  title={locale === "fr" ? "Tout sélectionner" : "Select all"}
                />
              </th>
              <th className="py-2.5 px-3">Ref</th>
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Email</th>
              <th className="py-2.5 px-3">Boat</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Début" : "Start"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Fin" : "End"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Jours" : "Days"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Partie" : "Part"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Total" : "Total"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Acompte" : "Deposit"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Reste" : "Remaining"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Statut" : "Status"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Fact. acompte" : "Dep. Inv."}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Fact. finale" : "Final Inv."}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Carburant" : "Fuel"}</th>
              <th className="py-2.5 px-3">{locale === "fr" ? "Changer" : "Change"}</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 && (
              <tr>
                <td colSpan={17} className="py-8 text-center text-black/60">
                  {locale === "fr" ? "Aucune réservation." : "No reservations."}
                </td>
              </tr>
            )}
            {reservations.map((r) => {
              const userName = [r.user?.firstName, r.user?.lastName]
                .filter(Boolean)
                .join(" ") || r.user?.email || r.id;
              return (
                <tr
                  key={r.id}
                  className={`border-t border-black/10 hover:bg-black/[0.03] ${
                    selectedIds.has(r.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td
                    className="py-2.5 px-3 text-[10px] text-black/60 max-w-[90px] truncate"
                    title={r.id}
                  >
                    {r.reference || r.id.slice(-6)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{userName}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-black/60">
                    {r.user?.email}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {r.boat ? (
                      <Link
                        href={`/boats/${r.boat.slug}`}
                        className="text-[color:var(--primary)] hover:underline"
                      >
                        {r.boat.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {dateFmt(new Date(r.startDate))}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {dateFmt(new Date(r.endDate))}
                  </td>
                  <td className="py-2.5 px-3 text-center">{dayCount(r)}</td>
                  <td className="py-2.5 px-3">{partLabel(r.part)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    {money(r.totalPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right">{money(r.depositAmount)}</td>
                  <td className="py-2.5 px-3 text-right">{money(r.remainingAmount)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 h-6 text-[10px] font-semibold ${badgeClass(
                        r.status
                      )}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <a
                      href={`/api/invoices/${r.id}`}
                      target="_blank"
                      className="inline-flex items-center rounded-full border border-black/15 px-2.5 h-7 text-[10px] hover:bg-black/5"
                    >
                      PDF
                    </a>
                  </td>
                  <td className="py-2.5 px-3">
                    <a
                      href={`/api/invoices/final/${r.id}`}
                      target="_blank"
                      className={`inline-flex items-center rounded-full border border-black/15 px-2.5 h-7 text-[10px] hover:bg-black/5 ${
                        r.status !== "completed"
                          ? "pointer-events-none opacity-40"
                          : ""
                      }`}
                    >
                      PDF
                    </a>
                  </td>
                  <td className="py-2.5 px-3 min-w-[120px]">
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
                        className="border border-black/20 rounded-md h-7 px-2 text-[11px] bg-white w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={r.status !== "completed"}
                        className="h-7 px-2 rounded-md bg-blue-600 text-white text-[10px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <td className="py-2.5 px-3 min-w-[160px]">
                    <form action={updateReservationStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <select
                        name="status"
                        defaultValue={r.status}
                        className="border border-black/20 rounded-md h-7 px-2 text-[11px] bg-white"
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
                        className="h-7 px-3 rounded-md bg-[color:var(--primary)] text-white text-[11px] hover:opacity-90"
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

