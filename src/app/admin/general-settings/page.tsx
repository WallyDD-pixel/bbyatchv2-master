"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminGeneralSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/general-settings");
      const s = await res.json();
      setSettings(s);
      if (s?.logoUrl) setLogoPreview(s.logoUrl);
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/admin/general-settings", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.push("/admin/general-settings?success=1");
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shadow border border-gray-300"
          >
            <span>←</span> Retour
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Paramètres généraux</h1>
          <p className="text-sm text-black/60">
            Gérez le logo du site et le prix par défaut du skipper.
          </p>
        </div>

        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === '1' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Paramètres sauvegardés avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Logo du site</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Uploader un nouveau logo</span>
                <input
                  type="file"
                  name="logoFile"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setLogoPreview(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-black/50 mt-1">
                  Formats acceptés: PNG, JPG, SVG (recommandé: PNG avec fond transparent)
                </p>
              </label>
              {(logoPreview || settings?.logoUrl) && (
                <div className="mt-4">
                  <span className="font-medium text-sm mb-2 block">Aperçu du logo</span>
                  <div className="inline-block p-4 bg-white border border-black/10 rounded-lg">
                    <img
                      src={logoPreview || settings?.logoUrl || ''}
                      alt="Logo"
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                </div>
              )}
              {settings?.logoUrl && (
                <input type="hidden" name="logoUrl" value={settings.logoUrl} />
              )}
            </div>
          </div>

          {/* Prix du skipper par défaut */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Prix du skipper par défaut</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="font-medium text-sm mb-1 block">Prix par défaut (€/jour)</span>
                <input
                  type="number"
                  name="defaultSkipperPrice"
                  defaultValue={settings?.defaultSkipperPrice ?? 350}
                  placeholder="350"
                  min="0"
                  step="1"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-black/50 mt-1">
                  Ce prix sera utilisé par défaut pour tous les bateaux nécessitant un skipper, sauf si un prix spécifique est défini pour un bateau.
                </p>
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

