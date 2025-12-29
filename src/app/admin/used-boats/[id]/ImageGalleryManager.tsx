"use client";
import { useState, useRef, useEffect } from 'react';

interface ImageItem {
  url: string;
  isMain: boolean;
  isTemp?: boolean; // Pour les nouvelles images ajoutées
}

interface ImageGalleryManagerProps {
  initialMainImage?: string;
  initialPhotos: string[];
  locale: 'fr' | 'en';
}

export default function ImageGalleryManager({ 
  initialMainImage, 
  initialPhotos, 
  locale 
}: ImageGalleryManagerProps) {
  console.log('🖼️ ImageGalleryManager - initialMainImage:', initialMainImage);
  console.log('🖼️ ImageGalleryManager - initialPhotos:', initialPhotos);
  
  const [images, setImages] = useState<ImageItem[]>(() => {
    const items: ImageItem[] = [];
    
    // Ajouter l'image principale en premier si elle existe
    if (initialMainImage) {
      items.push({ url: initialMainImage, isMain: true });
    }
    
    // Ajouter les autres photos
    initialPhotos.forEach(url => {
      // Éviter les doublons avec l'image principale
      if (url !== initialMainImage) {
        items.push({ url, isMain: false });
      }
    });
    
    console.log('🖼️ Images initiales:', items);
    return items;
  });

  const [isDragOverZone, setIsDragOverZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keepPhotosInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  // Mettre à jour les champs cachés quand les images changent
  useEffect(() => {
    console.log('🔄 Mise à jour des champs cachés, images:', images.length);
    const mainImage = images.find(img => img.isMain);
    const otherImages = images.filter(img => !img.isMain);
    
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = mainImage?.url || '';
      console.log('✅ mainImageInput mis à jour');
    }
    
    if (keepPhotosInputRef.current) {
      keepPhotosInputRef.current.value = JSON.stringify(otherImages.map(img => img.url));
      console.log('✅ keepPhotosInput mis à jour');
    }
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('📁 Fichiers sélectionnés:', files.length);

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        console.log('❌ Fichier ignoré (pas une image):', file.name, file.type);
        return;
      }
      
      console.log('✅ Traitement du fichier image:', file.name, file.size, 'bytes');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (url) {
          console.log('📷 Image convertie en Data URL, longueur:', url.length);
          setImages(prev => {
            const newImages = [...prev, { url, isMain: false, isTemp: true }];
            console.log('📊 Nouvelles images dans l\'état:', newImages.length);
            return newImages;
          });
        }
      };
      reader.onerror = (error) => {
        console.error('❌ Erreur lors de la lecture du fichier:', error);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
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
          setImages(prev => [...prev, { url, isMain: false, isTemp: true }]);
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
      const newImages = prev.filter((_, i) => i !== index);
      // Si on supprime l'image principale et qu'il y a d'autres images, 
      // faire de la première image restante la nouvelle image principale
      if (prev[index].isMain && newImages.length > 0) {
        newImages[0].isMain = true;
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

  // Déplacer une image vers la gauche (indice diminue)
  const moveImageLeft = (index: number) => {
    if (index === 0) return; // Déjà en première position
    
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index - 1];
      newImages[index - 1] = temp;
      return newImages;
    });
  };

  // Déplacer une image vers la droite (indice augmente)
  const moveImageRight = (index: number) => {
    setImages(prev => {
      if (index === prev.length - 1) return prev; // Déjà en dernière position
      
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index + 1];
      newImages[index + 1] = temp;
      return newImages;
    });
  };

  return (
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
          return (
            <div
              key={`${image.url}-${index}`}
              className={`group relative w-40 h-28 rounded-lg overflow-hidden bg-white border-2 flex-shrink-0 transition-all duration-200 ${
                image.isMain
                  ? 'border-green-400 shadow-sm'
                  : 'border-black/10 hover:border-black/20 hover:shadow-sm'
              }`}
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
                onLoad={(event) => {
                  console.log('✅ Image chargée avec succès:', image.url.substring(0, 50) + '...');
                  // Cacher le fallback si l'image se charge
                  const fallback = (event.target as HTMLImageElement).nextElementSibling as HTMLElement;
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
                <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold shadow-sm z-10">
                  {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                </span>
              )}
              
              {/* Boutons de déplacement */}
              <div className="hidden group-hover:flex absolute inset-0 bg-black/40 items-center justify-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => moveImageLeft(index)}
                  disabled={index === 0}
                  className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center text-sm font-bold hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  title={locale === 'fr' ? 'Déplacer vers la gauche' : 'Move left'}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveImageRight(index)}
                  disabled={index === images.length - 1}
                  className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center text-sm font-bold hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  title={locale === 'fr' ? 'Déplacer vers la droite' : 'Move right'}
                >
                  →
                </button>
              </div>
              
              {/* Bouton supprimer */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="hidden group-hover:flex absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white items-center justify-center text-xs z-20 hover:bg-red-700 transition-colors shadow-sm"
              >
                ✕
              </button>
              
              {/* Bouton définir comme principale */}
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
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                    ? 'Survolez une image et utilisez les flèches ← → pour réorganiser' 
                    : 'Hover over an image and use arrows ← → to reorder'}</li>
                  <li>• {locale === 'fr' 
                    ? 'Survolez une image pour voir toutes les options' 
                    : 'Hover over an image to see all options'}</li>
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
        defaultValue=""
      />
      <input 
        ref={mainImageInputRef}
        type="hidden" 
        name="mainImageChoice" 
        defaultValue=""
      />
    </div>
  );
}