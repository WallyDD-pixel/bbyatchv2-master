"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitForm } from "@/lib/form-utils";
import Toast from "@/components/Toast";

interface ExperienceNewClientProps {
  locale: "fr" | "en";
}

export default function ExperienceNewClient({ locale }: ExperienceNewClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    
    try {
      // Créer des URLs de prévisualisation locales
      const newFiles = Array.from(files);
      const newPreviewUrls: string[] = [];
      
      newFiles.forEach((file) => {
        const previewUrl = URL.createObjectURL(file);
        newPreviewUrls.push(previewUrl);
      });

      // Ajouter les fichiers et leurs prévisualisations
      setImageFiles(prev => [...prev, ...newFiles]);
      const newPhotos = [...photos, ...newPreviewUrls];
      setPhotos(newPhotos);
      if (!imageUrl && newPhotos[0]) {
        setImageUrl(newPhotos[0]);
      }
    } catch (error) {
      console.error("Error:", error);
      setToast({
        message: locale === 'fr' ? 'Erreur lors de la sélection des images' : 'Error selecting images',
        type: "error"
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    if (!confirm(locale === 'fr' ? 'Supprimer cette image ?' : 'Remove this image?')) return;
    
    // Libérer l'URL de l'objet si c'est une prévisualisation locale
    if (photos[index]?.startsWith('blob:')) {
      URL.revokeObjectURL(photos[index]);
    }
    
    const newPhotos = photos.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setImageFiles(newFiles);
    
    if (imageUrl === photos[index] && newPhotos.length > 0) {
      setImageUrl(newPhotos[0]);
    } else if (newPhotos.length === 0) {
      setImageUrl(null);
    }
  };

  const setMainImage = (url: string) => {
    setImageUrl(url);
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    const newPhotos = [...photos];
    const newFiles = [...imageFiles];
    const [movedPhoto] = newPhotos.splice(index, 1);
    const [movedFile] = newFiles.splice(index, 1);
    newPhotos.splice(newIndex, 0, movedPhoto);
    newFiles.splice(newIndex, 0, movedFile);
    setPhotos(newPhotos);
    setImageFiles(newFiles);
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null) return;
    const newPhotos = [...photos];
    const newFiles = [...imageFiles];
    const [movedPhoto] = newPhotos.splice(dragIndex, 1);
    const [movedFile] = newFiles.splice(dragIndex, 1);
    newPhotos.splice(index, 0, movedPhoto);
    newFiles.splice(index, 0, movedFile);
    setPhotos(newPhotos);
    setImageFiles(newFiles);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    
    setSaving(true);
    setToast(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Vérifier la taille des fichiers avant soumission
    const maxFileSize = 10 * 1024 * 1024; // 10MB par fichier
    const maxTotalSize = 45 * 1024 * 1024; // 45MB total
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    let totalSize = 0;
    
    imageFiles.forEach((file) => {
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        validFiles.push(file);
        totalSize += file.size;
      }
    });
    
    if (invalidFiles.length > 0) {
      setToast({
        message: `Certains fichiers sont trop volumineux (max 10MB par fichier): ${invalidFiles.join(', ')}`,
        type: "error"
      });
      setSaving(false);
      return;
    }
    
    if (totalSize > maxTotalSize) {
      setToast({
        message: `Taille totale trop importante: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB). Uploadez moins d'images à la fois.`,
        type: "error"
      });
      setSaving(false);
      return;
    }
    
    // Ajouter les fichiers d'images sélectionnés (validés)
    validFiles.forEach((file) => {
      formData.append('imageFiles', file);
    });
    
    // Ajouter photoUrls (seulement les URLs existantes, pas les blob URLs)
    const existingPhotoUrls = photos.filter(url => !url.startsWith('blob:'));
    if (existingPhotoUrls.length > 0) {
      formData.append('photoUrls', JSON.stringify(existingPhotoUrls));
    }
    
    // Ajouter imageUrl
    if (imageUrl && !imageUrl.startsWith('blob:')) {
      formData.append('imageUrl', imageUrl);
    } else {
      formData.append('imageUrl', '');
    }

    const result = await submitForm("/api/admin/experiences", formData, {
      successMessage: locale === 'fr' ? "Expérience créée avec succès" : "Experience created successfully",
      errorMessage: locale === 'fr' ? "Erreur lors de la création" : "Error creating experience",
      redirectUrl: "/admin/experiences?created=1",
    });

    if (result.success) {
      if (result.data?.redirect) {
        setTimeout(() => {
          router.push(result.data.url);
          router.refresh();
        }, 500);
      } else if (result.data?.id) {
        setToast({ 
          message: locale === 'fr' ? "Expérience créée avec succès" : "Experience created successfully", 
          type: "success" 
        });
        setTimeout(() => {
          router.push(`/admin/experiences/${result.data.id}`);
          router.refresh();
        }, 1000);
      }
    } else {
      setToast({ 
        message: result.error || (locale === 'fr' ? "Erreur lors de la création" : "Error creating experience"), 
        type: "error" 
      });
    }
    
    setSaving(false);
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <form onSubmit={handleSubmit} className='mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm'>
        <div className='grid sm:grid-cols-2 gap-4'>
          <label className='grid gap-1 text-sm'>
            <span>Slug</span>
            <input name='slug' required className='h-11 rounded-lg border border-black/15 px-3' />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Titre (FR)' : 'Title (FR)'}</span>
            <input required name='titleFr' className='h-11 rounded-lg border border-black/15 px-3' />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Titre (EN)' : 'Title (EN)'}</span>
            <input required name='titleEn' className='h-11 rounded-lg border border-black/15 px-3' />
          </label>
        </div>
        <div className='grid sm:grid-cols-2 gap-4'>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Description (FR)' : 'Description (FR)'}</span>
            <textarea name='descFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>{locale === 'fr' ? 'Description (EN)' : 'Description (EN)'}</span>
            <textarea name='descEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' />
          </label>
        </div>

        <div className='grid sm:grid-cols-2 gap-4'>
          <label className='grid gap-1 text-sm'>
            <span>Heure (FR)</span>
            <input name='timeFr' className='h-11 rounded-lg border border-black/15 px-3' />
          </label>
          <label className='grid gap-1 text-sm'>
            <span>Time (EN)</span>
            <input name='timeEn' className='h-11 rounded-lg border border-black/15 px-3' />
          </label>
        </div>
        
        {/* Horaires fixes pour événements */}
        <div className='rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4'>
          <div className='flex items-center gap-2'>
            <input 
              type='checkbox' 
              name='hasFixedTimes' 
              id='hasFixedTimes'
              className='h-4 w-4 accent-[color:var(--primary)]'
            />
            <label htmlFor='hasFixedTimes' className='text-sm font-semibold text-blue-900 cursor-pointer'>
              {locale === 'fr' ? 'Horaires fixes (événements comme feux d\'artifice)' : 'Fixed times (events like fireworks)'}
            </label>
          </div>
          <p className='text-xs text-blue-700/80'>
            {locale === 'fr' 
              ? 'Si activé, les horaires de départ et retour seront fixes et non modifiables par le client. Exemple : Feu d\'artifice à 22h → départ à 20h30 maximum.'
              : 'If enabled, departure and return times will be fixed and non-editable by the client. Example: Fireworks at 10 PM → departure at 8:30 PM maximum.'}
          </p>
          <div className='grid sm:grid-cols-2 gap-4'>
            <label className='grid gap-1 text-sm'>
              <span>{locale === 'fr' ? 'Heure de départ fixe' : 'Fixed departure time'}</span>
              <input 
                type='time' 
                name='fixedDepartureTime' 
                className='h-11 rounded-lg border border-black/15 px-3' 
                placeholder='20:30'
              />
              <p className='text-xs text-black/50'>{locale === 'fr' ? 'Format: HH:mm (ex: 20:30)' : 'Format: HH:mm (e.g. 20:30)'}</p>
            </label>
            <label className='grid gap-1 text-sm'>
              <span>{locale === 'fr' ? 'Heure de retour fixe' : 'Fixed return time'}</span>
              <input 
                type='time' 
                name='fixedReturnTime' 
                className='h-11 rounded-lg border border-black/15 px-3' 
                placeholder='23:00'
              />
              <p className='text-xs text-black/50'>{locale === 'fr' ? 'Format: HH:mm (ex: 23:00)' : 'Format: HH:mm (e.g. 23:00)'}</p>
            </label>
          </div>
        </div>
        
        {/* Gestion des images */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{locale === 'fr' ? 'Images' : 'Images'}</h2>
            <label className='text-sm inline-flex items-center gap-2 cursor-pointer'>
              <span className='rounded-full bg-[color:var(--primary)] text-white px-4 h-9 inline-flex items-center'>
                {uploading ? (locale === 'fr' ? 'Téléversement…' : 'Uploading…') : (locale === 'fr' ? 'Ajouter des images' : 'Add images')}
              </span>
              <input 
                ref={fileInputRef}
                type='file' 
                multiple 
                accept='image/*' 
                disabled={uploading} 
                onChange={handleImageUpload} 
                className='hidden' 
              />
            </label>
          </div>
          
          {photos.length === 0 && (
            <div className='relative h-48 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 bg-black/[0.02]'>
              <svg width='30' height='30' viewBox='0 0 24 24' className='mb-2 text-black/40'>
                <path fill='currentColor' d='M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z'/>
              </svg>
              <span>{locale === 'fr' ? 'Aucune image. Cliquez sur "Ajouter des images" pour commencer.' : 'No images. Click "Add images" to start.'}</span>
            </div>
          )}
          
          {photos.length > 0 && (
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
              {photos.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  draggable
                  onDragStart={handleDragStart(i)}
                  onDragOver={handleDragOver(i)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`group relative border border-black/10 rounded-lg overflow-hidden bg-gray-100 cursor-move transition ${
                    dragOverIndex === i ? 'ring-2 ring-[color:var(--primary)] scale-[1.02]' : ''
                  } ${dragIndex === i ? 'opacity-50' : ''}`}
                >
                  <div className='absolute top-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded cursor-grab select-none z-10'>
                    ≡
                  </div>
                  <img 
                    src={url} 
                    alt={`photo ${i + 1}`} 
                    className='w-full h-32 object-cover pointer-events-none'
                  />
                  <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                    <button
                      type='button'
                      onClick={() => movePhoto(i, -1)}
                      disabled={i === 0}
                      className='text-xs px-2 py-1 bg-white/80 rounded disabled:opacity-30'
                    >
                      ↑
                    </button>
                    <button
                      type='button'
                      onClick={() => movePhoto(i, 1)}
                      disabled={i === photos.length - 1}
                      className='text-xs px-2 py-1 bg-white/80 rounded disabled:opacity-30'
                    >
                      ↓
                    </button>
                    <button
                      type='button'
                      onClick={() => setMainImage(url)}
                      className={`text-xs px-2 py-1 rounded ${
                        imageUrl === url 
                          ? 'bg-green-500 text-white' 
                          : 'bg-white/80 text-black'
                      }`}
                    >
                      {locale === 'fr' ? 'Principale' : 'Main'}
                    </button>
                    <button
                      type='button'
                      onClick={() => removePhoto(i)}
                      className='text-xs px-2 py-1 bg-red-600 text-white rounded'
                    >
                      ×
                    </button>
                  </div>
                  {imageUrl === url && (
                    <div className='absolute top-1 left-8 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded z-10'>
                      {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                    </div>
                  )}
                  <div className='absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded'>
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className='flex justify-end gap-4 pt-4 border-t border-black/10'>
          <a
            href='/admin/experiences'
            className='px-6 h-11 rounded-full border border-black/15 bg-white hover:bg-black/5 text-sm font-medium inline-flex items-center justify-center'
          >
            {locale === 'fr' ? 'Annuler' : 'Cancel'}
          </a>
          <button
            type='submit'
            disabled={saving}
            className='px-6 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow'
            style={{ backgroundColor: saving ? '#60a5fa' : '#2563eb' }}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? (locale === 'fr' ? 'Création...' : 'Creating...') : (locale === 'fr' ? 'Créer' : 'Create')}
          </button>
        </div>
      </form>
    </>
  );
}
