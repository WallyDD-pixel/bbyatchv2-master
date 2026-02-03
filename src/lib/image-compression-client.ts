/**
 * Compression d'images côté client (navigateur)
 * Utilise Canvas API pour redimensionner et compresser
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 pour JPEG/WebP
  maxSizeMB?: number; // Taille maximale cible en MB
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeMB: 2, // Taille maximale cible : 2MB
};

/**
 * Compresse une image côté client (navigateur)
 * Utilise Canvas API pour redimensionner et compresser
 */
export async function compressImageClient(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxSizeBytes = (opts.maxSizeMB || 2) * 1024 * 1024;

  // Si le fichier est déjà assez petit, retourner tel quel
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > (opts.maxWidth || 1920) || height > (opts.maxHeight || 1920)) {
          const ratio = Math.min(
            (opts.maxWidth || 1920) / width,
            (opts.maxHeight || 1920) / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Créer un canvas pour redimensionner et compresser
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en blob avec compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erreur lors de la compression'));
              return;
            }

            // Si le blob est encore trop gros, réduire la qualité progressivement
            if (blob.size > maxSizeBytes) {
              compressWithLowerQuality(canvas, maxSizeBytes, opts.quality || 0.85)
                .then((compressedBlob) => {
                  const compressedFile = new File(
                    [compressedBlob],
                    file.name,
                    { type: 'image/jpeg' } // Toujours convertir en JPEG pour meilleure compression
                  );
                  resolve(compressedFile);
                })
                .catch(reject);
            } else {
              const compressedFile = new File(
                [blob],
                file.name,
                { type: 'image/jpeg' }
              );
              resolve(compressedFile);
            }
          },
          'image/jpeg', // Toujours convertir en JPEG pour meilleure compression
          opts.quality || 0.85
        );
      };

      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresse avec une qualité réduite jusqu'à atteindre la taille cible
 */
async function compressWithLowerQuality(
  canvas: HTMLCanvasElement,
  maxSizeBytes: number,
  initialQuality: number
): Promise<Blob> {
  let quality = initialQuality;
  let blob: Blob | null = null;

  // Réduire la qualité progressivement jusqu'à atteindre la taille cible
  while (quality > 0.1) {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Erreur de compression'));
        },
        'image/jpeg',
        quality
      );
    });

    if (blob.size <= maxSizeBytes) {
      return blob;
    }

    quality -= 0.1;
  }

  // Si on n'a toujours pas atteint la taille, redimensionner encore
  if (blob && blob.size > maxSizeBytes) {
    const newWidth = Math.round(canvas.width * 0.8);
    const newHeight = Math.round(canvas.height * 0.8);
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = newWidth;
    newCanvas.height = newHeight;
    
    const ctx = newCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
      return compressWithLowerQuality(newCanvas, maxSizeBytes, 0.7);
    }
  }

  return blob || new Blob();
}
