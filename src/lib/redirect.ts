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
 * Crée une URL de redirection correcte (absolue pour Next.js 15)
 * Next.js 15 exige des URLs absolues pour les redirections dans les routes API
 */
export function createRedirectUrl(path: string, req: Request): string {
  // Normaliser le path (ajouter / au début si absent)
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  // Priorité 1: Variable d'environnement APP_BASE_URL ou NEXTAUTH_URL
  const envUrl = (process.env as any).APP_BASE_URL || (process.env as any).NEXTAUTH_URL;
  if (envUrl) {
    // Nettoyer l'URL (enlever le / à la fin si présent)
    const cleanEnvUrl = envUrl.toString().replace(/\/$/, '');
    return `${cleanEnvUrl}${normalizedPath}`;
  }
  
  // Priorité 2: Construire depuis les headers HTTP (proxy/nginx)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') || 
                   (req.headers.get('x-forwarded-ssl') === 'on' ? 'https' : 'http');
  
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${protocol}://${host}${normalizedPath}`;
  }
  
  // Priorité 3: Essayer de parser req.url (peut être relatif dans Next.js)
  try {
    // Si req.url est déjà une URL absolue, l'utiliser
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      const url = new URL(req.url);
      return `${url.protocol}//${url.host}${normalizedPath}`;
    }
  } catch {
    // Ignorer si parsing échoue
  }
  
  // Dernier fallback: utiliser le host depuis les headers (même localhost)
  if (host) {
    return `${protocol}://${host}${normalizedPath}`;
  }
  
  // Dernier recours absolu (ne devrait jamais arriver en production)
  return `https://preprod.bbservicescharter.com${normalizedPath}`;
}






