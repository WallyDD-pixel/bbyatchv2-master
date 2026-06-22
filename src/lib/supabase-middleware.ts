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

/** Ne purge les cookies que si le refresh est définitivement impossible. */
export function isIrrecoverableAuthError(error: AuthError | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('network')) return false;
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid jwt') ||
    msg.includes('jwt malformed') ||
    msg.includes('session missing') ||
    msg.includes('session not found') ||
    msg.includes('invalid claim') ||
    msg.includes('token is expired') ||
    msg.includes('user not found')
  );
}

/**
 * Rafraîchit la session Supabase (pattern officiel @supabase/ssr).
 * Sans sync request + response dans setAll, la 2e visite peut échouer.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('...')) {
    const response = NextResponse.next({ request });
    applyDocumentCacheHeaders(response);
    clearLegacyAuthCookies(request, response);
    return response;
  }

  // Visiteur sans session : pas d'appel réseau Supabase (évite timeouts → 502 nginx)
  if (!hasSupabaseAuthCookies(request)) {
    const response = NextResponse.next({ request });
    applyDocumentCacheHeaders(response);
    clearLegacyAuthCookies(request, response);
    return response;
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

  clearLegacyAuthCookies(request, supabaseResponse);

  try {
    const result = await withTimeout(supabase.auth.getUser(), AUTH_REFRESH_TIMEOUT_MS);
    if (result === null) {
      console.warn('[middleware] Supabase auth refresh timeout — continuing without purge');
    } else {
      const { error } = result;
      if (error && isIrrecoverableAuthError(error)) {
        console.warn('[middleware] Supabase auth purge:', error.message);
        clearSupabaseAuthCookies(request, supabaseResponse);
      }
    }
  } catch (err) {
    console.error('[middleware] Supabase auth error:', err);
  }

  applyDocumentCacheHeaders(supabaseResponse);
  return supabaseResponse;
}
