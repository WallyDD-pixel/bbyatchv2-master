/**
 * Compression d'images - Réexportations
 * 
 * Ce fichier réexporte les fonctions de compression depuis les fichiers spécialisés
 * pour maintenir la compatibilité avec le code existant.
 */

// Réexport depuis le fichier client (pas de dépendances serveur)
export { compressImageClient, type CompressionOptions } from './image-compression-client';

// Réexport depuis le fichier serveur (uniquement pour les routes API)
// ⚠️ Ne pas importer compressImageServer dans un composant client !
export { compressImageServer } from './image-compression-server';
