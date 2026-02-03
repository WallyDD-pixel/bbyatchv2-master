"use client";
import { useState, useRef, useEffect } from "react";

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number; // Ratio largeur/hauteur (ex: 16/9, 4/3, 1 pour carré)
  locale?: "fr" | "en";
}

export default function ImageCropper({
  imageUrl,
  onCrop,
  onCancel,
  aspectRatio = 1,
  locale = "fr",
}: ImageCropperProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Définir crossOrigin uniquement pour les URLs externes (pas pour blob: ou data:)
      const isLocalUrl = imageUrl.startsWith('blob:') || imageUrl.startsWith('data:');
      if (!isLocalUrl) {
        img.crossOrigin = 'anonymous';
      } else {
        img.crossOrigin = '';
      }
      
      const handleLoad = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        
        // Centrer l'image initialement
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const cropWidth = Math.min(containerWidth * 0.8, containerHeight * 0.8 * aspectRatio);
        const cropHeight = cropWidth / aspectRatio;
        
        // Calculer le scale pour que l'image remplisse au moins la zone de recadrage
        const scaleX = cropWidth / img.naturalWidth;
        const scaleY = cropHeight / img.naturalHeight;
        const initialScale = Math.max(scaleX, scaleY) * 1.2; // 20% plus grand pour permettre le repositionnement
        
        setScale(initialScale);
        setPosition({
          x: (containerWidth - cropWidth) / 2,
          y: (containerHeight - cropHeight) / 2,
        });
      };
      
      const handleError = () => {
        console.warn('⚠️ Erreur de chargement de l\'image, tentative sans crossOrigin');
        // Si l'image ne peut pas être chargée avec crossOrigin, réessayer sans
        if (!isLocalUrl && img.crossOrigin === 'anonymous') {
          img.crossOrigin = '';
          img.src = imageUrl;
        }
      };
      
      if (img.complete) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = handleError;
      }
    }
  }, [imageUrl, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const cropWidth = containerWidth * 0.8;
    const cropHeight = cropWidth / aspectRatio;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limiter le déplacement pour garder l'image dans le cadre
    const maxX = containerWidth - cropWidth;
    const maxY = containerHeight - cropHeight;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const getCropArea = () => {
    if (!containerRef.current) return { width: 0, height: 0, x: 0, y: 0 };
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const cropWidth = containerWidth * 0.8;
    const cropHeight = cropWidth / aspectRatio;
    
    return {
      width: cropWidth,
      height: cropHeight,
      x: position.x,
      y: position.y,
    };
  };

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const cropArea = getCropArea();
    
    // Calculer les dimensions réelles de l'image dans le conteneur
    const displayWidth = img.naturalWidth * scale;
    const displayHeight = img.naturalHeight * scale;
    
    // Calculer la zone de recadrage relative à l'image originale
    const cropX = (cropArea.x - position.x) / scale;
    const cropY = (cropArea.y - position.y) / scale;
    const cropWidth = cropArea.width / scale;
    const cropHeight = cropArea.height / scale;
    
    // S'assurer que les coordonnées sont valides
    const sourceX = Math.max(0, Math.min(img.naturalWidth, cropX));
    const sourceY = Math.max(0, Math.min(img.naturalHeight, cropY));
    const sourceWidth = Math.max(1, Math.min(img.naturalWidth - sourceX, cropWidth));
    const sourceHeight = Math.max(1, Math.min(img.naturalHeight - sourceY, cropHeight));
    
    // Définir la taille du canvas
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    
    // Dessiner l'image recadrée
    const ctx = canvas.getContext("2d");
    if (ctx) {
      try {
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        
        // Convertir en blob puis en File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `cropped-${Date.now()}.jpg`, {
                type: "image/jpeg",
              });
              onCrop(file);
            }
          },
          "image/jpeg",
          0.9
        );
      } catch (error) {
        console.error('❌ Erreur lors du recadrage (canvas tainted):', error);
        // Si le canvas est "tainted", créer une nouvelle image à partir de l'URL originale
        // et la recadrer côté serveur ou utiliser une approche alternative
        alert(
          locale === "fr"
            ? "Impossible de recadrer cette image (problème de sécurité CORS). Veuillez utiliser une image locale."
            : "Cannot crop this image (CORS security issue). Please use a local image."
        );
      }
    }
  };

  const cropArea = getCropArea();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-black/10">
          <h2 className="text-lg font-semibold">
            {locale === "fr" ? "Recadrer l'image" : "Crop image"}
          </h2>
          <p className="text-sm text-black/60 mt-1">
            {locale === "fr"
              ? "Ajustez la position et la taille, puis cliquez sur 'Appliquer'"
              : "Adjust position and size, then click 'Apply'"}
          </p>
        </div>
        
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-100"
          style={{ minHeight: "400px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Image à recadrer"
            crossOrigin={imageUrl.startsWith('blob:') || imageUrl.startsWith('data:') ? undefined : 'anonymous'}
            className="absolute"
            style={{
              width: `${imageSize.width * scale}px`,
              height: `${imageSize.height * scale}px`,
              position: "absolute",
              left: `${position.x}px`,
              top: `${position.y}px`,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            draggable={false}
            onMouseDown={handleMouseDown}
          />
          
          {/* Zone de recadrage */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10"
            style={{
              width: `${cropArea.width}px`,
              height: `${cropArea.height}px`,
              left: `${cropArea.x}px`,
              top: `${cropArea.y}px`,
              pointerEvents: "none",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-xs font-semibold">
              {locale === "fr" ? "Zone de recadrage" : "Crop area"}
            </div>
          </div>
          
          {/* Overlay sombre autour de la zone de recadrage */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to right, 
                rgba(0,0,0,0.5) 0%, 
                rgba(0,0,0,0.5) ${(cropArea.x / (containerRef.current?.clientWidth || 1)) * 100}%, 
                transparent ${(cropArea.x / (containerRef.current?.clientWidth || 1)) * 100}%, 
                transparent ${((cropArea.x + cropArea.width) / (containerRef.current?.clientWidth || 1)) * 100}%, 
                rgba(0,0,0,0.5) ${((cropArea.x + cropArea.width) / (containerRef.current?.clientWidth || 1)) * 100}%, 
                rgba(0,0,0,0.5) 100%),
                linear-gradient(to bottom, 
                rgba(0,0,0,0.5) 0%, 
                rgba(0,0,0,0.5) ${(cropArea.y / (containerRef.current?.clientHeight || 1)) * 100}%, 
                transparent ${(cropArea.y / (containerRef.current?.clientHeight || 1)) * 100}%, 
                transparent ${((cropArea.y + cropArea.height) / (containerRef.current?.clientHeight || 1)) * 100}%, 
                rgba(0,0,0,0.5) ${((cropArea.y + cropArea.height) / (containerRef.current?.clientHeight || 1)) * 100}%, 
                rgba(0,0,0,0.5) 100%)`,
            }}
          />
        </div>
        
        <div className="p-4 border-t border-black/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <span>{locale === "fr" ? "Zoom:" : "Zoom:"}</span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs text-black/60 w-12">{(scale * 100).toFixed(0)}%</span>
              </label>
              <button
                onClick={() => setScale(1)}
                className="px-3 py-1 text-xs rounded border border-black/15 bg-white hover:bg-black/5"
              >
                {locale === "fr" ? "Réinitialiser" : "Reset"}
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-black/15 bg-white hover:bg-black/5 transition-colors"
              >
                {locale === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleCrop}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-semibold"
              >
                {locale === "fr" ? "Appliquer" : "Apply"}
              </button>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-black/60 space-y-1">
            <p>
              {locale === "fr"
                ? "💡 Utilisez la molette de la souris pour zoomer, cliquez-glissez pour repositionner"
                : "💡 Use mouse wheel to zoom, click-drag to reposition"}
            </p>
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
