"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminInstructions from "@/components/AdminInstructions";

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
      // Utiliser une URL relative pour éviter les problèmes SSL en local
      const apiUrl = "/api/admin/general-settings";
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        if (result.success) {
          // Utiliser window.location au lieu de router.push pour éviter les problèmes de protocole
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('success', '1');
          // Forcer HTTP en développement pour éviter les erreurs SSL
          if (currentUrl.protocol === 'https:' && currentUrl.hostname === 'localhost') {
            currentUrl.protocol = 'http:';
          }
          window.location.href = currentUrl.pathname + currentUrl.search;
        } else {
          alert(result?.error || "Erreur lors de la sauvegarde");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData?.error || errorData?.details || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      // Vérifier si c'est une erreur réseau/SSL
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert("Erreur de connexion. Vérifiez que vous utilisez http://localhost:3000 (et non https://)");
      } else {
        alert("Erreur lors de la sauvegarde");
      }
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Paramètres généraux</h1>
          <AdminInstructions
            locale="fr"
            title="Comment gérer les paramètres généraux"
            instructions={[
              {
                title: "Logo du site",
                description: "Téléchargez le logo qui apparaîtra dans la navigation et sur toutes les pages. Formats recommandés : PNG avec fond transparent."
              },
              {
                title: "Prix du skipper par défaut",
                description: "Définissez le prix par défaut du skipper qui sera utilisé pour tous les bateaux, sauf si un prix spécifique est défini pour un bateau particulier."
              },
              {
                title: "Jeux d'eau",
                description: "Configurez l'URL du catalogue des jeux d'eau. Cette URL sera affichée dans le formulaire de réservation lorsque les clients sélectionnent les jeux d'eau."
              },
              {
                title: "Sauvegarder",
                description: "N'oubliez pas de cliquer sur 'Enregistrer' après avoir modifié les paramètres pour qu'ils soient pris en compte."
              }
            ]}
          />
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
                      // Vérifier le type de fichier
                      if (!file.type.startsWith('image/')) {
                        alert('Veuillez sélectionner un fichier image');
                        e.target.value = ''; // Réinitialiser l'input
                        return;
                      }
                      
                      // Vérifier la taille (max 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        alert('Le fichier est trop volumineux (max 5MB)');
                        e.target.value = ''; // Réinitialiser l'input
                        return;
                      }
                      
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setLogoPreview(ev.target.result as string);
                        }
                      };
                      reader.onerror = () => {
                        alert('Erreur lors de la lecture du fichier');
                        e.target.value = ''; // Réinitialiser l'input
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setLogoPreview(null);
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

          {/* Lien des jeux d'eau */}
          <div className="bg-white rounded-xl border border-black/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">🏄‍♂️ Jeux d'eau</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="font-medium text-sm mb-1 block">URL du catalogue des jeux d'eau</span>
                <input
                  type="url"
                  name="waterToysUrl"
                  defaultValue={settings?.waterToysUrl ?? 'https://example.com/water-toys'}
                  placeholder="https://example.com/water-toys"
                  className="w-full mt-1 border border-black/15 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-black/50 mt-1">
                  Cette URL sera utilisée dans le formulaire de réservation quand les clients sélectionnent "Oui" pour les jeux d'eau. 
                  Elle doit pointer vers votre catalogue ou partenaire de jeux d'eau.
                </p>
              </label>
              {settings?.waterToysUrl && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 mb-2">
                    <strong>Aperçu :</strong> Voici comment le lien apparaît dans le formulaire de réservation :
                  </p>
                  <div className="text-xs text-gray-600 italic">
                    "Nous pouvons nous occuper de la réservation des jeux d'eau mais le prix ne sera pas calculé avec. 
                    Merci de nous indiquer dans le champ commentaire le/les jeux souhaités{' '}
                    <a 
                      href={settings.waterToysUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      (Lien)
                    </a>
                    "
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-black/10 mt-6">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-6 py-2.5 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
              style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

