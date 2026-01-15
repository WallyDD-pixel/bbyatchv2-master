/**
 * Utilitaire pour obtenir l'URL de base correcte pour les redirections
 * Évite les redirections vers localhost en production
 */
export function getBaseUrl(req: Request): string {
  // En production/préprod, utiliser l'environnement ou l'origine de la requête
  const envUrl = (process.env as any).APP_BASE_URL || (process.env as any).NEXTAUTH_URL;
  if (envUrl) return envUrl;
  
  try {
    const url = new URL(req.url);
    return url.origin;
  } catch {
    // Fallback pour les cas où on ne peut pas parser l'URL
    return "";
  }
}

/**
 * Crée une URL de redirection correcte
 * Utilise une redirection relative si possible pour éviter les problèmes de domaine
 */
export function createRedirectUrl(path: string, req: Request): string {
  // Utiliser une redirection relative si le path commence déjà par /
  if (path.startsWith('/')) {
    // En développement, on peut utiliser l'URL absolue
    // En production, on peut aussi utiliser une redirection relative
    const baseUrl = getBaseUrl(req);
    // Si on a une baseUrl valide et qu'on n'est pas en localhost, utiliser l'URL absolue
    if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      return `${baseUrl}${path}`;
    }
  }
  // Sinon, retourner le path tel quel (redirection relative)
  return path;
}






