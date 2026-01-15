"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GalleryFormClient({ locale }: { locale: "fr" | "en" }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Utiliser XMLHttpRequest pour mieux gérer les redirections
      const xhr = new XMLHttpRequest();
      
      return new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 400) {
            // Succès - rediriger vers la page de galerie
            window.location.href = "/admin/gallery?created=1";
            resolve();
          } else if (xhr.status >= 300 && xhr.status < 400) {
            // Redirection
            const location = xhr.getResponseHeader('location');
            if (location) {
              window.location.href = location;
            } else {
              window.location.href = "/admin/gallery?created=1";
            }
            resolve();
          } else {
            // Erreur
            let error: any = { error: "unknown_error" };
            try {
              const contentType = xhr.getResponseHeader('content-type');
              if (contentType && contentType.includes('application/json')) {
                error = JSON.parse(xhr.responseText);
              } else {
                error = { error: "server_error", details: xhr.responseText || `HTTP ${xhr.status}` };
              }
            } catch (e) {
              error = { error: "unknown_error", details: `HTTP ${xhr.status}` };
            }
            
            console.error('Upload error:', error);
            alert(
              locale === "fr"
                ? `Erreur lors de l'enregistrement: ${error.error || error.details || "Erreur inconnue"}`
                : `Error saving: ${error.error || error.details || "Unknown error"}`
            );
            setUploading(false);
            reject(error);
          }
        };

        xhr.onerror = () => {
          console.error('Network error during upload, status:', xhr.status);
          // Si status est 0, la requête a été interrompue (peut-être par une redirection)
          if (xhr.status === 0) {
            // Attendre un peu pour voir si une redirection se produit
            setTimeout(() => {
              if (window.location.pathname !== '/admin/gallery/new') {
                // La redirection a fonctionné, ne pas afficher d'erreur
                return;
              }
              alert(
                locale === "fr"
                  ? "La requête a été interrompue. Vérifiez votre connexion."
                  : "Request was interrupted. Check your connection."
              );
              setUploading(false);
            }, 500);
          } else {
            alert(
              locale === "fr"
                ? "Erreur réseau lors de l'enregistrement"
                : "Network error during save"
            );
            setUploading(false);
          }
          reject(new Error('Network error'));
        };

        xhr.ontimeout = () => {
          console.error('Upload timeout');
          alert(
            locale === "fr"
              ? "Timeout lors de l'enregistrement"
              : "Timeout during save"
          );
          setUploading(false);
          reject(new Error('Timeout'));
        };

        xhr.onabort = () => {
          console.log('Upload aborted');
          setUploading(false);
        };

        xhr.open("POST", "/api/admin/gallery");
        xhr.timeout = 120000; // 120 secondes pour les gros fichiers
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error:", error);
      alert(
        locale === "fr"
          ? "Erreur lors de l'enregistrement"
          : "Error saving"
      );
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" encType="multipart/form-data">
      <label className="grid gap-1 text-sm">
        <span>{locale === "fr" ? "Titre (FR)" : "Title (FR)"}</span>
        <input name="titleFr" className="h-11 rounded-lg border border-black/15 px-3" placeholder={locale === "fr" ? "Titre optionnel" : "Optional title"} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{locale === "fr" ? "Titre (EN)" : "Title (EN)"}</span>
        <input name="titleEn" className="h-11 rounded-lg border border-black/15 px-3" placeholder={locale === "fr" ? "Optional title" : "Optional title"} />
      </label>
      <div className="border-t border-black/10 pt-4 mt-2">
        <h3 className="text-sm font-semibold mb-3">{locale === "fr" ? "Média (Image ou Vidéo)" : "Media (Image or Video)"}</h3>
        <div className="grid gap-2 text-sm">
          <span>{locale === "fr" ? "Image (recommandé)" : "Image (recommended)"}</span>
          <input type="hidden" name="imageUrl" value="" />
          <div className="relative h-48 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition">
            <input
              id="fileInput"
              name="imageFile"
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            {!previewUrl && (
              <div className="pointer-events-none flex flex-col items-center px-4 text-center">
                <svg width="30" height="30" viewBox="0 0 24 24" className="mb-2 text-black/40">
                  <path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z"/>
                </svg>
                <span>{locale === "fr" ? "Glisser-déposer ou cliquer pour choisir" : "Drag & drop or click to choose"}</span>
                <span className="mt-1 text-[11px] text-black/40">{locale === "fr" ? "PNG/JPG, max ~5MB" : "PNG/JPG, max ~5MB"}</span>
              </div>
            )}
            {previewUrl && (
              <>
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                <div
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-medium shadow border border-black/10 cursor-pointer z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    clearPreview();
                  }}
                >
                  ×
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <span>{locale === "fr" ? "OU Vidéo (URL YouTube/Vimeo)" : "OR Video (YouTube/Vimeo URL)"}</span>
          <input 
            name="videoUrl" 
            type="url" 
            className="h-11 rounded-lg border border-black/15 px-3" 
            placeholder={locale === "fr" ? "https://youtube.com/... ou https://vimeo.com/..." : "https://youtube.com/... or https://vimeo.com/..."}
          />
          <p className="text-xs text-black/50 mt-1">
            {locale === "fr" 
              ? "Si vous ajoutez une vidéo, l'image n'est pas obligatoire (mais recommandée pour la miniature)"
              : "If you add a video, image is not required (but recommended for thumbnail)"}
          </p>
        </div>
      </div>
      <div className="border-t border-black/10 pt-4 mt-2">
        <h3 className="text-sm font-semibold mb-3">{locale === "fr" ? "Texte détaillé (optionnel)" : "Detailed text (optional)"}</h3>
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Description (FR)" : "Description (FR)"}</span>
          <textarea name="contentFr" rows={4} className="rounded-lg border border-black/15 px-3 py-2" placeholder={locale === "fr" ? "Texte détaillé affiché sous l'image/vidéo..." : "Detailed text displayed below image/video..."} />
        </label>
        <label className="grid gap-1 text-sm mt-3">
          <span>{locale === "fr" ? "Description (EN)" : "Description (EN)"}</span>
          <textarea name="contentEn" rows={4} className="rounded-lg border border-black/15 px-3 py-2" placeholder={locale === "fr" ? "Detailed text displayed below image/video..." : "Detailed text displayed below image/video..."} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{locale === "fr" ? "Ordre d'affichage" : "Display order"}</span>
        <input name="sort" type="number" defaultValue="0" className="h-11 rounded-lg border border-black/15 px-3" />
        <p className="text-xs text-black/50 mt-1">{locale === "fr" ? "Plus petit = affiché en premier" : "Lower = displayed first"}</p>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Link href="/admin/gallery" className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5 inline-flex items-center">
          {locale === "fr" ? "Annuler" : "Cancel"}
        </Link>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow"
          style={{ backgroundColor: uploading ? '#60a5fa' : '#2563eb' }}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {locale === "fr" ? "Enregistrement..." : "Saving..."}
            </>
          ) : (
            locale === "fr" ? "Créer" : "Create"
          )}
        </button>
      </div>
    </form>
  );
}
