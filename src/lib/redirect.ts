/**
 * Utilitaire pour obtenir l'URL de base correcte pour les redirections
 * Évite les redirections vers localhost en production
 */
export function getBaseUrl(req: Request): string {
  // En production/préprod, utiliser l'environnement ou l'origine de la requête
  const envUrl = (process.env as any).APP_BASE_URL || (process.env as any).NEXTAUTH_URL;
  if (envUrl) return envUrl;
  
  // Vérifier les headers HTTP pour obtenir le vrai domaine (derrière proxy/nginx)
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const protocol = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  
  if (host) {
    // Ne pas utiliser localhost en production
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${protocol}://${host}`;
    }
  }
  
  try {
    const url = new URL(req.url);
    // Si l'URL contient localhost, essayer d'utiliser NEXTAUTH_URL en fallback
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const fallbackUrl = (process.env as any).NEXTAUTH_URL;
      if (fallbackUrl) return fallbackUrl;
    }
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
  // Toujours utiliser une redirection relative pour Next.js
  // Next.js gère automatiquement la construction de l'URL correcte
  if (path.startsWith('/')) {
    return path;
  }
  
  // Si le path n'est pas relatif, essayer de construire une URL absolue
  const baseUrl = getBaseUrl(req);
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
  
  // Fallback: retourner le path tel quel
  return path;
}






