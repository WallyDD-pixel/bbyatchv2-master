"use client";
import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";

interface BoatCreateFormProps {
  locale: "fr" | "en";
  children: React.ReactNode;
}

export default function BoatCreateForm({ locale, children }: BoatCreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = formRef.current;
    if (!form) {
      setError(locale === "fr" ? "Erreur: formulaire introuvable" : "Error: form not found");
      setSaving(false);
      return;
    }

    try {
      // Créer un FormData vide pour éviter les doublons
      // Les fichiers seront ajoutés manuellement pour un contrôle précis
      const formData = new FormData();

      // Ajouter tous les champs du formulaire (sauf les fichiers)
      const formEntries = new FormData(form);
      for (const [key, value] of formEntries.entries()) {
        // Ignorer les fichiers qui seront ajoutés manuellement
        if (key !== 'imageFiles' && key !== 'videoFiles' && !(value instanceof File)) {
          formData.append(key, value as string);
        }
      }

      // Récupérer et ajouter les fichiers d'images depuis l'input
      const imageFilesInput = form.querySelector<HTMLInputElement>('input[name="imageFiles"]');
      if (imageFilesInput?.files && imageFilesInput.files.length > 0) {
        Array.from(imageFilesInput.files).forEach((file) => {
          formData.append('imageFiles', file);
        });
      }

      // Récupérer et ajouter les fichiers vidéo
      const videoFilesInput = form.querySelector<HTMLInputElement>('input[name="videoFiles"]');
      if (videoFilesInput?.files && videoFilesInput.files.length > 0) {
        console.log(`📹 ${videoFilesInput.files.length} fichier(s) vidéo détecté(s)`);
        Array.from(videoFilesInput.files).forEach((file, index) => {
          console.log(`📹 Vidéo ${index + 1}:`, { name: file.name, type: file.type, size: file.size });
          formData.append('videoFiles', file);
        });
      } else {
        console.log('📹 Aucun fichier vidéo détecté');
      }

      // Récupérer les URLs de photos externes depuis le textarea
      const photoUrlsInput = form.querySelector<HTMLTextAreaElement>('textarea[name="photoUrls"]');
      if (photoUrlsInput?.value.trim()) {
        formData.set('photoUrls', photoUrlsInput.value.trim());
      }

      // Récupérer les options (BoatNewClient les gère)
      const optionLabels = form.querySelectorAll<HTMLInputElement>('input[name="optionLabel[]"]');
      const optionPrices = form.querySelectorAll<HTMLInputElement>('input[name="optionPrice[]"]');
      optionLabels.forEach((labelInput, index) => {
        const priceInput = optionPrices[index];
        if (labelInput.value.trim()) {
          formData.append('optionLabel[]', labelInput.value.trim());
          formData.append('optionPrice[]', priceInput?.value.trim() || "0");
        }
      });

      // Envoyer la requête avec headers pour indiquer que c'est une requête fetch
      const response = await fetch('/api/admin/boats', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      // Vérifier que la réponse est bien du JSON (pas une redirection)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue (redirection?):', contentType, response.status);
        throw new Error(locale === "fr" ? "Erreur: le serveur a retourné une redirection inattendue" : "Error: server returned unexpected redirect");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
        let errorMessage = errorData.error || errorData.message || 'Erreur lors de la création';
        
        // Messages d'erreur traduits
        if (errorMessage === 'missing_fields') {
          errorMessage = locale === "fr" ? "Champs manquants" : "Missing fields";
        } else if (errorMessage === 'slug_unique') {
          errorMessage = locale === "fr" ? "Ce slug existe déjà" : "This slug already exists";
        } else if (errorMessage === 'image_upload_failed') {
          errorMessage = locale === "fr" ? "Erreur lors de l'upload des images" : "Error uploading images";
        } else if (errorMessage === 'server_error') {
          errorMessage = locale === "fr" ? "Erreur serveur" : "Server error";
        }
        
        throw new Error(errorMessage);
      }

      // Parser le JSON de réponse
      const data = await response.json();
      console.log('✅ Bateau créé avec succès:', { id: data.id, slug: data.slug, videos: data.videoUrls, photos: data.photoUrls });
      
      // Rediriger vers la page d'édition du bateau créé
      if (data.id || data.slug) {
        const boatId = data.id || data.slug;
        router.push(`/admin/boats/${boatId}?lang=${locale}`);
        router.refresh();
      } else {
        // Si pas d'ID, rediriger vers la liste et rafraîchir
        router.push(`/admin/boats?lang=${locale}`);
        router.refresh();
      }
    } catch (err: any) {
      console.error('Erreur lors de la création du bateau:', err);
      const errorMsg = err?.message || (locale === "fr" ? "Erreur lors de la création du bateau" : "Error creating boat");
      setError(errorMsg);
      setSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm space-y-6"
    >
      {children}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push(`/admin/boats?lang=${locale}`)}
          className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5"
          disabled={saving}
        >
          {locale === "fr" ? "Annuler" : "Cancel"}
        </button>
        <button
          type="submit"
          className="rounded-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving
            ? locale === "fr"
              ? "Création en cours..."
              : "Creating..."
            : locale === "fr"
            ? "Créer"
            : "Create"}
        </button>
      </div>
    </form>
  );
}
