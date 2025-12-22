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
    <div className="grid gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-semibold text-gray-900">
          {locale === 'fr' ? 'Galerie images' : 'Image gallery'}
        </h3>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{locale === 'fr' ? 'Ajouter des images' : 'Add images'}</span>
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
        className={`relative min-h-[200px] rounded-xl border-2 border-dashed p-4 transition-all duration-200 ${
          isDraggingFile && draggingId === null
            ? 'border-blue-500 bg-blue-50 shadow-inner' 
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        onMouseUp={handleMouseUp}
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">
              {locale === 'fr' ? 'Aucune image' : 'No images'}
            </p>
            <p className="text-sm text-gray-500">
              {locale === 'fr' 
                ? 'Cliquez sur "Ajouter" ou glissez des images ici' 
                : 'Click "Add" or drag images here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => {
              const isDragging = draggingId === index;
              const isDragOver = dragOverId === index && draggingId !== null && draggingId !== index;
              
              return (
                <div
                  key={`${image.url}-${index}`}
                  className={`group relative aspect-[4/3] rounded-lg overflow-hidden bg-white border-2 transition-all duration-200 ${
                    isDragging
                      ? 'opacity-40 scale-95 border-blue-400 shadow-lg z-50'
                      : isDragOver
                        ? 'border-blue-500 border-dashed scale-105 shadow-xl z-40 bg-blue-50'
                        : image.isMain
                          ? 'border-green-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
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
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none">
                      {locale === 'fr' ? 'PRINCIPALE' : 'MAIN'}
                    </div>
                  )}
                  
                  {/* Indicateur de position */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    #{index + 1}
                  </div>
                  
                  {/* Poignée de drag */}
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded text-center font-medium">
                      {locale === 'fr' ? '☰ Glisser pour réorganiser' : '☰ Drag to reorder'}
                    </div>
                  </div>
                  
                  {/* Indicateur de drop */}
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center z-30 pointer-events-none">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl font-medium">
                        {locale === 'fr' ? '↓ Déposer ici' : '↓ Drop here'}
                      </div>
                    </div>
                  )}
                  
                  {/* Boutons d'action */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="pointer-events-auto w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg z-50"
                      title={locale === 'fr' ? 'Supprimer' : 'Delete'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    
                    {!image.isMain && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsMainImage(index);
                        }}
                        className="pointer-events-auto px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg z-50"
                        title={locale === 'fr' ? 'Définir comme principale' : 'Set as main'}
                      >
                        {locale === 'fr' ? 'Principale' : 'Main'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Message de drop de fichiers */}
        {isDraggingFile && draggingId === null && images.length > 0 && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl">
              <div className="text-base font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {locale === 'fr' ? 'Déposez vos images ici' : 'Drop your images here'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      {images.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-lg">💡</div>
            <div className="text-sm text-blue-900">
              <div className="font-semibold mb-2">
                {locale === 'fr' ? 'Comment réorganiser les images :' : 'How to reorder images:'}
              </div>
              <ul className="space-y-1 text-blue-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>{locale === 'fr' 
                    ? 'Cliquez et maintenez sur une image, puis glissez-la vers une autre position' 
                    : 'Click and hold on an image, then drag it to another position'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>{locale === 'fr' 
                    ? 'Survolez une image pour voir les options (supprimer, définir comme principale)' 
                    : 'Hover over an image to see options (delete, set as main)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>{locale === 'fr' 
                    ? 'L\'image principale (badge vert) apparaîtra en premier sur le site' 
                    : 'The main image (green badge) will appear first on the website'}</span>
                </li>
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
