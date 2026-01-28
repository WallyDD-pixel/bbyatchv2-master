"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignInFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      console.log("🔍 signIn response:", res);
      if (res?.error) {
        console.error("❌ signIn error:", res.error);
        setError("Identifiants invalides.");
      } else {
        console.log("✅ signIn success, checking session...");
        const getRole = async (): Promise<string | null> => {
          // 1) Tenter la session NextAuth
          try {
            const s = await fetch("/api/auth/session", { cache: "no-store" }).then((r) => r.json());
            console.log("🔍 Session response:", s);
            if (s?.user?.role) return s.user.role as string;
          } catch (e) {
            console.error("❌ Session fetch error:", e);
          }
          // 2) Fallback: endpoint profil (DB)
          try {
            const p = await fetch("/api/profile", { method: "GET" }).then((r) => r.json());
            console.log("🔍 Profile response:", p);
            if (p?.user?.role) return p.user.role as string;
          } catch (e) {
            console.error("❌ Profile fetch error:", e);
          }
          return null;
        };

        // Attendre un peu pour que les cookies soient définis
        await new Promise((r) => setTimeout(r, 500));
        
        // Petits retries pour laisser le temps au cookie/session de se propager
        let role: string | null = null;
        for (let i = 0; i < 5 && !role; i++) {
          console.log(`🔍 Tentative ${i + 1}/5 pour récupérer le rôle...`);
          role = await getRole();
          if (!role) {
            console.log(`⏳ Pas de rôle trouvé, attente...`);
            await new Promise((r) => setTimeout(r, 300));
          } else {
            console.log(`✅ Rôle trouvé: ${role}`);
          }
        }
        
        const finalRole = role || "user";
        console.log(`🎯 Rôle final: ${finalRole}, redirection...`);
        
        if (finalRole === "admin") {
          router.replace("/admin");
        } else {
          router.replace(callbackUrl);
        }
      }
    } catch (err) {
      setError("Impossible de se connecter pour le moment.");
    } finally {
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
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: loading || !email || !password ? '#93c5fd' : '#2563eb' }}
            >
              {loading ? "Connexion…" : "Connexion"}
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
