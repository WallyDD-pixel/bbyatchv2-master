"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function SignInFormClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    setLoadingStep("Connexion en cours...");
    
    try {
      const supabase = createClient();
      
      // Essayer de se connecter avec Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // Si l'utilisateur n'existe pas dans Supabase, créer le compte via l'API
        if (signInError.message.includes('Invalid login credentials')) {
          setLoadingStep("Création du compte...");
          const res = await fetch("/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
          });

          if (!res.ok) {
            const errorData = await res.json();
            setError(errorData.error || "Identifiants invalides.");
            setLoadingStep(null);
            setLoading(false);
            return;
          }

          // Après création, se reconnecter
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (retryError) {
            setError("Erreur lors de la connexion.");
            setLoadingStep(null);
            setLoading(false);
            return;
          }
        } else {
          setError(signInError.message || "Identifiants invalides.");
          setLoadingStep(null);
          setLoading(false);
          return;
        }
      }

      setLoadingStep("Récupération du profil...");
      
      // Récupérer le rôle depuis l'API profile
      let role = "user";
      try {
        const profileRes = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
        });
        const profileData = await profileRes.json();
        if (profileData?.user?.role) {
          role = profileData.user.role;
        }
      } catch (e) {
        console.error("❌ Profile fetch error:", e);
      }

      setLoadingStep("Redirection en cours...");
      
      // Attendre un peu pour que les cookies soient synchronisés
      await new Promise((r) => setTimeout(r, 500));

      // Rediriger selon le rôle
      if (role === "admin") {
        window.location.href = "/admin";
      } else if (role === "agency") {
        window.location.href = "/agency";
      } else {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error("❌ Sign in error:", err);
      setError("Impossible de se connecter pour le moment.");
      setLoadingStep(null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1d242e] rounded-2xl border border-black/10 dark:border-[#2c3948] shadow-md overflow-hidden">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-extrabold text-black/90 dark:text-slate-100">Se connecter</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-slate-400">Accédez à votre tableau de bord et à vos réservations.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm mb-1 text-black/80 dark:text-slate-300" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="w-full h-11 rounded-lg border border-black/15 dark:border-[#2c3948] bg-white dark:bg-[#1f2732] px-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30 text-black dark:text-slate-100 placeholder:text-black/40 dark:placeholder:text-slate-500"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-black/80 dark:text-slate-300" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full h-11 rounded-lg border border-black/15 dark:border-[#2c3948] bg-white dark:bg-[#1f2732] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30 text-black dark:text-slate-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 my-1 px-2 rounded-md text-xs text-black/70 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
              <div className="mt-1 text-right">
                <a href="#" className="text-xs text-[color:var(--primary)] hover:underline">Mot de passe oublié ?</a>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-600/10 border border-red-100 dark:border-red-600/30 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              disabled={loading || !email || !password}
              type="submit"
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: loading || !email || !password ? '#93c5fd' : '#2563eb' }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>{loadingStep || "Connexion en cours..."}</span>
                </>
              ) : (
                "Connexion"
              )}
            </button>

            <div className="mt-6 text-sm text-black/70 dark:text-slate-400">
              <span>Pas de compte ? </span>
              <a href="/signup" className="text-[color:var(--primary)] font-medium hover:underline">Créer un compte</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
