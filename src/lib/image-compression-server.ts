/**
 * Compression d'images côté serveur
 * Utilise Sharp si disponible, sinon retourne le fichier tel quel
 * 
 * ⚠️ Ce fichier ne doit JAMAIS être importé côté client
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
 * Compresse une image côté serveur (si Sharp est disponible)
 * Sinon, retourne le fichier tel quel
 */
export async function compressImageServer(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxSizeBytes = (opts.maxSizeMB || 2) * 1024 * 1024;

  // Si le fichier est déjà assez petit, retourner tel quel
  if (file.size <= maxSizeBytes) {
    return file;
  }

  // Essayer d'utiliser Sharp si disponible
  try {
    const sharp = await import('sharp');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Redimensionner et compresser avec Sharp
    const compressedBuffer = await sharp.default(buffer)
      .resize(opts.maxWidth || 1920, opts.maxHeight || 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: Math.round((opts.quality || 0.85) * 100) })
      .toBuffer();

    // Si encore trop gros, réduire la qualité
    let finalBuffer = compressedBuffer;
    let quality = Math.round((opts.quality || 0.85) * 100);

    while (finalBuffer.length > maxSizeBytes && quality > 10) {
      quality -= 10;
      finalBuffer = await sharp.default(buffer)
        .resize(opts.maxWidth || 1920, opts.maxHeight || 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
    }

    // Créer un nouveau File avec le buffer compressé
    // Convertir Buffer en Uint8Array pour compatibilité avec Blob
    const uint8Array = new Uint8Array(finalBuffer);
    const blob = new Blob([uint8Array], { type: 'image/jpeg' });
    
    // Polyfill pour File dans Node.js 18 (File n'est disponible qu'en Node.js 20+)
    // Créer un objet File-like compatible avec FormData
    const fileName = file.name.replace(/\.[^.]+$/, '.jpg');
    const fileLike = Object.assign(blob, {
      name: fileName,
      lastModified: Date.now(),
    });
    
    // Ajouter la méthode arrayBuffer si elle n'existe pas déjà
    if (!fileLike.arrayBuffer) {
      fileLike.arrayBuffer = () => blob.arrayBuffer();
    }
    
    return fileLike as File;
  } catch (error) {
    // Sharp n'est pas disponible, retourner le fichier tel quel
    // La validation côté client devrait avoir déjà compressé
    console.warn('Sharp non disponible, compression côté serveur ignorée');
    return file;
  }
}
