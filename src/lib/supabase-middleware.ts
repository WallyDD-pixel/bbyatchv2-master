import { createServerClient } from '@supabase/ssr';
import type { AuthError } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { applyDocumentCacheHeaders } from '@/lib/document-cache';

const SUPABASE_COOKIE_PREFIX = 'sb-';
const AUTH_REFRESH_TIMEOUT_MS = 4000;

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX) && c.name.includes('auth')
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Anciens cookies NextAuth — peuvent entrer en conflit avec Supabase. */
const LEGACY_AUTH_COOKIE_PREFIXES = [
  'next-auth.',
  '__Secure-next-auth.',
  '__Host-next-auth.',
];

function expireCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/** Cookies Supabase auth invalides / expirés → évite de bloquer les visites suivantes. */
export function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith(SUPABASE_COOKIE_PREFIX) && name.includes('auth')) {
      expireCookie(response, name);
    }
  }
}

export function clearLegacyAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const { name } of request.cookies.getAll()) {
    if (LEGACY_AUTH_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      expireCookie(response, name);
    }
  }
}

/** Session expirée / cookies orphelins — comportement normal, pas de log. */
function isStaleSessionError(error: AuthError | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('session missing') || msg.includes('auth session missing');
}

/** Refresh impossible (token corrompu) — purge + log occasionnel. */
export function isIrrecoverableAuthError(error: AuthError | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('network')) return false;
  if (isStaleSessionError(error)) return false;
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid jwt') ||
    msg.includes('jwt malformed') ||
    msg.includes('session not found') ||
    msg.includes('invalid claim') ||
    msg.includes('token is expired') ||
    msg.includes('user not found')
  );
}

function finalizeDocumentResponse(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  applyDocumentCacheHeaders(response);
  clearLegacyAuthCookies(request, response);
  return response;
}

/**
 * Rafraîchit la session Supabase (pattern officiel @supabase/ssr).
 * getSession() d'abord (local) → getUser() seulement si session valide en cookie.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('...')) {
    return finalizeDocumentResponse(request, NextResponse.next({ request }));
  }

  // Visiteur sans cookie auth : pas d'appel Supabase
  if (!hasSupabaseAuthCookies(request)) {
    return finalizeDocumentResponse(request, NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, {
            ...options,
            path: options?.path ?? '/',
            secure: options?.secure ?? process.env.NODE_ENV === 'production',
          });
        });
      },
    },
  });

  try {
    // Lecture locale — pas d'appel réseau
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Cookies présents mais session illisible / expirée → purge silencieuse
    if (!session) {
      clearSupabaseAuthCookies(request, supabaseResponse);
      return finalizeDocumentResponse(request, supabaseResponse);
    }

    // Session en cookie → valider / rafraîchir côté serveur Supabase
    const result = await withTimeout(supabase.auth.getUser(), AUTH_REFRESH_TIMEOUT_MS);
    if (result === null) {
      // Timeout réseau : on laisse passer sans purger (session peut encore être valide)
      return finalizeDocumentResponse(request, supabaseResponse);
    }

    const { error } = result;
    if (!error) {
      return finalizeDocumentResponse(request, supabaseResponse);
    }

    if (isStaleSessionError(error) || isIrrecoverableAuthError(error)) {
      clearSupabaseAuthCookies(request, supabaseResponse);
      if (isIrrecoverableAuthError(error)) {
        console.warn('[middleware] Supabase auth purge:', error.message);
      }
    }
  } catch (err) {
    console.error('[middleware] Supabase auth error:', err);
  }

  return finalizeDocumentResponse(request, supabaseResponse);
}
