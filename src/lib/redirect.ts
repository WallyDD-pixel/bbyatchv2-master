/**
 * URL publique sans requête (emails, cron) : préférer NEXT_PUBLIC_SITE_URL pour coller au domaine déployé.
 */
export function getPublicSiteUrlFromEnv(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return String(url).replace(/\/$/, '');
}

function normalizeSiteOrigin(url: string): string {
  return url.replace(/\/$/, '');
}

function tryParseOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return normalizeSiteOrigin(new URL(value).origin);
    }
    return normalizeSiteOrigin(new URL(`https://${value}`).origin);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * URL publique pour retours Stripe / liens utilisateur.
 * Priorité : origine explicite (client) → Origin → Referer → Host proxy → .env
 */
export function getPublicSiteUrl(req: Request, explicitOrigin?: string | null): string {
  const fromRequest: (string | null | undefined)[] = [
    explicitOrigin,
    req.headers.get('origin'),
  ];

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      fromRequest.push(new URL(referer).origin);
    } catch {
      /* ignore */
    }
  }

  for (const candidate of fromRequest) {
    const origin = tryParseOrigin(candidate);
    if (!origin) continue;
    try {
      const { hostname } = new URL(origin);
      if (!isLoopbackHost(hostname)) return origin;
      if (process.env.NODE_ENV !== 'production') return origin;
    } catch {
      /* ignore */
    }
  }

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const host = rawHost?.split(',')[0]?.trim();

  let protocol =
    (req.headers.get('x-forwarded-proto') || '').split(',')[0]?.trim() ||
    (req.headers.get('x-forwarded-ssl') === 'on' ? 'https' : '');

  if (!protocol) {
    try {
      protocol = new URL(req.url).protocol.replace(':', '');
    } catch {
      protocol = 'https';
    }
  }

  if (host && !isLoopbackHost(host.split(':')[0])) {
    return normalizeSiteOrigin(`${protocol}://${host}`);
  }

  return getPublicSiteUrlFromEnv();
}

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
 *
 * Important : utiliser en priorité le Host de la requête (localhost, préprod, etc.).
 * Si on force NEXTAUTH_URL alors que l’admin est ouvert sur localhost, le navigateur
 * suit la 303 vers un autre domaine → erreur CORS / fetch qui casse l’enregistrement.
 */
export function createRedirectUrl(path: string, req: Request): string {
  const normalizedPath = path.startsWith('/') ? path : '/' + path;

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const host = rawHost?.split(',')[0]?.trim();

  let protocol =
    (req.headers.get('x-forwarded-proto') || '').split(',')[0]?.trim() ||
    (req.headers.get('x-forwarded-ssl') === 'on' ? 'https' : '');

  if (!protocol) {
    try {
      const u = new URL(req.url);
      protocol = u.protocol.replace(':', '');
    } catch {
      protocol = 'http';
    }
  }

  if (host) {
    return `${protocol}://${host}${normalizedPath}`;
  }

  const envUrl = (process.env as any).APP_BASE_URL || (process.env as any).NEXTAUTH_URL;
  if (envUrl) {
    const cleanEnvUrl = envUrl.toString().replace(/\/$/, '');
    return `${cleanEnvUrl}${normalizedPath}`;
  }

  try {
    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
      const url = new URL(req.url);
      return `${url.protocol}//${url.host}${normalizedPath}`;
    }
  } catch {
    /* ignore */
  }

  const cleanFallback = getPublicSiteUrlFromEnv();
  return `${cleanFallback}${normalizedPath}`;
}






