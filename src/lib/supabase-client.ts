'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalizeEnvValue(v: string | undefined) {
  // Next injecte parfois des valeurs entourées de guillemets. On les enlève pour les checks.
  return (v ?? '').trim().replace(/^"+|"+$/g, '');
}

const normalizedUrl = normalizeEnvValue(url);
const normalizedAnonKey = normalizeEnvValue(anonKey);

// Si la clé est tronquée, le client retombe sur placeholder et les requêtes auth échouent.
export const supabaseClientReady =
  normalizedUrl.length > 0 &&
  normalizedAnonKey.length > 10 &&
  normalizedAnonKey !== '...' &&
  !normalizedAnonKey.includes('...');

export const supabaseClientEnvDebug = {
  urlPresent: normalizedUrl.length > 0,
  anonPresent: normalizedAnonKey.length > 0,
  anonLen: normalizedAnonKey.length,
  anonHasEllipsis: normalizedAnonKey.includes('...'),
};

export function createClient() {
  // Ne jamais casser l'UI : en cas d'env manquantes/tronquées,
  // on garde un client "placeholder" et l'erreur apparaîtra sur les appels réseau.
  if (!supabaseClientReady) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY manquantes ou tronquées. Remplace la clé complète dans .env."
      );
    }
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient(normalizeEnvValue(url), normalizeEnvValue(anonKey));
}
