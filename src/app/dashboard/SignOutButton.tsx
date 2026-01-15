"use client";
import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  variant?: "light" | "dark";
  locale?: "fr" | "en";
}

export default function SignOutButton({ variant = "light", locale = "fr" }: SignOutButtonProps) {
  const isDark = variant === "dark";
  
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
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
