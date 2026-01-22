"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type Boat = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
  pricePerDay?: number | null;
  priceAm?: number | null;
  pricePm?: number | null;
  available: boolean;
};

export function BoatsTableClient({
  boats,
  locale,
}: {
  boats: Boat[];
  locale: "fr" | "en";
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? boats.map((b) => b.id) : []);
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    const msg =
      locale === "fr"
        ? `Supprimer ${selectedIds.length} bateau(x) ?`
        : `Delete ${selectedIds.length} boat(s)?`;
    if (!confirm(msg)) return;

    startTransition(async () => {
      try {
        await Promise.all(
          selectedIds.map((id) =>
            fetch(`/api/admin/boats/${id}`, { method: "DELETE" }),
          ),
        );
        // Recharge pour refléter la nouvelle liste
        window.location.reload();
      } catch {
        alert(
          locale === "fr"
            ? "Erreur lors de la suppression des bateaux."
            : "Error while deleting boats.",
        );
      }
    });
  };

  const allSelected = boats.length > 0 && selectedIds.length === boats.length;

  return (
    <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-black/10 bg-white p-3 sm:p-5 shadow-sm overflow-x-auto -mx-3 sm:mx-0">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs text-black/60">
        <span className="text-[10px] sm:text-xs">
          {locale === "fr"
            ? `${boats.length} bateau(x) · ${selectedIds.length} sélectionné(s)`
            : `${boats.length} boat(s) · ${selectedIds.length} selected`}
        </span>
        <button
          type="button"
          disabled={!selectedIds.length || isPending}
          onClick={handleBulkDelete}
          className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-50 text-red-600 px-3 sm:px-4 h-7 sm:h-8 hover:bg-red-100 disabled:opacity-50 text-[10px] sm:text-xs transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {locale === "fr" ? "Supprimer la sélection" : "Delete selected"}
        </button>
      </div>
      <table className="min-w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-left text-black/70 bg-black/[0.035]">
            <th className="py-2 sm:py-2.5 px-2 sm:px-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden sm:table-cell">Slug</th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3">
              {locale === "fr" ? "Nom" : "Name"}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">
              {locale === "fr" ? "Ville" : "City"}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
              {locale === "fr" ? "Prix/jour" : "Price/day"}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
              {locale === "fr" ? "Matin" : "AM"}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
              {locale === "fr" ? "Après‑midi" : "PM"}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">
              {locale === "fr" ? "Dispo" : "Avail."}
            </th>
            <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right">
              {locale === "fr" ? "Actions" : "Actions"}
            </th>
          </tr>
        </thead>
        <tbody>
          {boats.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="text-center py-8 text-black/60 whitespace-nowrap"
              >
                {locale === "fr" ? "Aucun bateau." : "No boats."}
              </td>
            </tr>
          ) : (
            boats.map((b) => {
              const checked = selectedIds.includes(b.id);
              return (
                <tr key={b.id} className="border-t border-black/10 hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleOne(b.id, e.target.checked)}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-[10px] sm:text-[11px] text-black/60 hidden sm:table-cell">
                    {b.slug}
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 font-medium">{b.name}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">{b.city || "-"}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
                    {b.pricePerDay ? `${b.pricePerDay}€` : "-"}
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
                    {b.priceAm != null ? `${b.priceAm}€` : "-"}
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell">
                    {b.pricePm != null ? `${b.pricePm}€` : "-"}
                  </td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell">{b.available ? "✔" : "✖"}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                    <div className="flex justify-end gap-1.5 sm:gap-2">
                      <Link
                        href={`/admin/boats/${b.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white text-[10px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3 hover:bg-black/5 transition-colors whitespace-nowrap"
                      >
                        {locale === "fr" ? "Voir / Éditer" : "View / Edit"}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}


