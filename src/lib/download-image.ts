/**
 * Télécharge une image depuis une URL externe et la stocke dans Supabase Storage
 * Utile pour télécharger des images depuis Unsplash, Pinterest, etc.
 * 
 * SÉCURITÉ: Validation stricte pour prévenir les attaques par injection
 */

import { uploadToSupabase } from './storage';
import { compressImageServer } from './image-compression-server';

export interface DownloadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Liste blanche de domaines autorisés pour le téléchargement d'images (optionnel)
// Si vide, tous les domaines HTTPS sont autorisés (moins sécurisé)
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  'i.pinimg.com',
  'pinterest.com',
  '*.supabase.co', // Pour les images déjà sur Supabase
];

// Magic bytes pour valider que c'est vraiment une image
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a ou GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (les 4 premiers bytes)
};

/**
 * Vérifie si un buffer correspond à une signature d'image valide
 */
function validateImageSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) return false;
  
  return signatures.some(sig => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Vérifie si un domaine est autorisé
 */
function isDomainAllowed(hostname: string): boolean {
  // Si la liste est vide, autoriser tous les domaines HTTPS (moins sécurisé mais plus flexible)
  if (ALLOWED_DOMAINS.length === 0) return true;
  
  return ALLOWED_DOMAINS.some(domain => {
    if (domain.startsWith('*.')) {
      const baseDomain = domain.slice(2);
      return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
    }
    return hostname === domain;
  });
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
    // Sanitiser l'URL : enlever les caractères dangereux
    const sanitizedUrl = imageUrl.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Valider l'URL
    let url: URL;
    try {
      url = new URL(sanitizedUrl);
    } catch {
      return {
        success: false,
        error: 'URL invalide',
      };
    }

    // Vérifier que c'est bien une URL HTTP/HTTPS (pas file://, data:, javascript:, etc.)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        success: false,
        error: 'Seules les URLs HTTP/HTTPS sont autorisées',
      };
    }

    // Vérifier que le domaine est autorisé (si liste blanche configurée)
    if (!isDomainAllowed(url.hostname)) {
      return {
        success: false,
        error: `Le domaine ${url.hostname} n'est pas autorisé pour le téléchargement d'images`,
      };
    }

    // Bloquer les URLs avec des caractères suspects dans le path
    if (url.pathname.includes('..') || url.pathname.includes('//') || url.pathname.includes('\\')) {
      return {
        success: false,
        error: 'URL suspecte détectée',
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

    // SÉCURITÉ CRITIQUE: Valider les magic bytes pour s'assurer que c'est vraiment une image
    // Cela empêche l'exécution de scripts malveillants déguisés en images
    if (!validateImageSignature(buffer, contentType)) {
      console.error(`❌ Signature d'image invalide pour ${contentType}. Magic bytes ne correspondent pas.`);
      return {
        success: false,
        error: `Le fichier téléchargé n'est pas une image valide (signature invalide pour ${contentType})`,
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
    
    // Polyfill pour File dans Node.js 18 (File n'est disponible qu'en Node.js 20+)
    // Créer un objet File-like compatible avec FormData
    const fileLike = Object.assign(blob, {
      name: secureFileName,
      lastModified: timestamp,
    });
    
    // Ajouter la méthode arrayBuffer si elle n'existe pas déjà
    if (!fileLike.arrayBuffer) {
      fileLike.arrayBuffer = () => blob.arrayBuffer();
    }
    
    const file = fileLike as File;

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
