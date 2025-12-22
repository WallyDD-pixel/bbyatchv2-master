"use client";
import { useState, useRef, useEffect } from 'react';

interface ImageItem {
  url: string;
  isMain: boolean;
  isTemp?: boolean;
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
  const [images, setImages] = useState<ImageItem[]>(() => {
    const items: ImageItem[] = [];
    if (initialMainImage) {
      items.push({ url: initialMainImage, isMain: true });
    }
    initialPhotos.forEach(url => {
      if (url !== initialMainImage) {
        items.push({ url, isMain: false });
      }
    });
    return items;
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keepPhotosInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Mise à jour des champs cachés
  useEffect(() => {
    const mainImage = images.find(img => img.isMain);
    const otherImages = images.filter(img => !img.isMain);
    
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = mainImage?.url || '';
    }
    if (keepPhotosInputRef.current) {
      keepPhotosInputRef.current.value = JSON.stringify(otherImages.map(img => img.url));
    }
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
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

    e.target.value = '';
  };

  // Gestion du drop de fichiers externes
  const handleFileDragOver = (e: React.DragEvent) => {
    if (draggingId !== null) return; // Ignorer si on drag une image interne
    
    const hasFiles = e.dataTransfer.types.includes('Files');
    if (!hasFiles) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    if (draggingId !== null) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    if (draggingId !== null) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
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

  // Drag & Drop pour réorganiser les images
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (draggingId !== index || !dragStartPos.current) return;
    
    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
    
    // Seuil pour démarrer le drag
    if (deltaX > 5 || deltaY > 5) {
      setDraggingId(index);
    }
  };

  const handleMouseUp = () => {
    dragStartPos.current = null;
    if (draggingId !== null) {
      setDraggingId(null);
      setDragOverId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      e.preventDefault();
      return;
    }
    
    setDraggingId(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    
    // Créer une image fantôme personnalisée
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.innerHTML = `<img src="${images[index].url}" style="width: 120px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #3b82f6;" />`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 60, 40);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    dragStartPos.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggingId === null || draggingId === index) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(index);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggingId === null || draggingId === dropIndex) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    
    const from = draggingId;
    const to = dropIndex;
    
    setImages(prev => {
      const newImages = [...prev];
      const [draggedItem] = newImages.splice(from, 1);
      newImages.splice(to, 0, draggedItem);
      return newImages;
    });
    
    setDraggingId(null);
    setDragOverId(null);
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
        className={`relative min-h-[140px] rounded-xl border-2 border-dashed p-3 transition-all duration-200 ${
          isDraggingFile && draggingId === null
            ? 'border-blue-500 bg-blue-50 shadow-inner' 
            : 'border-black/15 bg-black/[0.02]'
        }`}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        onMouseUp={handleMouseUp}
      >
        {images.length === 0 ? (
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
        ) : (
          <div className="flex flex-wrap gap-3 items-start">
            {images.map((image, index) => {
              const isDragging = draggingId === index;
              const isDragOver = dragOverId === index && draggingId !== null && draggingId !== index;
              
              return (
                <div
                  key={`${image.url}-${index}`}
                  className={`group relative w-40 h-28 rounded-lg overflow-hidden bg-white border-2 flex-shrink-0 transition-all duration-200 ${
                    isDragging
                      ? 'opacity-40 scale-95 border-blue-400 shadow-lg z-50'
                      : isDragOver
                        ? 'border-blue-500 border-dashed scale-105 shadow-xl z-40 bg-blue-50'
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
                  onMouseDown={(e) => handleMouseDown(e, index)}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                >
                  {/* Image */}
                  <img 
                    src={image.url} 
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  
                  {/* Overlay au survol */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                  
                  {/* Badge image principale */}
                  {image.isMain && (
                    <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold shadow-sm pointer-events-none">
                      {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                    </span>
                  )}
                  
                  {/* Indicateur de position */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {index + 1}
                  </div>
                  
                  {/* Indicateur de drop */}
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none z-30">
                      <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium shadow-lg">
                        {locale === 'fr' ? 'Déposer ici' : 'Drop here'}
                      </div>
                    </div>
                  )}
                  
                  {/* Indicateur de déplacement */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-30">
                      <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {locale === 'fr' ? 'Déplacement...' : 'Moving...'}
                      </div>
                    </div>
                  )}
                  
                  {/* Bouton supprimer */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeImage(index);
                    }}
                    className="hidden group-hover:flex absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white items-center justify-center text-xs z-40 hover:bg-red-700 transition-colors shadow-sm"
                  >
                    ✕
                  </button>
                  
                  {/* Bouton définir principale */}
                  {!image.isMain && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setAsMainImage(index);
                      }}
                      className="hidden group-hover:flex absolute bottom-1 left-1 right-1 h-6 text-[10px] items-center justify-center rounded bg-green-600 text-white font-medium z-40 hover:bg-green-700 transition-colors shadow-sm"
                    >
                      {locale === 'fr' ? 'Définir principale' : 'Set as main'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Message de drop de fichiers */}
        {isDraggingFile && draggingId === null && images.length > 0 && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
              <div className="text-sm font-medium">
                {locale === 'fr' ? '📷 Déposez vos images ici' : '📷 Drop your images here'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      {images.length > 0 && (
        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3">
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
