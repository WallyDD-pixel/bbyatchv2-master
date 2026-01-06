import { supabase, STORAGE_BUCKET } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload un fichier vers Supabase Storage
 * @param file - Le fichier à uploader
 * @param folder - Dossier dans le bucket (optionnel, ex: 'images', 'videos')
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadToSupabase(
  file: File,
  folder: string = 'images'
): Promise<UploadResult | null> {
  try {
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 8);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    // Convertir le fichier en ArrayBuffer puis en Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Vérifier la taille du fichier
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB vidéo, 5MB image
    if (buffer.length > maxSize) {
      console.error(`File too large: ${buffer.length} bytes (max: ${maxSize})`);
      return null;
    }

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Ne pas écraser les fichiers existants
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
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
 * @param files - Tableau de fichiers à uploader
 * @param folder - Dossier dans le bucket (optionnel)
 * @returns Tableau des URLs publiques des fichiers uploadés
 */
export async function uploadMultipleToSupabase(
  files: File[],
  folder: string = 'images'
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadToSupabase(file, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((r): r is UploadResult => r !== null).map(r => r.url);
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


