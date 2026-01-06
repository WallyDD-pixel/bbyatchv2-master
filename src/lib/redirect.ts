/**
 * Utilitaire pour obtenir l'URL de base correcte pour les redirections
 * Évite les redirections vers localhost en production
 */
export function getBaseUrl(req: Request): string {
  return (
    (process.env as any).APP_BASE_URL ||
    (process.env as any).NEXTAUTH_URL ||
    "https://preprod.bbservicescharter.com" ||
    (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return "";
      }
    })()
  );
}

/**
 * Crée une URL de redirection correcte
 */
export function createRedirectUrl(path: string, req: Request): string {
  const baseUrl = getBaseUrl(req);
  return baseUrl ? `${baseUrl}${path}` : path;
}


