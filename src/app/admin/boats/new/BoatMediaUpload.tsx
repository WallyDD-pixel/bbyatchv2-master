"use client";
import { useState, useRef } from "react";
import { compressImageClient } from "@/lib/image-compression-client";
import ImageCropper from "@/components/ImageCropper";

interface BoatMediaUploadProps {
  locale: "fr" | "en";
}

export default function BoatMediaUpload({ locale }: BoatMediaUploadProps) {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string>("");
  const [photoUrlPreviews, setPhotoUrlPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [croppingImage, setCroppingImage] = useState<{ url: string; index: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const imageFilesRef = useRef<HTMLInputElement>(null);
  const photoUrlsRef = useRef<HTMLTextAreaElement>(null);

  const parsePhotoUrls = (text: string): string[] => {
    if (!text) return [];
    const trimmed = text.trim();
    if (!trimmed) return [];
    
    // Si c'est un JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const arr = JSON.parse(trimmed);
        return Array.isArray(arr) ? arr.filter((u: any) => typeof u === 'string' && u.trim()) : [];
      } catch {
        return [];
      }
    }
    
    // Sinon, split par virgule
    return trimmed.split(',').map(u => u.trim()).filter(Boolean);
  };

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setImagePreviews([]);
      return;
    }

    // Accepter jusqu'à 20MB
    const maxAcceptedMB = 20;
    const maxAcceptedBytes = maxAcceptedMB * 1024 * 1024;
    const validFiles: File[] = [];

    // Filtrer les fichiers valides
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > maxAcceptedBytes) {
        console.warn(`⚠️ Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(2)}MB), limite: ${maxAcceptedMB}MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Pour le premier fichier, proposer le recadrage
    const firstFile = validFiles[0];
    const url = URL.createObjectURL(firstFile);
    setCroppingImage({ url, index: imagePreviews.length });
    setPendingFiles(validFiles.slice(1)); // Garder les autres fichiers en attente
  };

  const handleCropImage = async (croppedFile: File) => {
    if (!croppingImage) return;

    // Compresser si nécessaire
    let finalFile = croppedFile;
    const targetSizeMB = 2;
    if (croppedFile.size > targetSizeMB * 1024 * 1024) {
      try {
        finalFile = await compressImageClient(croppedFile, {
          maxSizeMB: targetSizeMB,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
      } catch (error) {
        console.error('Erreur compression:', error);
      }
    }

    // Ajouter à la prévisualisation
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        setImagePreviews(prev => [...prev, url]);
        
        // Mettre à jour l'input avec tous les fichiers
        if (imageFilesRef.current) {
          const dataTransfer = new DataTransfer();
          // Ajouter le fichier recadré
          dataTransfer.items.add(finalFile);
          // Ajouter les fichiers en attente
          pendingFiles.forEach(f => dataTransfer.items.add(f));
          imageFilesRef.current.files = dataTransfer.files;
        }
      }
    };
    reader.readAsDataURL(finalFile);

    // Traiter les fichiers en attente
    if (pendingFiles.length > 0) {
      const nextFile = pendingFiles[0];
      const nextUrl = URL.createObjectURL(nextFile);
      setCroppingImage({ url: nextUrl, index: imagePreviews.length + 1 });
      setPendingFiles(prev => prev.slice(1));
    } else {
      setCroppingImage(null);
      setPendingFiles([]);
    }
  };

  const handleCropExistingPreview = async (croppedFile: File, index: number) => {
    if (!croppingImage) return;

    // Compresser si nécessaire
    let finalFile = croppedFile;
    const targetSizeMB = 2;
    if (croppedFile.size > targetSizeMB * 1024 * 1024) {
      try {
        finalFile = await compressImageClient(croppedFile, {
          maxSizeMB: targetSizeMB,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
      } catch (error) {
        console.error('Erreur compression:', error);
      }
    }

    // Mettre à jour la prévisualisation à l'index spécifié
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        setImagePreviews(prev => {
          const newPreviews = [...prev];
          newPreviews[index] = url;
          return newPreviews;
        });
        
        // Mettre à jour l'input avec le fichier recadré
        if (imageFilesRef.current?.files) {
          const dataTransfer = new DataTransfer();
          const files = Array.from(imageFilesRef.current.files);
          files[index] = finalFile;
          files.forEach(f => dataTransfer.items.add(f));
          imageFilesRef.current.files = dataTransfer.files;
        }
      }
    };
    reader.readAsDataURL(finalFile);

    setCroppingImage(null);
  };

  const handlePhotoUrlsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPhotoUrls(value);
    const urls = parsePhotoUrls(value);
    setPhotoUrlPreviews(urls);
  };

  const removeImagePreview = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    
    // Mettre à jour les fichiers dans l'input
    if (imageFilesRef.current?.files) {
      const dataTransfer = new DataTransfer();
      const files = Array.from(imageFilesRef.current.files);
      files.forEach((file, i) => {
        if (i !== index) {
          dataTransfer.items.add(file);
        }
      });
      imageFilesRef.current.files = dataTransfer.files;
    }
  };

  const removePhotoUrl = (index: number) => {
    const urls = parsePhotoUrls(photoUrls);
    urls.splice(index, 1);
    const newUrls = urls.join(', ');
    setPhotoUrls(newUrls);
    setPhotoUrlPreviews(urls);
    if (photoUrlsRef.current) {
      photoUrlsRef.current.value = newUrls;
    }
  };

  return (
    <>
      {croppingImage && (
        <ImageCropper
          imageUrl={croppingImage.url}
          aspectRatio={1}
          locale={locale}
          onCrop={(croppedFile) => {
            if (croppingImage.index >= imagePreviews.length) {
              handleCropImage(croppedFile);
            } else {
              handleCropExistingPreview(croppedFile, croppingImage.index);
            }
          }}
          onCancel={() => {
            setCroppingImage(null);
            setPendingFiles([]);
            if (imageFilesRef.current) {
              imageFilesRef.current.value = '';
            }
          }}
        />
      )}
      <div className="space-y-4">
      <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">
        {locale === "fr" ? "Médias" : "Media"}
      </h2>
      
      {/* Upload d'images */}
      <div className="space-y-3">
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Images (une ou plusieurs)" : "Images (one or many)"}</span>
          <input
            ref={imageFilesRef}
            name="imageFiles"
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageFilesChange}
            disabled={uploading}
            className="h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:hover:bg-blue-700 file:text-white file:cursor-pointer disabled:opacity-50"
          />
          <p className="text-xs text-black/60">
            {locale === "fr" 
              ? "La première deviendra l'image principale. Taille maximale acceptée : 20MB (compression automatique à 2MB si > 2MB)."
              : "The first becomes the main image. Max accepted size: 20MB (automatic compression to 2MB if > 2MB)."}
          </p>
        </label>
        
        {/* Prévisualisation des images uploadées */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative rounded-md overflow-hidden border border-black/10 group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const url = ev.target?.result as string;
                        if (url) {
                          setCroppingImage({ url, index });
                        }
                      };
                      if (imageFilesRef.current?.files?.[index]) {
                        reader.readAsDataURL(imageFilesRef.current.files[index]);
                      }
                    }}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    {locale === "fr" ? "Recadrer" : "Crop"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImagePreview(index)}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    {locale === "fr" ? "Supprimer" : "Remove"}
                  </button>
                </div>
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {locale === "fr" ? "Principale" : "Main"}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vidéos */}
      <label className="grid gap-1 text-sm">
        <span>{locale === "fr" ? "Vidéos" : "Videos"}</span>
        <input
          name="videoFiles"
          type="file"
          multiple
          accept="video/*"
          className="h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:hover:bg-blue-700 file:text-white file:cursor-pointer"
        />
        <p className="text-xs text-black/60">
          {locale === "fr" 
            ? "Formats acceptés: MP4, WebM, OGG (max 100MB par fichier)"
            : "Accepted formats: MP4, WebM, OGG (max 100MB per file)"}
        </p>
      </label>

      {/* Photos externes (URLs) */}
      <div className="space-y-3">
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Photos externes (URLs, virgules ou JSON)" : "External photos (URLs, comma or JSON)"}</span>
          <textarea
            ref={photoUrlsRef}
            name="photoUrls"
            value={photoUrls}
            onChange={handlePhotoUrlsChange}
            className="min-h-[90px] rounded-lg border border-black/15 p-3 text-sm"
            placeholder="https://...jpg, https://...png"
          />
          <p className="text-xs text-black/60">
            {locale === "fr" 
              ? "Séparez les URLs par des virgules ou utilisez un tableau JSON. Les images seront téléchargées et stockées automatiquement."
              : "Separate URLs with commas or use a JSON array. Images will be automatically downloaded and stored."}
          </p>
        </label>
        
        {/* Prévisualisation des URLs de photos */}
        {photoUrlPreviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photoUrlPreviews.map((url, index) => (
              <div key={index} className="relative rounded-md overflow-hidden border border-black/10 group">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-28 object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.backgroundColor = '#f3f4f6';
                    img.alt = 'Image non disponible';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhotoUrl(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
