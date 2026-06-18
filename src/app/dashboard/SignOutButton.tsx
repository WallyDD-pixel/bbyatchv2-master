"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

interface SignOutButtonProps {
  variant?: "light" | "dark";
  locale?: "fr" | "en";
}

export default function SignOutButton({ variant = "light", locale = "fr" }: SignOutButtonProps) {
  const router = useRouter();
  const isDark = variant === "dark";

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`
        inline-flex items-center justify-center w-full gap-2 rounded-lg text-sm h-9 px-3 transition-colors
        ${isDark
          ? "text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
          : "border border-black/15 bg-white hover:bg-black/5"
        }
      `}
    >
      <span>🚪</span>
      <span>{locale === "en" ? "Sign out" : "Déconnexion"}</span>
    </button>
  );
}
