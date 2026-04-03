"use client";

import { useEffect } from "react";
import { createClient, supabaseClientReady } from "@/lib/supabase-client";
import { AUTH_SESSION_REFRESHED_EVENT } from "@/lib/auth-events";

/**
 * Après retour Stripe (navigation externe), le client singleton peut être désynchronisé
 * des cookies mis à jour par le middleware. Un refresh explicite réaligne l’état auth.
 */
export default function CheckoutSuccessSessionSync() {
  useEffect(() => {
    if (!supabaseClientReady) return;
    const supabase = createClient();
    void (async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        await supabase.auth.getSession();
      } finally {
        window.dispatchEvent(new Event(AUTH_SESSION_REFRESHED_EVENT));
      }
    })();
  }, []);

  return null;
}
