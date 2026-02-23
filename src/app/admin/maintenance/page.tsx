"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams?.get("lang") === "en" ? "en" : "fr";
  const [purgingAvailability, setPurgingAvailability] = useState(false);
  const [purgingReservations, setPurgingReservations] = useState(false);

  const t = {
    fr: {
      title: "Maintenance",
      subtitle: "Actions de purge (irréversibles). À utiliser avec précaution.",
      purgeAvailability: "Purger les disponibilités",
      purgeAvailabilityHelp: "Supprime tous les créneaux de disponibilité (bateaux et expériences). Les bateaux et expériences ne sont pas supprimés.",
      purgeReservations: "Purger les réservations",
      purgeReservationsHelp: "Supprime toutes les réservations et toutes les demandes agence.",
      confirmAvailability: "Êtes-vous sûr de vouloir supprimer TOUS les créneaux de disponibilité ? Cette action est irréversible.",
      confirmReservations: "Êtes-vous sûr de vouloir supprimer TOUTES les réservations et TOUTES les demandes agence ? Cette action est irréversible.",
      purging: "Purge en cours…",
      success: "Purge effectuée.",
      error: "Erreur lors de la purge.",
      back: "Retour",
    },
    en: {
      title: "Maintenance",
      subtitle: "Purge actions (irreversible). Use with caution.",
      purgeAvailability: "Purge availability",
      purgeAvailabilityHelp: "Deletes all availability slots (boats and experiences). Boats and experiences are not deleted.",
      purgeReservations: "Purge reservations",
      purgeReservationsHelp: "Deletes all reservations and all agency requests.",
      confirmAvailability: "Are you sure you want to delete ALL availability slots? This action cannot be undone.",
      confirmReservations: "Are you sure you want to delete ALL reservations and ALL agency requests? This action cannot be undone.",
      purging: "Purging…",
      success: "Purge completed.",
      error: "Purge failed.",
      back: "Back",
    },
  }[locale];

  const handlePurgeAvailability = async () => {
    if (!confirm(t.confirmAvailability)) return;
    setPurgingAvailability(true);
    try {
      const res = await fetch("/api/admin/purge/availability", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = locale === "fr"
          ? `${t.success} ${data.deletedSlots ?? 0} créneaux bateaux, ${data.deletedExperienceSlots ?? 0} créneaux expériences.`
          : `${t.success} ${data.deletedSlots ?? 0} boat slots, ${data.deletedExperienceSlots ?? 0} experience slots.`;
        alert(msg);
        router.refresh();
      } else {
        alert(`${t.error} ${data.details || data.error || ""}`);
      }
    } catch (e: any) {
      alert(`${t.error} ${e?.message || ""}`);
    } finally {
      setPurgingAvailability(false);
    }
  };

  const handlePurgeReservations = async () => {
    if (!confirm(t.confirmReservations)) return;
    setPurgingReservations(true);
    try {
      const res = await fetch("/api/admin/purge/reservations", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = locale === "fr"
          ? `${t.success} ${data.deleted ?? 0} réservations et ${data.deletedAgencyRequests ?? 0} demandes agence supprimées.`
          : `${t.success} ${data.deleted ?? 0} reservations and ${data.deletedAgencyRequests ?? 0} agency requests deleted.`;
        alert(msg);
        router.refresh();
      } else {
        alert(`${t.error} ${data.details || data.error || ""}`);
      }
    } catch (e: any) {
      alert(`${t.error} ${e?.message || ""}`);
    } finally {
      setPurgingReservations(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin"
          className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5"
        >
          ← {t.back}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">{t.title}</h1>
      <p className="text-sm text-black/60 mb-8">{t.subtitle}</p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">{t.purgeAvailability}</h2>
          <p className="text-sm text-black/70 mb-4">{t.purgeAvailabilityHelp}</p>
          <button
            type="button"
            onClick={handlePurgeAvailability}
            disabled={purgingAvailability}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purgingAvailability ? t.purging : t.purgeAvailability}
          </button>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">{t.purgeReservations}</h2>
          <p className="text-sm text-black/70 mb-4">{t.purgeReservationsHelp}</p>
          <button
            type="button"
            onClick={handlePurgeReservations}
            disabled={purgingReservations}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purgingReservations ? t.purging : t.purgeReservations}
          </button>
        </section>
      </div>
    </div>
  );
}
