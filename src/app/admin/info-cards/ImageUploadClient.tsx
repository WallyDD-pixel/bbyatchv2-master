"use client";
import { useEffect, useRef, useState } from "react";
import ImageCropper from "@/components/ImageCropper";

interface ImageUploadClientProps {
  locale: "fr" | "en";
  existingImageUrl?: string | null;
}

export default function ImageUploadClient({ locale, existingImageUrl }: ImageUploadClientProps) {
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const removeBtnRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const hiddenImageUrlRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [hasImage, setHasImage] = useState(!!existingImageUrl);
  const [isNewImage, setIsNewImage] = useState(false);

  useEffect(() => {
    const dz = dropZoneRef.current;
    const fi = fileInputRef.current;

    if (!dz || !fi) return;

    function handleFileChange() {
      const file = fi?.files && fi.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev && prev !== existingImageUrl) {
            URL.revokeObjectURL(prev);
          }
          return url;
        });
        setHasImage(true);
        setIsNewImage(true);
        // Mettre à jour le champ caché pour vider l'image existante quand on upload une nouvelle
        if (hiddenImageUrlRef.current && existingImageUrl) {
          hiddenImageUrlRef.current.value = "";
        }
        if (placeholderRef.current) {
          placeholderRef.current.classList.add("opacity-0");
        }
      } else {
        // Si on supprime et qu'il y avait une image existante, on revient à l'image existante
        if (existingImageUrl && !isNewImage) {
          setPreviewUrl(existingImageUrl);
          setHasImage(true);
          setIsNewImage(false);
        } else {
          setPreviewUrl((prev) => {
            if (prev && prev !== existingImageUrl) {
              URL.revokeObjectURL(prev);
            }
            return null;
          });
          setHasImage(false);
          setIsNewImage(false);
        }
        if (placeholderRef.current) {
          placeholderRef.current.classList.remove("opacity-0");
        }
      }
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (dz) {
        dz.classList.add("ring", "ring-blue-500");
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (dz) {
        dz.classList.remove("ring", "ring-blue-500");
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (dz) {
        dz.classList.remove("ring", "ring-blue-500");
      }
      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        if (fi) {
          fi.files = dt.files;
          handleFileChange();
        }
      }
    }

    fi.addEventListener("change", handleFileChange);
    dz.addEventListener("dragover", handleDragOver);
    dz.addEventListener("dragleave", handleDragLeave);
    dz.addEventListener("drop", handleDrop);

    return () => {
      fi.removeEventListener("change", handleFileChange);
      dz.removeEventListener("dragover", handleDragOver);
      dz.removeEventListener("dragleave", handleDragLeave);
      dz.removeEventListener("drop", handleDrop);
    };
  }, [existingImageUrl, isNewImage]);

  // Nettoyer l'URL quand elle change ou quand le composant est démonté
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== existingImageUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, existingImageUrl]);

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewUrl((prev) => {
      if (prev && prev !== existingImageUrl) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setHasImage(false);
    setIsNewImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (placeholderRef.current) {
      placeholderRef.current.classList.remove("opacity-0");
    }
    // Mettre à jour le champ caché imageUrl pour indiquer qu'on veut supprimer l'image
    if (hiddenImageUrlRef.current) {
      hiddenImageUrlRef.current.value = "";
    }
  };

  const handleCrop = (croppedFile: File) => {
    setCroppingImage(null);
    // Mettre à jour le fichier dans l'input
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(croppedFile);
      fileInputRef.current.files = dataTransfer.files;
      // Déclencher l'événement change pour mettre à jour la prévisualisation
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };

  return (
    <>
      {croppingImage && (
        <ImageCropper
          imageUrl={croppingImage}
          aspectRatio={1}
          locale={locale}
          onCrop={handleCrop}
          onCancel={() => {
            setCroppingImage(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            setPreviewUrl(existingImageUrl || null);
            setHasImage(!!existingImageUrl);
            setIsNewImage(false);
          }}
        />
      )}
      <div className="grid gap-2 text-sm">
        <span>{locale === "fr" ? "Image" : "Image"}</span>
        <input ref={hiddenImageUrlRef} type="hidden" name="imageUrl" value={existingImageUrl || ""} />
      <div
        ref={dropZoneRef}
        className={`relative h-48 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition ${
          hasImage ? "has-image" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          id="fileInput"
          name="imageFile"
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          ref={placeholderRef}
          className="pointer-events-none flex flex-col items-center px-4 text-center transition-opacity"
        >
          <svg
            width="30"
            height="30"
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
                ? "Glisser-déposer ou cliquer pour changer"
                : "Glisser-déposer ou cliquer pour choisir"
              : existingImageUrl
              ? "Drag & drop or click to change"
              : "Drag & drop or click to choose"}
          </span>
          <span className="mt-1 text-[11px] text-black/40">
            {locale === "fr" ? "PNG/JPG, max ~5MB" : "PNG/JPG, max ~5MB"}
          </span>
          {existingImageUrl && (
            <span className="mt-2 text-[11px] text-black/50">
              {locale === "fr"
                ? "Image actuelle conservée si aucun fichier"
                : "Current image kept if no new file"}
            </span>
          )}
        </div>
        {previewUrl && (
          <>
            <img
              ref={previewImgRef}
              src={previewUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (previewUrl) {
                    setCroppingImage(previewUrl);
                  }
                }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                {locale === "fr" ? "Recadrer" : "Crop"}
              </button>
              <div
                ref={removeBtnRef}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 cursor-pointer"
                onClick={handleRemove}
              >
                {locale === "fr" ? "Supprimer" : "Remove"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
