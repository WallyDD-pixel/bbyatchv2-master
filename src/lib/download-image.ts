/**
 * Télécharge une image depuis une URL externe et la stocke dans Supabase Storage
 * Utile pour télécharger des images depuis Unsplash, Pinterest, etc.
 */

import { uploadToSupabase } from './storage';
import { compressImageServer } from './image-compression-server';

export interface DownloadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Télécharge une image depuis une URL externe
 * @param imageUrl - URL de l'image à télécharger
 * @param folder - Dossier de destination dans Supabase Storage
 * @returns URL de l'image téléchargée dans Supabase Storage
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  folder: string = 'homepage'
): Promise<DownloadImageResult> {
  try {
    // Valider l'URL
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return {
        success: false,
        error: 'URL invalide',
      };
    }

    // Vérifier que c'est bien une URL HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        success: false,
        error: 'Seules les URLs HTTP/HTTPS sont autorisées',
      };
    }

    // Télécharger l'image
    console.log(`📥 Téléchargement de l'image depuis: ${imageUrl}`);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BBYatch/1.0)',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur lors du téléchargement: ${response.status} ${response.statusText}`,
      };
    }

    // Vérifier le Content-Type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return {
        success: false,
        error: `Le fichier téléchargé n'est pas une image (type: ${contentType})`,
      };
    }

    // Vérifier la taille (limite à 10MB pour le téléchargement, puis compression)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeMB = parseInt(contentLength, 10) / 1024 / 1024;
      if (sizeMB > 10) {
        return {
          success: false,
          error: `Image trop volumineuse (${sizeMB.toFixed(2)}MB). Taille maximale: 10MB`,
        };
      }
    }

    // Lire le contenu de l'image
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Vérifier la taille réelle
    if (buffer.length > 10 * 1024 * 1024) {
      return {
        success: false,
        error: `Image trop volumineuse (${(buffer.length / 1024 / 1024).toFixed(2)}MB). Taille maximale: 10MB`,
      };
    }

    // Créer un File à partir du buffer
    // Extraire le nom de fichier de l'URL ou générer un nom unique
    const urlPath = imageUrl.split('?')[0]; // Enlever les query params
    const fileName = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Déterminer le type MIME
    let mimeType = contentType;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        avif: 'image/avif',
      };
      mimeType = mimeMap[fileExtension] || 'image/jpeg';
    }

    // Créer un Blob puis un File avec un nom sécurisé
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 10);
    const secureFileName = `downloaded-${timestamp}-${randomStr}.${fileExtension}`;
    
    const blob = new Blob([buffer], { type: mimeType });
    const file = new File([blob], secureFileName, { type: mimeType });

    // Compresser l'image si nécessaire (côté serveur)
    let fileToUpload = file;
    if (file.size > 2 * 1024 * 1024) { // Si > 2MB, compresser
      try {
        fileToUpload = await compressImageServer(file, {
          maxSizeMB: 2,
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
        console.log(`📦 Image compressée: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (compressionError) {
        console.warn('⚠️ Compression échouée, utilisation de l\'image originale');
      }
    }

    // Upload vers Supabase Storage
    console.log(`📤 Upload vers Supabase Storage...`);
    const result = await uploadToSupabase(fileToUpload, folder);

    if (!result) {
      return {
        success: false,
        error: 'Erreur lors de l\'upload vers Supabase Storage',
      };
    }

    console.log(`✅ Image téléchargée et stockée: ${result.url}`);
    return {
      success: true,
      url: result.url,
    };
  } catch (error: any) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    return {
      success: false,
      error: error?.message || 'Erreur inconnue lors du téléchargement',
    };
  }
}
