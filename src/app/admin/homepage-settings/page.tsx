"use client";
import React, { useState, useEffect } from "react";

export default function AdminHomepageSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [whyChooseList, setWhyChooseList] = useState<string[]>([]);
  const [whyChooseImagePreview, setWhyChooseImagePreview] = useState<string | null>(null);
  const [mainSliderImagePreview, setMainSliderImagePreview] = useState<string | null>(null);
  const [mainSliderImagesPreview, setMainSliderImagesPreview] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [fileInputKeys, setFileInputKeys] = useState<number[]>([0]);
  const [savedImages, setSavedImages] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/homepage-settings");
      const s = await res.json();
      setSettings(s);
      // Précharger les images multiples existantes si présentes
      if (s?.mainSliderImageUrls) {
        try {
          const arr = JSON.parse(s.mainSliderImageUrls);
          if (Array.isArray(arr)) setMainSliderImagesPreview(arr);
        } catch {}
      }
      if (s?.whyChooseList && s.whyChooseList !== "") {
        try {
          setWhyChooseList(JSON.parse(s.whyChooseList));
        } catch {
          setWhyChooseList([]);
        }
      } else {
        setWhyChooseList([]);
      }
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
    }
    fetchSettings();
  }, []);

  if (!settings) return <div>Chargement…</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header admin stylisé */}
      <div className="flex items-center gap-4 mb-8">
        <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shadow border border-gray-300">
          <span className="text-lg">←</span> Retour
        </button>
        <div className="flex-1 text-center">
          <span className="inline-flex items-center gap-2 text-2xl font-bold text-blue-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="inline-block mr-1"><circle cx="12" cy="12" r="12" fill="#e3f0ff"/><path d="M8 12h8M12 8v8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/></svg>
            Modifier la page d'accueil
          </span>
        </div>
      </div>

  <form action="/api/admin/homepage-settings" method="POST" encType="multipart/form-data" className="space-y-10">
        {/* Image Pourquoi choisir BB Service */}
  <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow p-6 border border-blue-100">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Image de la section "Pourquoi choisir BB Service"</h2>
          <p className="text-sm text-black/60 mb-4">Ajoutez ou modifiez l’image affichée à droite de la carte. Vous pouvez déposer un fichier ou renseigner une URL.</p>
          {/* Champ URL supprimé, upload uniquement */}
          <div className="flex gap-6 items-center">
            <div className="flex-1">
              <span className="font-semibold">Upload d’image</span>
              <input
                type="file"
                name="whyChooseImageFile"
                accept="image/*"
                className="w-full mt-2 border rounded px-3 py-2 bg-gray-50 cursor-pointer"
                style={{padding: '1.5rem', border: '2px dashed #b3c2d6'}}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setWhyChooseImagePreview(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setWhyChooseImagePreview(null);
                  }
                }}
              />
              <span className="text-xs text-black/50 mt-2 block">Déposez une image ici ou cliquez pour sélectionner un fichier.</span>
            </div>
            {/* Prévisualisation de l’image locale ou enregistrée */}
            {(whyChooseImagePreview || settings?.whyChooseImageUrl) && (
              <div className="flex-shrink-0 w-32 h-32 flex items-center justify-center border rounded-xl bg-gray-50">
                <img src={whyChooseImagePreview || settings?.whyChooseImageUrl || ''} alt="Prévisualisation" className="object-cover w-full h-full rounded-xl" />
              </div>
            )}
          </div>
        </div>
        {/* Bloc Slider principal */}
  <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow p-6 border border-blue-100">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Slider principal</h2>
          <p className="text-sm text-black/60 mb-4">Modifiez le titre, le sous-titre et le texte sous le slider principal de la page d'accueil.</p>
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold">Titre slider principal</span>
              <input
                type="text"
                name="mainSliderTitle"
                defaultValue={settings?.mainSliderTitle ?? 'Explorez la Riviera en toute élégance'}
                placeholder="Explorez la Riviera en toute élégance"
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Sous-titre slider principal</span>
              <input
                type="text"
                name="mainSliderSubtitle"
                defaultValue={settings?.mainSliderSubtitle ?? 'Vivez une expérience unique en mer avec BB Yachts.'}
                placeholder="Vivez une expérience unique en mer avec BB Yachts."
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Texte sous le slider principal</span>
              <textarea
                name="mainSliderText"
                defaultValue={settings?.mainSliderText ?? 'Découvrez nos expériences et réservez votre aventure sur la Côte d’Azur.'}
                placeholder="Découvrez nos expériences et réservez votre aventure sur la Côte d’Azur."
                className="w-full mt-2 border rounded px-3 py-2"
                rows={3}
              />
            </label>
            {/* Images du slider (upload cumulatif + aperçu) */}
            <div className="mt-4">
              <div className="flex items-start gap-6 mt-2">
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-black/70 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
                    Astuce: vous pouvez ajouter des images en plusieurs fois. Elles s’ajouteront à la liste existante, rien n’est remplacé.
                    <br />Note: cliquez sur “Enregistrer” en bas du formulaire pour téléverser les nouvelles images.
                  </div>
                  {/* Liste d'inputs fichiers cumulables */}
                  <div className="space-y-2">
                    {fileInputKeys.map((key, idx) => (
                      <div key={key} className="border-2 border-dashed border-blue-200 rounded p-3 bg-gray-50">
                        <label className="block font-semibold text-sm text-blue-700 mb-1">
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
                            // On ajoute les previews (cumul)
                            setMainSliderImagesPreview(prev => [...prev, ...previews]);
                            if (ignored > 0) {
                              alert(`${ignored} fichier(s) ignoré(s) car non-image.`);
                            }
                            // Si c'est le dernier input, on en ajoute un nouveau vide pour permettre d'autres sélections
                            if (idx === fileInputKeys.length - 1) {
                              setFileInputKeys(prev => [...prev, prev[prev.length - 1] + 1]);
                            }
                          }}
                        />
                        <p className="text-xs text-black/50 mt-1">Vous pouvez refaire une sélection pour ajouter d’autres images.</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Colonne de droite: images enregistrées + prévisualisations */}
                <div className="flex flex-col gap-4 min-w-[16rem]">
                  <div>
                    <div className="text-xs font-semibold text-black/70 mb-2">Images enregistrées</div>
                    <div className="grid grid-cols-3 gap-3">
                      {savedImages.length === 0 && (
                        <div className="text-xs text-black/50 col-span-3">Aucune image enregistrée pour le moment.</div>
                      )}
                      {savedImages.map((src, i) => (
                        <div
                          key={`saved-${i}`}
                          className="relative w-32 h-32 border rounded-xl overflow-hidden bg-gray-50 group"
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
                                } else {
                                  alert(json.error || 'Suppression échouée');
                                }
                              } catch (e) {
                                alert('Erreur réseau');
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
                      <div className="text-xs font-semibold text-black/70 mb-2">Prévisualisations (non encore enregistrées)</div>
                      <div className="grid grid-cols-3 gap-3">
                        {mainSliderImagesPreview.map((src, i) => (
                          <div key={`local-${i}`} className="relative w-32 h-32 border rounded-xl overflow-hidden bg-gray-50 group">
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
                      <div className="text-[11px] text-black/50 mt-1">Ces images seront ajoutées quand vous cliquerez sur “Enregistrer”.</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-black/50 mt-3 space-y-1">
                <div>Ordre d’affichage: les nouvelles images seront ajoutées à la fin de la liste existante.</div>
                <div>Astuce: utilisez la poignée ≡ pour glisser-déposer les vignettes et réordonner.</div>
              </div>
              {orderDirty && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow"
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
                        } else {
                          alert(json.error || 'Enregistrement échoué');
                        }
                      } catch {
                        alert('Erreur réseau');
                      }
                    }}
                  >
                    Enregistrer l’ordre
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloc Qui sommes-nous */}
  <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow p-6 border border-blue-100">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Section "Qui sommes-nous"</h2>
          <p className="text-sm text-black/60 mb-4">Modifiez le titre, le sous-titre et le texte de la section "Qui sommes-nous" affichée en bas de la page d'accueil.</p>
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold">Titre "Qui sommes-nous"</span>
              <input
                type="text"
                name="aboutUsTitle"
                defaultValue={settings?.aboutUsTitle ?? 'Qui sommes-nous'}
                placeholder="Qui sommes-nous"
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Sous-titre "Qui sommes-nous"</span>
              <input
                type="text"
                name="aboutUsSubtitle"
                defaultValue={settings?.aboutUsSubtitle ?? "Une équipe passionnée dédiée à créer des moments d'exception en Méditerranée."}
                placeholder="Une équipe passionnée dédiée à créer des moments d'exception en Méditerranée."
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Texte "Qui sommes-nous"</span>
              <textarea
                name="aboutUsText"
                defaultValue={settings?.aboutUsText ?? "Fondée par des amoureux de la mer, BB YACHTS sélectionne des bateaux performants et des expériences authentiques. Notre mission : transformer chaque sortie en mer en souvenir mémorable – sécurité, confort, service attentif & émotions garanties."}
                placeholder="Fondée par des amoureux de la mer, BB YACHTS sélectionne des bateaux performants et des expériences authentiques. Notre mission : transformer chaque sortie en mer en souvenir mémorable – sécurité, confort, service attentif & émotions garanties."
                className="w-full mt-2 border rounded px-3 py-2"
                rows={4}
              />
            </label>
          </div>
        </div>

        {/* Bloc Liens réseaux sociaux du footer */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow p-6 border border-blue-100">
          <h2 className="text-lg font-bold mb-2 text-blue-700">Liens réseaux sociaux du footer</h2>
          <p className="text-sm text-black/60 mb-4">Modifiez les liens affichés dans le footer pour Instagram, Facebook et X.</p>
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold">Lien Instagram</span>
              <input
                type="url"
                name="footerInstagram"
                defaultValue={settings?.footerInstagram ?? ''}
                placeholder="https://instagram.com/votrepage"
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Lien Facebook</span>
              <input
                type="url"
                name="footerFacebook"
                defaultValue={settings?.footerFacebook ?? ''}
                placeholder="https://facebook.com/votrepage"
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-semibold">Lien X (Twitter)</span>
              <input
                type="url"
                name="footerX"
                defaultValue={settings?.footerX ?? ''}
                placeholder="https://x.com/votrepage"
                className="w-full mt-2 border rounded px-3 py-2"
              />
            </label>
          </div>
        </div>

        {/* Bloc Pourquoi choisir BB Service */}
  {/* Bloc "Pourquoi choisir BB Service" retiré */}

        <div className="sticky bottom-0 left-0 w-full flex justify-end pt-6 pb-2 bg-gradient-to-t from-white via-white/80 to-transparent">
          <button type="submit" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg text-lg transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="inline-block mr-1"><circle cx="12" cy="12" r="12" fill="#2563eb"/><path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
