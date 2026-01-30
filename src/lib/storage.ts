import { supabase, STORAGE_BUCKET } from './supabase';
import { validateFile, generateSecureFileName, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from './security/file-validation';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload un fichier vers Supabase Storage avec validation de sécurité
 * @param file - Le fichier à uploader
 * @param folder - Dossier dans le bucket (optionnel, ex: 'images', 'videos')
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadToSupabase(
  file: File,
  folder: string = 'images'
): Promise<UploadResult | null> {
  try {
    // Déterminer les types autorisés selon le dossier
    const allowedTypes = folder.includes('video') 
      ? ALLOWED_VIDEO_TYPES 
      : ALLOWED_IMAGE_TYPES;

    // Validation de sécurité du fichier (magic bytes, taille, type)
    const validation = await validateFile(file, allowedTypes);
    if (!validation.valid) {
      console.error(`❌ File validation failed: ${validation.error}`);
      return null;
    }

    // Utiliser le type détecté ou déclaré
    const mimeType = validation.detectedType || file.type;

    // Générer un nom de fichier sécurisé
    const fileName = generateSecureFileName(file.name, mimeType);
    const filePath = `${folder}/${fileName}`;

    // Convertir le fichier en ArrayBuffer puis en Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload vers Supabase Storage
    console.log(`📤 Uploading to bucket: ${STORAGE_BUCKET}, path: ${filePath}, size: ${buffer.length} bytes, type: ${mimeType}`);
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false, // Ne pas écraser les fichiers existants
        cacheControl: '3600',
      });

    if (error) {
      console.error('❌ Error uploading to Supabase Storage:', error);
      console.error('  - Error code:', error.statusCode);
      console.error('  - Error message:', error.message);
      console.error('  - Bucket:', STORAGE_BUCKET);
      console.error('  - File path:', filePath);
      // Vérifier si le bucket existe
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.error('  - Cannot list buckets (permission issue?):', listError);
      } else {
        const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);
        console.error('  - Bucket exists:', bucketExists ? 'YES' : 'NO');
        if (buckets && buckets.length > 0) {
          console.error('  - Available buckets:', buckets.map(b => b.name).join(', '));
        }
      }
      return null;
    }

    // Obtenir l'URL publique du fichier
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error in uploadToSupabase:', error);
    return null;
  }
}

/**
 * Upload plusieurs fichiers vers Supabase Storage
 * Upload séquentiel pour éviter les problèmes de mémoire et de timeout
 * @param files - Tableau de fichiers à uploader
 * @param folder - Dossier dans le bucket (optionnel)
 * @returns Tableau des URLs publiques des fichiers uploadés
 */
export async function uploadMultipleToSupabase(
  files: File[],
  folder: string = 'images'
): Promise<string[]> {
  // Upload séquentiel pour éviter les problèmes de mémoire avec de gros fichiers
  const results: UploadResult[] = [];
  
  for (const file of files) {
    try {
      const result = await uploadToSupabase(file, folder);
      if (result) {
        results.push(result);
      } else {
        console.warn(`Failed to upload file: ${file.name}`);
      }
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      // Continue avec les autres fichiers même si un échoue
    }
  }
  
  return results.map(r => r.url);
}

/**
 * Supprimer un fichier de Supabase Storage
 * @param path - Chemin du fichier dans le bucket (ex: 'images/file.jpg')
 */
export async function deleteFromSupabase(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFromSupabase:', error);
    return false;
  }
}

/**
 * Extraire le chemin du fichier depuis une URL Supabase
 * @param url - URL publique du fichier
 * @returns Le chemin du fichier dans le bucket ou null
 */
export function extractPathFromSupabaseUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}


