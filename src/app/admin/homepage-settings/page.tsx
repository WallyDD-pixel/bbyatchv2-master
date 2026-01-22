"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { submitForm } from "@/lib/form-utils";
import AdminInstructions from "@/components/AdminInstructions";

export default function AdminHomepageSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [whyChooseImagePreview, setWhyChooseImagePreview] = useState<string | null>(null);
  const [mainSliderImagesPreview, setMainSliderImagesPreview] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [fileInputKeys, setFileInputKeys] = useState<number[]>([0]);
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Afficher un message de succès si présent dans l'URL
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    } else if (searchParams.get('error') === '1') {
      setToast({ message: "Erreur lors de la sauvegarde", type: "error" });
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/homepage-settings");
      const s = await res.json();
      setSettings(s);
      // Charger images enregistrées
      if (s?.mainSliderImageUrls) {
        try {
          const arr = JSON.parse(s.mainSliderImageUrls);
          if (Array.isArray(arr)) setSavedImages(arr);
        } catch {}
      } else if (s?.mainSliderImageUrl) {
        setSavedImages([s.mainSliderImageUrl]);
      } else {
        setSavedImages([]);
      }
      // Prévisualisation image "Pourquoi choisir"
      if (s?.whyChooseImageUrl) {
        setWhyChooseImagePreview(s.whyChooseImageUrl);
      }
    }
    fetchSettings();
  }, []);

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center text-gray-500">Chargement…</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    
    setSaving(true);
    setToast(null);
    
    const formData = new FormData(e.currentTarget);
    
    // Ajouter les fichiers d'images sélectionnés
    const fileInputs = e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]');
    fileInputs.forEach((input) => {
      if (input.files) {
        for (let i = 0; i < input.files.length; i++) {
          formData.append(input.name, input.files[i]);
        }
      }
    });
    
    const result = await submitForm(
      "/api/admin/homepage-settings",
      formData,
      {
        method: "POST",
        successMessage: "Paramètres sauvegardés avec succès",
        errorMessage: "Erreur lors de la sauvegarde",
      }
    );
    
    if (result.success) {
      setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
      // Recharger les settings pour mettre à jour les images
      const res = await fetch("/api/admin/homepage-settings");
      const s = await res.json();
      setSettings(s);
      // Réinitialiser les prévisualisations
      setMainSliderImagesPreview([]);
      setFileInputKeys([0]);
      // Recharger les images sauvegardées
      if (s?.mainSliderImageUrls) {
        try {
          const arr = JSON.parse(s.mainSliderImageUrls);
          if (Array.isArray(arr)) setSavedImages(arr);
        } catch {}
      }
      // Scroll vers le haut
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setToast({ message: result.error || "Erreur lors de la sauvegarde", type: "error" });
    }
    
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold shadow-sm border-2 border-gray-300 transition-colors"
        >
          <span className="text-lg">←</span> Retour
        </Link>
        <div className="flex-1 text-center">
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-blue-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="inline-block">
              <circle cx="12" cy="12" r="12" fill="#e3f0ff"/>
              <path d="M8 12h8M12 8v8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Modifier la page d'accueil
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Pourquoi choisir BB Service */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Image de la section "Pourquoi choisir BB Service"</h2>
          <p className="text-sm text-gray-600 mb-4">
            Ajoutez ou modifiez l'image affichée à droite de la carte. Vous pouvez déposer un fichier ou renseigner une URL.
          </p>
          <div className="flex gap-6 items-start">
            <div className="flex-1">
              <label className="block font-semibold text-sm text-gray-700 mb-2">Upload d'image</label>
              <input
                type="file"
                name="whyChooseImageFile"
                accept="image/*"
                className="w-full mt-2 border-2 border-dashed border-blue-300 rounded-lg px-4 py-3 bg-white cursor-pointer hover:border-blue-400 transition-colors"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setWhyChooseImagePreview(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setWhyChooseImagePreview(settings?.whyChooseImageUrl || null);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">Déposez une image ici ou cliquez pour sélectionner un fichier.</p>
            </div>
            {(whyChooseImagePreview || settings?.whyChooseImageUrl) && (
              <div className="flex-shrink-0 w-32 h-32 flex items-center justify-center border-2 border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                <img
                  src={whyChooseImagePreview || settings?.whyChooseImageUrl || ''}
                  alt="Prévisualisation"
                  className="object-cover w-full h-full rounded-xl"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bloc Slider principal */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Slider principal</h2>
          <p className="text-sm text-gray-600 mb-4">
            Modifiez le titre, le sous-titre et le texte sous le slider principal de la page d'accueil.
          </p>
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold text-gray-700">Titre slider principal</span>
              <input
                type="text"
                name="mainSliderTitle"
                defaultValue={settings?.mainSliderTitle ?? 'Explorez la Riviera en toute élégance'}
                placeholder="Explorez la Riviera en toute élégance"
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Sous-titre slider principal</span>
              <input
                type="text"
                name="mainSliderSubtitle"
                defaultValue={settings?.mainSliderSubtitle ?? 'Vivez une expérience unique en mer avec BB Yachts.'}
                placeholder="Vivez une expérience unique en mer avec BB Yachts."
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Texte sous le slider principal</span>
              <textarea
                name="mainSliderText"
                defaultValue={settings?.mainSliderText ?? "Découvrez nos expériences et réservez votre aventure sur la Côte d'Azur."}
                placeholder="Découvrez nos expériences et réservez votre aventure sur la Côte d'Azur."
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </label>

            {/* Images du slider */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-start gap-6">
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-gray-700 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
                    <strong>Astuce:</strong> vous pouvez ajouter des images en plusieurs fois. Elles s'ajouteront à la liste existante, rien n'est remplacé.
                    <br />
                    <strong>Note:</strong> cliquez sur "Enregistrer" en bas du formulaire pour téléverser les nouvelles images.
                  </div>
                  <div className="space-y-2">
                    {fileInputKeys.map((key, idx) => (
                      <div key={key} className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-white">
                        <label className="block font-semibold text-sm text-blue-700 mb-2">
                          {idx === fileInputKeys.length - 1 ? 'Ajouter des images' : `Sélection ${idx + 1}`}
                        </label>
                        <input
                          type="file"
                          name="mainSliderImagesFiles"
                          multiple
                          accept="image/*"
                          className="w-full cursor-pointer"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
                            const filtered = files.filter(f => allowed.includes(f.type) || f.type.startsWith('image/'));
                            const ignored = files.length - filtered.length;
                            const previews = await Promise.all(
                              filtered.map(f => new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = ev => resolve(ev.target?.result as string);
                                reader.readAsDataURL(f);
                              }))
                            );
                            setMainSliderImagesPreview(prev => [...prev, ...previews]);
                            if (ignored > 0) {
                              setToast({ message: `${ignored} fichier(s) ignoré(s) car non-image.`, type: "info" });
                            }
                            if (idx === fileInputKeys.length - 1) {
                              setFileInputKeys(prev => [...prev, prev[prev.length - 1] + 1]);
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">Vous pouvez refaire une sélection pour ajouter d'autres images.</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colonne de droite: images enregistrées + prévisualisations */}
                <div className="flex flex-col gap-4 min-w-[16rem]">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2">Images enregistrées</div>
                    <div className="grid grid-cols-3 gap-3">
                      {savedImages.length === 0 && (
                        <div className="text-xs text-gray-500 col-span-3">Aucune image enregistrée pour le moment.</div>
                      )}
                      {savedImages.map((src, i) => (
                        <div
                          key={`saved-${i}`}
                          className="relative w-32 h-32 border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50 group cursor-move"
                          draggable
                          onDragStart={() => setDragIndex(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex === null || dragIndex === i) return;
                            setSavedImages(prev => {
                              const next = [...prev];
                              const [moved] = next.splice(dragIndex, 1);
                              next.splice(i, 0, moved);
                              return next;
                            });
                            setOrderDirty(true);
                            setDragIndex(null);
                          }}
                        >
                          <img src={src} alt={`Image ${i+1}`} className="object-cover w-full h-full" />
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded cursor-grab select-none">≡</div>
                          <button
                            type="button"
                            title="Supprimer"
                            onClick={async () => {
                              if (!confirm('Supprimer cette image ?')) return;
                              setDeleting(src);
                              try {
                                const res = await fetch(`/api/admin/homepage-settings?url=${encodeURIComponent(src)}`, { method: 'DELETE', cache: 'no-store' });
                                const json = await res.json();
                                if (res.ok) {
                                  setSettings({ ...settings, mainSliderImageUrls: JSON.stringify(json.urls) });
                                  setSavedImages(json.urls || []);
                                  setToast({ message: "Image supprimée", type: "success" });
                                } else {
                                  setToast({ message: json.error || 'Suppression échouée', type: "error" });
                                }
                              } catch (e) {
                                setToast({ message: 'Erreur réseau', type: "error" });
                              } finally {
                                setDeleting(null);
                              }
                            }}
                            className="absolute top-1 right-1 z-10 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded shadow ring-1 ring-red-500/30"
                            disabled={deleting === src}
                          >
                            {deleting === src ? '...' : 'Suppr'}
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">{i+1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {mainSliderImagesPreview.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-2">Prévisualisations (non encore enregistrées)</div>
                      <div className="grid grid-cols-3 gap-3">
                        {mainSliderImagesPreview.map((src, i) => (
                          <div key={`local-${i}`} className="relative w-32 h-32 border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50">
                            <img src={src} alt={`Prévisualisation ${i+1}`} className="object-cover w-full h-full" />
                            <button
                              type="button"
                              title="Retirer cette prévisualisation"
                              onClick={() => setMainSliderImagesPreview(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 bg-gray-700 hover:bg-black text-white text-[11px] px-2 py-1 rounded shadow"
                            >
                              Retirer
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">{i+1}</div>
                          </div>
                        ))}
                      </div>
                      {mainSliderImagesPreview.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setMainSliderImagesPreview([])}
                            className="text-xs text-red-700 hover:text-red-800 underline"
                          >
                            Retirer toutes les prévisualisations
                          </button>
                        </div>
                      )}
                      <div className="text-[11px] text-gray-500 mt-1">Ces images seront ajoutées quand vous cliquerez sur "Enregistrer".</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3 space-y-1">
                <div>Ordre d'affichage: les nouvelles images seront ajoutées à la fin de la liste existante.</div>
                <div>Astuce: utilisez la poignée ≡ pour glisser-déposer les vignettes et réordonner.</div>
              </div>
              {orderDirty && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow transition-colors"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/homepage-settings', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ urls: savedImages }),
                          cache: 'no-store',
                        });
                        const json = await res.json();
                        if (res.ok) {
                          setSettings({ ...settings, mainSliderImageUrls: JSON.stringify(json.urls) });
                          setSavedImages(json.urls || []);
                          setOrderDirty(false);
                          setToast({ message: "Ordre enregistré", type: "success" });
                        } else {
                          setToast({ message: json.error || 'Enregistrement échoué', type: "error" });
                        }
                      } catch {
                        setToast({ message: 'Erreur réseau', type: "error" });
                      }
                    }}
                  >
                    Enregistrer l'ordre
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloc Qui sommes-nous */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Section "Qui sommes-nous"</h2>
          <p className="text-sm text-gray-600 mb-4">
            Modifiez le titre, le sous-titre et le texte de la section "Qui sommes-nous" affichée en bas de la page d'accueil.
          </p>
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold text-gray-700">Titre "Qui sommes-nous"</span>
              <input
                type="text"
                name="aboutUsTitle"
                defaultValue={settings?.aboutUsTitle ?? 'Qui sommes-nous'}
                placeholder="Qui sommes-nous"
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Sous-titre "Qui sommes-nous"</span>
              <input
                type="text"
                name="aboutUsSubtitle"
                defaultValue={settings?.aboutUsSubtitle ?? "Une équipe passionnée dédiée à créer des moments d'exception en Méditerranée."}
                placeholder="Une équipe passionnée dédiée à créer des moments d'exception en Méditerranée."
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Texte "Qui sommes-nous"</span>
              <textarea
                name="aboutUsText"
                defaultValue={settings?.aboutUsText ?? "Fondée par des amoureux de la mer, BB YACHTS sélectionne des bateaux performants et des expériences authentiques. Notre mission : transformer chaque sortie en mer en souvenir mémorable – sécurité, confort, service attentif & émotions garanties."}
                placeholder="Fondée par des amoureux de la mer, BB YACHTS sélectionne des bateaux performants et des expériences authentiques. Notre mission : transformer chaque sortie en mer en souvenir mémorable – sécurité, confort, service attentif & émotions garanties."
                className="w-full mt-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </label>
          </div>
        </div>

        {/* Bloc Liens réseaux sociaux du footer */}
        <div className="bg-gradient-to-br from-yellow-50 via-white to-yellow-100 rounded-xl shadow-md p-6 border border-yellow-200">
          <h2 className="text-lg font-bold mb-2 text-yellow-700">Liens réseaux sociaux du footer</h2>
          <p className="text-sm text-gray-600 mb-4">
            ⚠️ Les réseaux sociaux sont maintenant gérés dans la page dédiée.{" "}
            <Link href="/admin/social-media" className="text-blue-600 hover:underline font-semibold">
              Cliquez ici pour les modifier →
            </Link>
          </p>
        </div>

        {/* Bouton Enregistrer */}
        <div className="sticky bottom-0 left-0 w-full flex justify-end pt-6 pb-2 bg-gradient-to-t from-white via-white/80 to-transparent z-10">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold shadow-lg text-lg transition-colors"
            style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="inline-block">
                  <circle cx="12" cy="12" r="12" fill="#2563eb"/>
                  <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
