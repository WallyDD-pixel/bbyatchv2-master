"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import { submitForm } from "@/lib/form-utils";

export default function AdminAboutSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [fileInputKeys, setFileInputKeys] = useState<number[]>([0]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Afficher un message de succès si présent dans l'URL
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
      // Nettoyer l'URL après affichage du message
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/admin/about-settings");
      const s = await res.json();
      setSettings(s);
      // Charger les images existantes
      if (s?.aboutImageUrls) {
        try {
          const arr = JSON.parse(s.aboutImageUrls);
          if (Array.isArray(arr)) setImagePreviews(arr);
        } catch {}
      }
    }
    fetchSettings();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPreviews = [...imagePreviews];
      if (index >= newPreviews.length) {
        newPreviews.push(reader.result as string);
      } else {
        newPreviews[index] = reader.result as string;
      }
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const addImageSlot = () => {
    setImagePreviews([...imagePreviews, '']);
    setFileInputKeys([...fileInputKeys, Date.now()]);
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    const newKeys = fileInputKeys.filter((_, i) => i !== index);
    if (newKeys.length === 0) {
      setFileInputKeys([Date.now()]);
      setImagePreviews([]);
    } else {
      setFileInputKeys(newKeys);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Empêcher la double soumission
    if (saving) return;
    
    setSaving(true);
    setToast(null);
    
    const formData = new FormData(e.currentTarget);
    
    // Séparer les nouvelles images (data URLs) et les existantes
    const existingImages: string[] = [];
    imagePreviews.forEach((url) => {
      if (url && !url.startsWith('data:')) {
        existingImages.push(url);
      }
    });
    existingImages.forEach(url => formData.append('existingImages', url));
    
    // Ajouter les fichiers d'images
    const imageInputs = e.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]');
    imageInputs.forEach((input, i) => {
      if (input.files && input.files[0]) {
        formData.append('imageFiles', input.files[0]);
      }
    });

    const result = await submitForm("/api/admin/about-settings", formData, {
      successMessage: "Paramètres sauvegardés avec succès",
      errorMessage: "Erreur lors de la sauvegarde",
      redirectUrl: "/admin/about-settings?success=1",
    });

    if (result.success) {
      // Si redirection demandée
      if (result.data?.redirect) {
        // Attendre un peu pour que l'utilisateur voie le feedback
        setTimeout(() => {
          router.push(result.data.url);
          router.refresh();
        }, 500);
      } else {
        // Afficher le message de succès
        setToast({ message: "Paramètres sauvegardés avec succès", type: "success" });
        // Recharger les données après un court délai
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }
    } else {
      // Afficher l'erreur
      setToast({ 
        message: result.error || "Erreur lors de la sauvegarde", 
        type: "error" 
      });
    }
    
    setSaving(false);
  };

  if (!settings) return <div className="max-w-3xl mx-auto py-8">Chargement…</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Paramètres de la page "À propos"</h1>
        <p className="text-sm text-black/60 mt-1">Gérez le contenu de la page À propos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Histoire */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Histoire</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Histoire (FR) *</label>
              <textarea
                name="aboutHistoryFr"
                defaultValue={settings.aboutHistoryFr || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="L'histoire de BB YACHTS, BB CHARTER et BB SERVICES CHARTER..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Histoire (EN) *</label>
              <textarea
                name="aboutHistoryEn"
                defaultValue={settings.aboutHistoryEn || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="The story of BB YACHTS, BB CHARTER and BB SERVICES CHARTER..."
              />
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Mission</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mission (FR) *</label>
              <textarea
                name="aboutMissionFr"
                defaultValue={settings.aboutMissionFr || ''}
                required
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Notre mission..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mission (EN) *</label>
              <textarea
                name="aboutMissionEn"
                defaultValue={settings.aboutMissionEn || ''}
                required
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Our mission..."
              />
            </div>
          </div>
        </section>

        {/* Équipe */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Équipe et Expertise</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Équipe et Expertise (FR) *</label>
              <textarea
                name="aboutTeamFr"
                defaultValue={settings.aboutTeamFr || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Notre équipe et notre expertise locale..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Équipe et Expertise (EN) *</label>
              <textarea
                name="aboutTeamEn"
                defaultValue={settings.aboutTeamEn || ''}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                placeholder="Our team and local expertise..."
              />
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Nos Valeurs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sécurité */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Sécurité (FR) *</label>
              <textarea
                name="aboutValuesSafetyFr"
                defaultValue={settings.aboutValuesSafetyFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Sécurité (EN) *</label>
              <textarea
                name="aboutValuesSafetyEn"
                defaultValue={settings.aboutValuesSafetyEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Confort */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Confort (FR) *</label>
              <textarea
                name="aboutValuesComfortFr"
                defaultValue={settings.aboutValuesComfortFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Confort (EN) *</label>
              <textarea
                name="aboutValuesComfortEn"
                defaultValue={settings.aboutValuesComfortEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Authenticité */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Authenticité (FR) *</label>
              <textarea
                name="aboutValuesAuthFr"
                defaultValue={settings.aboutValuesAuthFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Authenticité (EN) *</label>
              <textarea
                name="aboutValuesAuthEn"
                defaultValue={settings.aboutValuesAuthEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {/* Plaisir */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Plaisir (FR) *</label>
              <textarea
                name="aboutValuesPleasureFr"
                defaultValue={settings.aboutValuesPleasureFr || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
              <label className="block text-sm font-medium">Plaisir (EN) *</label>
              <textarea
                name="aboutValuesPleasureEn"
                defaultValue={settings.aboutValuesPleasureEn || ''}
                required
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>
        </section>

        {/* Galerie d'images */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Galerie d'images</h2>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {imagePreviews.length > 0 ? (
                imagePreviews.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="relative h-32 rounded-lg overflow-hidden border border-black/10 bg-black/5">
                      {url ? (
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/30 text-xs">Aucune image</div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      key={fileInputKeys[index] || index}
                      type="file"
                      name="imageFiles"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="mt-2 w-full text-xs"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-sm text-black/50 py-8">
                  Aucune image. Cliquez sur "Ajouter une image" pour commencer.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={addImageSlot}
              className="px-4 h-10 rounded-lg border border-black/15 bg-white hover:bg-black/5 text-sm font-medium"
            >
              + Ajouter une image
            </button>
          </div>
        </section>

        {/* Boutons */}
        <div className="flex justify-end gap-4">
          <a
            href="/admin"
            className="px-6 h-11 rounded-full border border-black/15 bg-white hover:bg-black/5 text-sm font-medium inline-flex items-center justify-center"
          >
            Annuler
          </a>
          <button
            type="submit"
            disabled={saving}
            className="px-6 h-11 rounded-full bg-[color:var(--primary)] text-white font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

