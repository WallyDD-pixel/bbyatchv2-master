"use client";
import { useState, useRef, useLayoutEffect } from 'react';
import ImageCropper from '@/components/ImageCropper';

interface ImageItem {
  url: string;
  isMain: boolean;
  isTemp?: boolean; // Pour les nouvelles images ajoutées
  file?: File; // Fichier original pour les nouvelles images
}

interface ImageGalleryManagerProps {
  initialMainImage?: string;
  initialPhotos: string[];
  locale: 'fr' | 'en';
  onNewFilesChange?: (files: File[]) => void;
}

export default function ImageGalleryManager({ 
  initialMainImage, 
  initialPhotos, 
  locale,
  onNewFilesChange
}: ImageGalleryManagerProps) {
  console.log('🖼️ ImageGalleryManager - initialMainImage:', initialMainImage);
  console.log('🖼️ ImageGalleryManager - initialPhotos:', initialPhotos);
  
  const [images, setImages] = useState<ImageItem[]>(() => {
    const items: ImageItem[] = [];
    
    // Ajouter l'image principale en premier si elle existe
    if (initialMainImage) {
      items.push({ url: initialMainImage, isMain: true });
    }
    
    // Ajouter les autres photos (en excluant l'image principale pour éviter les doublons)
    const uniquePhotos = new Set<string>();
    if (initialMainImage) {
      uniquePhotos.add(initialMainImage);
    }
    
    initialPhotos.forEach(url => {
      // Éviter les doublons avec l'image principale et entre les photos
      if (url && url.trim() && !uniquePhotos.has(url) && url !== initialMainImage) {
        items.push({ url, isMain: false });
        uniquePhotos.add(url);
      }
    });
    
    console.log('🖼️ Images initiales:', items.length, 'items');
    console.log('🖼️ Détail:', items.map(img => ({ url: img.url.substring(0, 50) + '...', isMain: img.isMain })));
    return items;
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverZone, setIsDragOverZone] = useState(false);
  const [croppingImage, setCroppingImage] = useState<{ url: string; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keepPhotosInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const mainNewUploadIndexRef = useRef<HTMLInputElement>(null);

  // Mettre à jour les champs cachés quand les images changent (layout = avant peinture, évite une course avec « Enregistrer »)
  useLayoutEffect(() => {
    console.log('🔄 Mise à jour des champs cachés, images:', images.length);
    
    // Utiliser requestAnimationFrame pour s'assurer que les refs sont bien attachées
    requestAnimationFrame(() => {
      // Trouver l'image principale (priorité aux images existantes, sinon la première image principale)
      const mainImage = images.find(img => img.isMain && !img.isTemp) || images.find(img => img.isMain);
      const otherImages = images.filter(img => !img.isMain && !img.isTemp);
      // Ordre des fichiers à uploader = même ordre que le parent (FormSubmitHandler append)
      const tempsWithFile = images.filter((img) => img.isTemp && img.file);
      const mainIsNewUpload =
        mainImage?.isTemp && mainImage.file
          ? tempsWithFile.findIndex((img) => img === mainImage)
          : -1;
      
      console.log('📊 Images analysées - mainImage:', mainImage ? 'trouvée' : 'absente', 'otherImages:', otherImages.length);
      console.log('📊 Détail mainImage:', mainImage ? { url: mainImage.url.substring(0, 50) + '...', isTemp: mainImage.isTemp } : 'aucune');
      
      if (mainImageInputRef.current) {
        // Toujours définir une valeur, même si vide, pour que l'API sache qu'on a envoyé le champ
        const mainImageValue = mainImage?.url || '';
        mainImageInputRef.current.value = mainImageValue;
        console.log('✅ mainImageInput mis à jour:', mainImageValue || '(vide)');
      } else {
        console.warn('⚠️ mainImageInputRef.current est null');
      }
      
      if (keepPhotosInputRef.current) {
        // Filtrer uniquement les images existantes (pas les nouvelles temporaires)
        const existingPhotos = otherImages.map(img => img.url);
        const jsonValue = JSON.stringify(existingPhotos);
        keepPhotosInputRef.current.value = jsonValue;
        console.log('✅ keepPhotosInput mis à jour:', existingPhotos.length, 'photos, valeur:', jsonValue);
        console.log('🔍 URLs des photos à conserver:', existingPhotos);
      } else {
        console.warn('⚠️ keepPhotosInputRef.current est null');
      }

      if (mainNewUploadIndexRef.current) {
        mainNewUploadIndexRef.current.value =
          mainIsNewUpload >= 0 ? String(mainIsNewUpload) : '';
      }

      // Notifier les nouveaux fichiers
      if (onNewFilesChange) {
        const newFiles = images.filter(img => img.isTemp && img.file).map(img => img.file!);
        onNewFilesChange(newFiles);
      }
    });
  }, [images, onNewFilesChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const looksLikeImage = (f: File) =>
      f.type.startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(f.name);

    const imageFiles = Array.from(files).filter(looksLikeImage);
    if (imageFiles.length === 0) {
      alert(
        locale === 'fr'
          ? 'Aucune image reconnue (JPEG, PNG, WebP, GIF…). Les fichiers HEIC/iPhone peuvent être refusés par le navigateur : exportez en JPEG ou utilisez une autre photo.'
          : 'No supported image (JPEG, PNG, WebP, GIF…). HEIC/iPhone files may not work in the browser — export as JPEG or pick another photo.'
      );
      e.target.value = '';
      return;
    }

    console.log('📁 Fichiers sélectionnés:', imageFiles.length);

    const firstFile = imageFiles[0];
    const restFiles = imageFiles.slice(1);

    const readAsDataUrl = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string) || '');
        r.onerror = () => reject(new Error('Read failed'));
        r.readAsDataURL(file);
      });

    const cropIndex = images.length + restFiles.length;

    try {
      if (restFiles.length > 0) {
        const restUrls = await Promise.all(restFiles.map(readAsDataUrl));
        const newItems: ImageItem[] = restUrls.map((url, i) => ({
          url,
          isMain: false,
          isTemp: true,
          file: restFiles[i],
        }));
        setImages((prev) => {
          const isFirst = prev.length === 0;
          if (isFirst && newItems.length > 0) {
            newItems[0] = { ...newItems[0], isMain: true };
          }
          return [...prev, ...newItems];
        });
      }

      const firstUrl = await readAsDataUrl(firstFile);
      if (firstUrl) {
        setCroppingImage({ url: firstUrl, index: cropIndex });
      }
    } catch (err) {
      console.error('Erreur lecture image:', err);
      alert(
        locale === 'fr'
          ? 'Impossible de lire ce fichier image. Essayez un autre format (JPEG, PNG).'
          : 'Could not read this image file. Try another format (JPEG, PNG).'
      );
    }

    e.target.value = '';
  };

  const handleCropNewImage = (croppedFile: File) => {
    if (!croppingImage) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        setImages(prev => {
          const isFirst = prev.length === 0;
          const newImages = [...prev, { url, isMain: isFirst, isTemp: true, file: croppedFile }];
          return newImages;
        });
      }
    };
    reader.readAsDataURL(croppedFile);
    setCroppingImage(null);
  };

  const handleCropExistingImage = async (croppedFile: File) => {
    if (!croppingImage) return;
    
    const index = croppingImage.index;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        setImages(prev => {
          const newImages = [...prev];
          if (newImages[index]) {
            newImages[index] = { ...newImages[index], url, file: croppedFile };
          }
          return newImages;
        });
      }
    };
    reader.readAsDataURL(croppedFile);
    setCroppingImage(null);
  };

  // Gestion du drag & drop de fichiers depuis l'extérieur
  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverZone(true);
  };

  const handleZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverZone(false);
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverZone(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('📁 Fichiers déposés:', files.length);
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          setImages((prev) => {
            const isFirst = prev.length === 0;
            return [...prev, { url, isMain: isFirst, isTemp: true, file }];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    if (!confirm(locale === 'fr' ? 'Supprimer cette image ?' : 'Remove this image?')) {
      return;
    }
    
    setImages(prev => {
      // Vérifier que l'index est valide
      if (index < 0 || index >= prev.length) {
        console.error('❌ Index invalide:', index, 'sur', prev.length, 'images');
        return prev;
      }
      
      const imageToRemove = prev[index];
      console.log('🗑️ Suppression de l\'image à l\'index:', index, 'URL:', imageToRemove.url.substring(imageToRemove.url.length - 40));
      console.log('📋 Images avant suppression:', prev.map((img, i) => `${i}: ${img.url.substring(img.url.length - 30)}`));
      
      const newImages = prev.filter((_, i) => i !== index);
      console.log('📋 Images après suppression:', newImages.length);
      
      // Si on supprime l'image principale et qu'il y a d'autres images, 
      // faire de la première image restante la nouvelle image principale
      if (imageToRemove.isMain && newImages.length > 0) {
        newImages[0].isMain = true;
        console.log('✅ Nouvelle image principale définie:', newImages[0].url.substring(newImages[0].url.length - 30));
      }
      
      // Mettre à jour immédiatement les champs cachés (même logique que useEffect : main peut être temporaire)
      const mainImage =
        newImages.find((img) => img.isMain && !img.isTemp) ||
        newImages.find((img) => img.isMain);
      const otherImages = newImages.filter(img => !img.isMain && !img.isTemp);
      const tempsWithFile = newImages.filter((img) => img.isTemp && img.file);
      const mainNewIdx =
        mainImage?.isTemp && mainImage.file
          ? tempsWithFile.findIndex((img) => img === mainImage)
          : -1;
      
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = mainImage?.url || '';
        console.log('✅ mainImageInput mis à jour après suppression:', mainImage?.url || '(vide)');
      }
      
      if (keepPhotosInputRef.current) {
        const existingPhotos = otherImages.map(img => img.url);
        const jsonValue = JSON.stringify(existingPhotos);
        keepPhotosInputRef.current.value = jsonValue;
        console.log('✅ keepPhotosInput mis à jour après suppression:', existingPhotos.length, 'photos, valeur:', jsonValue);
      }

      if (mainNewUploadIndexRef.current) {
        mainNewUploadIndexRef.current.value = mainNewIdx >= 0 ? String(mainNewIdx) : '';
      }
      
      return newImages;
    });
  };

  const setAsMainImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      isMain: i === index
    })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('🔄 Drag start:', index);
    setDraggedIndex(index);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    console.log('🔄 Drag end');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Ne pas définir dragOver sur l'élément qu'on est en train de déplacer
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Vérifier si on quitte vraiment l'élément (pas juste un enfant)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Drop - draggedIndex:', draggedIndex, 'dropIndex:', dropIndex);
    
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log('❌ Drop annulé - même position ou pas de drag');
      return;
    }
    
    setImages(prev => {
      const newImages = [...prev];
      const draggedItem = newImages[draggedIndex];
      
      console.log('📋 Avant déplacement:', newImages.map((img, i) => `${i}: ${img.url.substring(img.url.length - 20)}`));
      
      // Supprimer l'élément de sa position actuelle
      newImages.splice(draggedIndex, 1);
      
      // Calculer la nouvelle position correctement
      let finalDropIndex = dropIndex;
      
      if (draggedIndex < dropIndex) {
        // Déplacement vers la droite : l'index de destination diminue de 1
        finalDropIndex = dropIndex - 1;
        console.log('➡️ Déplacement vers la droite, finalDropIndex:', finalDropIndex);
      } else {
        // Déplacement vers la gauche : pas d'ajustement
        console.log('⬅️ Déplacement vers la gauche, finalDropIndex:', finalDropIndex);
      }
      
      // S'assurer que l'index est dans les limites
      finalDropIndex = Math.max(0, Math.min(finalDropIndex, newImages.length));
      
      // Insérer à la nouvelle position
      newImages.splice(finalDropIndex, 0, draggedItem);
      
      console.log('📋 Après déplacement:', newImages.map((img, i) => `${i}: ${img.url.substring(img.url.length - 20)}`));
      
      return newImages;
    });
  };

  return (
    <>
      {croppingImage && (
        <ImageCropper
          imageUrl={croppingImage.url}
          aspectRatio={16/9}
          locale={locale}
          onCrop={
            croppingImage.url.startsWith('data:') || croppingImage.url.startsWith('blob:')
              ? handleCropNewImage
              : handleCropExistingImage
          }
          onCancel={() => {
            setCroppingImage(null);
          }}
        />
      )}
      <div className="grid gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-medium">
          {locale === 'fr' ? 'Galerie images' : 'Image gallery'}
        </p>
        <label className="text-xs rounded-full border border-black/15 px-4 h-9 inline-flex items-center gap-2 cursor-pointer hover:bg-black/5">
          <span>➕</span> 
          <span>{locale === 'fr' ? 'Ajouter' : 'Add'}</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
      
      <div 
        className={`min-h-[140px] rounded-xl border-2 border-dashed p-3 flex flex-wrap gap-3 items-start justify-start transition-all duration-200 ${
          isDragOverZone 
            ? 'border-blue-500 bg-blue-50 shadow-inner' 
            : 'border-black/15 bg-black/[0.02]'
        }`}
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneDragLeave}
        onDrop={handleZoneDrop}
      >
        {images.map((image, index) => {
          const isDragged = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;
          
          return (
            <div
              key={image.isTemp ? `temp-${image.url}-${index}` : `existing-${image.url}`}
              className={`group relative w-40 h-28 rounded-lg overflow-hidden bg-white border-2 flex-shrink-0 cursor-move transition-all duration-200 ${
                isDragged 
                  ? 'opacity-50 scale-95 rotate-2 border-blue-400 shadow-lg' 
                  : isDragOver 
                    ? 'border-blue-500 shadow-md scale-105 bg-blue-50' 
                    : image.isMain
                      ? 'border-green-400 shadow-sm'
                      : 'border-black/10 hover:border-black/20 hover:shadow-sm'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <img 
                src={image.url} 
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('❌ Erreur de chargement image:', image.url);
                  // Afficher le fallback au lieu de cacher l'image
                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={(e) => {
                  console.log('✅ Image chargée avec succès:', image.url.substring(0, 50) + '...');
                  // Cacher le fallback si l'image se charge
                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'none';
                  }
                }}
              />
              
              {/* Fallback si l'image ne charge pas */}
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-xs" style={{ display: 'none' }}>
                <div className="text-center">
                  <div>📷</div>
                  <div>Image</div>
                  <div className="text-[10px] mt-1">Erreur de chargement</div>
                </div>
              </div>
              
              {image.isMain && (
                <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold shadow-sm">
                  {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                </span>
              )}
              
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium shadow-lg">
                    {locale === 'fr' ? 'Déposer ici' : 'Drop here'}
                  </div>
                </div>
              )}
              
              {isDragged && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {locale === 'fr' ? 'Déplacement...' : 'Moving...'}
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCroppingImage({ url: image.url, index });
                  }}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {locale === 'fr' ? 'Recadrer' : 'Crop'}
                </button>
                {!image.isMain && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAsMainImage(index);
                    }}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    {locale === 'fr' ? 'Principale' : 'Main'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('🗑️ Clic sur suppression, index:', index, 'image URL:', image.url.substring(image.url.length - 30));
                    removeImage(index);
                  }}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  {locale === 'fr' ? 'Supprimer' : 'Remove'}
                </button>
              </div>
              
              {!image.isMain && (
                <button
                  type="button"
                  onClick={() => setAsMainImage(index)}
                  className="hidden group-hover:flex absolute bottom-1 left-1 right-1 h-6 text-[10px] items-center justify-center rounded bg-green-600 text-white font-medium z-20 hover:bg-green-700 transition-colors shadow-sm"
                >
                  {locale === 'fr' ? 'Définir principale' : 'Set as main'}
                </button>
              )}
              
              {/* Indicateur de position */}
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {index + 1}
              </div>
            </div>
          );
        })}
        
        {images.length === 0 && (
          <div className="w-full text-center py-8">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-black/50 text-sm mb-2">
              {locale === 'fr' 
                ? 'Aucune image ajoutée' 
                : 'No images added'}
            </div>
            <div className="text-black/40 text-xs">
              {locale === 'fr' 
                ? 'Cliquez sur "Ajouter" ou glissez des images ici' 
                : 'Click "Add" or drag images here'}
            </div>
          </div>
        )}
        
        {isDragOverZone && images.length > 0 && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <div className="text-sm font-medium">
                {locale === 'fr' ? '📷 Déposez vos images ici' : '📷 Drop your images here'}
              </div>
            </div>
          </div>
        )}
        
        {images.length > 0 && (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 text-sm">💡</div>
              <div className="text-[11px] text-blue-800 leading-relaxed">
                <div className="font-medium mb-1">
                  {locale === 'fr' ? 'Comment utiliser :' : 'How to use:'}
                </div>
                <ul className="space-y-1">
                  <li>• {locale === 'fr' 
                    ? 'Glissez-déposez les images pour les réorganiser' 
                    : 'Drag & drop images to reorder them'}</li>
                  <li>• {locale === 'fr' 
                    ? 'Survolez une image pour voir les options' 
                    : 'Hover over an image to see options'}</li>
                  <li>• {locale === 'fr' 
                    ? 'L\'image principale apparaît en premier sur le site' 
                    : 'The main image appears first on the website'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Champs cachés pour le formulaire */}
      <input 
        ref={keepPhotosInputRef}
        type="hidden" 
        name="keepPhotos" 
        defaultValue="[]"
      />
      <input 
        ref={mainImageInputRef}
        type="hidden" 
        name="mainImageChoice" 
        defaultValue=""
      />
      <input
        ref={mainNewUploadIndexRef}
        type="hidden"
        name="mainNewUploadIndex"
        defaultValue=""
      />
    </div>
    </>
  );
}