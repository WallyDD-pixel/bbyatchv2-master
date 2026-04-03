import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase pour les Route Handlers (POST /api/*) : pas de cookies().
 * Évite des Plantages / comportements instables avec `cookies()` de next/headers derrière nginx.
 */
export function createSupabaseApiClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
