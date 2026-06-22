import { NextResponse } from 'next/server';

/** Empêche le navigateur de servir une page HTML obsolète (chunks JS invalides). */
export function applyDocumentCacheHeaders(response: NextResponse) {
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Vary', 'Cookie');
  // Empêche la mise en cache des réponses d'erreur par les proxies / navigateurs
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Surrogate-Control', 'no-store');
}
