/**
 * Rate limiting simple en mémoire
 * Pour la production, utiliser @upstash/ratelimit ou Redis
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limiting simple
 * @param identifier Identifiant unique (IP, email, etc.)
 * @param maxRequests Nombre maximum de requêtes
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns true si la requête est autorisée, false sinon
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;

  // Nettoyer les entrées expirées (garbage collection simple)
  if (Object.keys(store).length > 10000) {
    // Nettoyer toutes les entrées expirées si le store devient trop grand
    for (const k in store) {
      if (store[k].resetAt < now) {
        delete store[k];
      }
    }
  }

  const entry = store[key];

  if (!entry || entry.resetAt < now) {
    // Nouvelle fenêtre
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Obtenir l'IP du client depuis la requête
 */
export function getClientIP(req: Request): string {
  // Vérifier les headers de proxy
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (ne devrait jamais arriver en production avec un reverse proxy)
  return 'unknown';
}

/**
 * Rate limiting pour les endpoints d'authentification
 */
export function checkAuthRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return checkRateLimit(`auth:${ip}`, 5, 15 * 60 * 1000); // 5 tentatives par 15 minutes
}

/**
 * Rate limiting pour les inscriptions
 */
export function checkSignupRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return checkRateLimit(`signup:${ip}`, 3, 60 * 60 * 1000); // 3 inscriptions par heure
}

/**
 * Rate limiting pour les formulaires de contact
 */
export function checkContactRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  return checkRateLimit(`contact:${ip}`, 10, 60 * 60 * 1000); // 10 messages par heure
}
