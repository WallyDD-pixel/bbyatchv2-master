"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminUsedSaleSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/used-sale-settings");
      const s = await res.json();
      setSettings(s);
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/used-sale-settings", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.push("/admin/used-sale-settings?success=1");
        router.refresh();
      } else {
        alert("Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;

  const success = searchParams?.get('success') === '1';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Paramètres - Bateaux d'occasion</h1>
          <p className="text-sm text-black/60">
            Modifiez le titre et le texte de la landing page des bateaux d'occasion.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Paramètres sauvegardés avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Titre et texte FR */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Contenu en français</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Titre</span>
                <input
                  type="text"
                  name="usedSaleTitleFr"
                  defaultValue={settings?.usedSaleTitleFr ?? "Bateaux d'occasion"}
                  placeholder="Bateaux d'occasion"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Texte descriptif</span>
                <textarea
                  name="usedSaleTextFr"
                  defaultValue={settings?.usedSaleTextFr ?? "Notre sélection de bateaux d'occasion immédiatement disponibles. Contactez-nous pour une visite ou plus d'informations."}
                  placeholder="Notre sélection de bateaux d'occasion immédiatement disponibles. Contactez-nous pour une visite ou plus d'informations."
                  rows={4}
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm resize-y"
                />
              </label>
            </div>
          </div>

          {/* Titre et texte EN */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Contenu en anglais</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Title</span>
                <input
                  type="text"
                  name="usedSaleTitleEn"
                  defaultValue={settings?.usedSaleTitleEn ?? "Pre-owned boats"}
                  placeholder="Pre-owned boats"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Description text</span>
                <textarea
                  name="usedSaleTextEn"
                  defaultValue={settings?.usedSaleTextEn ?? "Our curated selection of immediately available pre-owned yachts. Contact us for a viewing or more details."}
                  placeholder="Our curated selection of immediately available pre-owned yachts. Contact us for a viewing or more details."
                  rows={4}
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm resize-y"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-6 py-2.5 bg-black/5 text-black rounded-lg font-medium hover:bg-black/10 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

