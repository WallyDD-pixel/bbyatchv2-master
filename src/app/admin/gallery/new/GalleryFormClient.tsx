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

      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Utiliser window.location pour éviter les problèmes de redirection Next.js
        window.location.href = "/admin/gallery?created=1";
      } else {
        const error = await response.json().catch(() => ({ error: "unknown_error" }));
        alert(
          locale === "fr"
            ? `Erreur lors de l'enregistrement: ${error.error || "Erreur inconnue"}`
            : `Error saving: ${error.error || "Unknown error"}`
        );
        setUploading(false);
      }
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
      <div className="grid gap-2 text-sm">
        <span>{locale === "fr" ? "Image *" : "Image *"}</span>
        <input type="hidden" name="imageUrl" value="" />
        <div className="relative h-48 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition">
          <input
            id="fileInput"
            name="imageFile"
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            required
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
      <div className="flex justify-end gap-2 pt-2">
        <Link href="/admin/gallery" className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5 inline-flex items-center">
          {locale === "fr" ? "Annuler" : "Cancel"}
        </Link>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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

