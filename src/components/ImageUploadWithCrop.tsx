"use client";
import { useState, useRef, useEffect } from "react";
import ImageCropper from "./ImageCropper";
import { compressImageClient } from "@/lib/image-compression-client";

interface ImageUploadWithCropProps {
  name: string; // Nom du champ dans le formulaire
  existingImageUrl?: string | null;
  locale?: "fr" | "en";
  aspectRatio?: number; // Ratio pour le recadrage (1 = carré, 16/9, 4/3, etc.)
  maxSizeMB?: number; // Taille maximale acceptée
  onFileChange?: (file: File | null) => void; // Callback optionnel
  className?: string;
  label?: string;
  showPreview?: boolean;
}

export default function ImageUploadWithCrop({
  name,
  existingImageUrl,
  locale = "fr",
  aspectRatio,
  maxSizeMB = 20,
  onFileChange,
  className = "",
  label,
  showPreview = true,
}: ImageUploadWithCropProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingImageUrl) {
      setPreviewUrl(existingImageUrl);
    }
  }, [existingImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(
        locale === "fr"
          ? `Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: ${maxSizeMB}MB.`
          : `Image too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Limit: ${maxSizeMB}MB.`
      );
      e.target.value = "";
      return;
    }

    // Créer une URL de prévisualisation
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Proposer le recadrage si un ratio est spécifié
    if (aspectRatio) {
      setCroppingImage(url);
    } else {
      // Sinon, utiliser directement le fichier (avec compression si nécessaire)
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    try {
      // Compresser si > 2MB
      let finalFile = file;
      if (file.size > 2 * 1024 * 1024) {
        finalFile = await compressImageClient(file, {
          maxSizeMB: 2,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
      }

      // Mettre à jour le fichier dans l'input
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(finalFile);
        fileInputRef.current.files = dataTransfer.files;
      }

      // Mettre à jour la prévisualisation
      const newUrl = URL.createObjectURL(finalFile);
      setPreviewUrl((prev) => {
        if (prev && prev !== existingImageUrl) {
          URL.revokeObjectURL(prev);
        }
        return newUrl;
      });

      if (onFileChange) {
        onFileChange(finalFile);
      }
    } catch (error) {
      console.error("Erreur lors du traitement de l'image:", error);
      alert(locale === "fr" ? "Erreur lors du traitement de l'image" : "Error processing image");
    } finally {
      setUploading(false);
    }
  };

  const handleCrop = async (croppedFile: File) => {
    setCroppingImage(null);
    await processFile(croppedFile);
  };

  const handleRemove = () => {
    setPreviewUrl((prev) => {
      if (prev && prev !== existingImageUrl) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onFileChange) {
      onFileChange(null);
    }
  };

  return (
    <>
      {croppingImage && (
        <ImageCropper
          imageUrl={croppingImage}
          aspectRatio={aspectRatio ?? 16/9}
          locale={locale}
          onCrop={handleCrop}
          onCancel={() => {
            setCroppingImage(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            setPreviewUrl(existingImageUrl || null);
          }}
        />
      )}

      <div className={`grid gap-2 text-sm ${className}`}>
        {label && <span>{label}</span>}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            name={name}
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <input ref={hiddenFileRef} type="hidden" name={`${name}Url`} value={existingImageUrl || ""} />

          {showPreview && previewUrl ? (
            <div className="relative rounded-lg border border-black/10 overflow-hidden bg-black/5">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) {
                      setCroppingImage(previewUrl);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {locale === "fr" ? "Recadrer" : "Crop"}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/80 text-black text-xs rounded hover:bg-white"
                >
                  {locale === "fr" ? "Changer" : "Change"}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  {locale === "fr" ? "Supprimer" : "Remove"}
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-48 rounded-lg border-2 border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                className="mb-2 text-black/40"
              >
                <path
                  fill="currentColor"
                  d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z"
                />
              </svg>
              <span>
                {locale === "fr"
                  ? existingImageUrl
                    ? "Cliquer pour changer l'image"
                    : "Cliquer pour choisir une image"
                  : existingImageUrl
                  ? "Click to change image"
                  : "Click to choose image"}
              </span>
              <span className="mt-1 text-[11px] text-black/40">
                {locale === "fr"
                  ? `PNG/JPG, max ${maxSizeMB}MB`
                  : `PNG/JPG, max ${maxSizeMB}MB`}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
