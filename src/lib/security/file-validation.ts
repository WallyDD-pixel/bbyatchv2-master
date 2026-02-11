/**
 * Validation de fichiers avec vérification des magic bytes
 * Protection contre les uploads de fichiers malveillants
 */

// Magic bytes pour différents types de fichiers
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a ou GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (les 4 premiers bytes, webp a RIFF...WEBP)
  'video/mp4': [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]], // ftyp atom
  'video/quicktime': [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]], // MOV = ftyp comme MP4
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
  'video/ogg': [[0x4F, 0x67, 0x67, 0x53]], // OggS
};

// Tailles maximales acceptées AVANT compression (en bytes)
// Les fichiers seront automatiquement compressés s'ils dépassent ces limites
const MAX_ACCEPTED_SIZES: Record<string, number> = {
  'image/jpeg': 20 * 1024 * 1024, // 20MB (sera compressé automatiquement à 2MB max)
  'image/png': 20 * 1024 * 1024, // 20MB (sera compressé automatiquement à 2MB max)
  'image/gif': 10 * 1024 * 1024, // 10MB (GIF animés peuvent être plus lourds)
  'image/webp': 20 * 1024 * 1024, // 20MB (sera compressé automatiquement à 2MB max)
  'video/mp4': 200 * 1024 * 1024, // 200MB (augmenté pour permettre des vidéos de meilleure qualité)
  'video/quicktime': 200 * 1024 * 1024, // 200MB (.mov)
  'video/webm': 200 * 1024 * 1024, // 200MB
  'video/ogg': 200 * 1024 * 1024, // 200MB
};

// Tailles maximales APRÈS compression (cibles)
const MAX_TARGET_SIZES: Record<string, number> = {
  'image/jpeg': 2 * 1024 * 1024, // 2MB après compression
  'image/png': 2 * 1024 * 1024, // 2MB après compression
  'image/gif': 5 * 1024 * 1024, // 5MB (GIF animés, compression limitée)
  'image/webp': 2 * 1024 * 1024, // 2MB après compression
  'video/mp4': 100 * 1024 * 1024, // 100MB après compression (si nécessaire)
  'video/quicktime': 100 * 1024 * 1024,
  'video/webm': 100 * 1024 * 1024, // 100MB après compression
  'video/ogg': 100 * 1024 * 1024, // 100MB après compression
};

// Pour compatibilité avec l'ancien code
const MAX_SIZES = MAX_ACCEPTED_SIZES;

// Types MIME autorisés
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

// Exporter les limites pour utilisation dans les composants
export { MAX_ACCEPTED_SIZES, MAX_TARGET_SIZES };

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

/**
 * Lit les premiers bytes d'un fichier pour vérifier les magic bytes
 */
async function readMagicBytes(file: File, length: number = 12): Promise<Uint8Array> {
  const blob = file.slice(0, length);
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Vérifie si les magic bytes correspondent au type MIME déclaré
 */
function checkMagicBytes(magicBytes: Uint8Array, mimeType: string): boolean {
  const expectedBytes = MAGIC_BYTES[mimeType];
  if (!expectedBytes) {
    // Si on ne connaît pas le type, on accepte (pour compatibilité)
    return true;
  }

  // Vérifier si les magic bytes correspondent à l'un des patterns attendus
  for (const pattern of expectedBytes) {
    if (magicBytes.length < pattern.length) continue;
    
    let matches = true;
    for (let i = 0; i < pattern.length; i++) {
      if (magicBytes[i] !== pattern[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) return true;
  }

  return false;
}

/**
 * Détecte le type MIME réel d'un fichier basé sur les magic bytes
 */
function detectMimeType(magicBytes: Uint8Array): string | null {
  for (const [mimeType, patterns] of Object.entries(MAGIC_BYTES)) {
    for (const pattern of patterns) {
      if (magicBytes.length < pattern.length) continue;
      
      let matches = true;
      for (let i = 0; i < pattern.length; i++) {
        if (magicBytes[i] !== pattern[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) return mimeType;
    }
  }
  return null;
}

/**
 * Valide un fichier image
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // Vérifier la taille
  if (file.size === 0) {
    return { valid: false, error: 'Fichier vide' };
  }

  // Vérifier le type MIME déclaré
  const declaredType = file.type || '';
  if (!ALLOWED_IMAGE_TYPES.includes(declaredType)) {
    return { valid: false, error: `Type MIME non autorisé: ${declaredType}` };
  }

  // Vérifier la taille maximale acceptée (avant compression)
  const maxAcceptedSize = MAX_ACCEPTED_SIZES[declaredType] || MAX_ACCEPTED_SIZES['image/jpeg'];
  if (file.size > maxAcceptedSize) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max accepté: ${(maxAcceptedSize / 1024 / 1024).toFixed(2)}MB). Veuillez réduire la taille du fichier avant l'upload.`,
    };
  }
  
  // Note: La compression automatique sera gérée côté client avant l'upload

  // Lire les magic bytes
  try {
    const magicBytes = await readMagicBytes(file, 12);
    
    // Détecter le type réel
    const detectedType = detectMimeType(magicBytes);
    
    // Vérifier que le type détecté correspond au type déclaré
    if (detectedType && detectedType !== declaredType) {
      return {
        valid: false,
        error: `Type MIME déclaré (${declaredType}) ne correspond pas au type réel (${detectedType})`,
        detectedType,
      };
    }

    // Vérifier les magic bytes
    if (!checkMagicBytes(magicBytes, declaredType)) {
      return {
        valid: false,
        error: `Magic bytes ne correspondent pas au type déclaré (${declaredType})`,
        detectedType: detectedType || 'inconnu',
      };
    }

    return { valid: true, detectedType: detectedType || declaredType };
  } catch (error) {
    return { valid: false, error: `Erreur lors de la lecture du fichier: ${error}` };
  }
}

/**
 * Valide un fichier vidéo
 */
export async function validateVideoFile(file: File): Promise<FileValidationResult> {
  // Vérifier la taille
  if (file.size === 0) {
    return { valid: false, error: 'Fichier vide' };
  }

  // Vérifier le type MIME déclaré
  const declaredType = file.type || '';
  if (!ALLOWED_VIDEO_TYPES.includes(declaredType)) {
    return { valid: false, error: `Type MIME non autorisé: ${declaredType}` };
  }

  // Vérifier la taille maximale acceptée (avant compression)
  const maxAcceptedSize = MAX_ACCEPTED_SIZES[declaredType] || MAX_ACCEPTED_SIZES['video/mp4'];
  if (file.size > maxAcceptedSize) {
    return {
      valid: false,
      error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max accepté: ${(maxAcceptedSize / 1024 / 1024).toFixed(2)}MB). Veuillez réduire la taille du fichier avant l'upload.`,
    };
  }
  
  // Note: La compression vidéo sera gérée côté serveur si nécessaire

  // Lire les magic bytes (plus pour les vidéos car elles peuvent avoir des headers plus longs)
  try {
    const magicBytes = await readMagicBytes(file, 16);
    
    // Détecter le type réel
    const detectedType = detectMimeType(magicBytes);
    // MP4 et QuickTime (.mov) partagent les mêmes magic bytes (ftyp)
    const equivalentVideo = (a: string, b: string) =>
      (a === 'video/mp4' && b === 'video/quicktime') || (a === 'video/quicktime' && b === 'video/mp4');

    // Vérifier que le type détecté correspond au type déclaré
    if (detectedType && detectedType !== declaredType && !equivalentVideo(detectedType, declaredType)) {
      return {
        valid: false,
        error: `Type MIME déclaré (${declaredType}) ne correspond pas au type réel (${detectedType})`,
        detectedType,
      };
    }

    // Vérifier les magic bytes (MOV utilise les mêmes que MP4)
    const typeToCheck = declaredType === 'video/quicktime' ? 'video/mp4' : declaredType;
    if (!checkMagicBytes(magicBytes, typeToCheck)) {
      return {
        valid: false,
        error: `Magic bytes ne correspondent pas au type déclaré (${declaredType})`,
        detectedType: detectedType || 'inconnu',
      };
    }

    return { valid: true, detectedType: detectedType || declaredType };
  } catch (error) {
    return { valid: false, error: `Erreur lors de la lecture du fichier: ${error}` };
  }
}

/**
 * Valide un fichier (image ou vidéo) de manière générique
 */
export async function validateFile(file: File, allowedTypes: string[]): Promise<FileValidationResult> {
  const isImage = ALLOWED_IMAGE_TYPES.some(type => allowedTypes.includes(type));
  const isVideo = ALLOWED_VIDEO_TYPES.some(type => allowedTypes.includes(type));

  if (isImage) {
    return await validateImageFile(file);
  } else if (isVideo) {
    return await validateVideoFile(file);
  } else {
    return { valid: false, error: 'Type de fichier non supporté' };
  }
}

/**
 * Génère un nom de fichier sécurisé
 */
export function generateSecureFileName(originalName: string, mimeType: string): string {
  // Extraire l'extension basée sur le type MIME
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
  };

  const ext = extMap[mimeType] || 'bin';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 10);
  
  // Nettoyer le nom original (enlever caractères dangereux)
  const cleanName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 50);

  return `${timestamp}-${randomStr}-${cleanName}.${ext}`;
}
