"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center rounded-full border border-black/15 bg-white text-sm h-8 px-3 hover:bg-black/5"
    >
      Déconnexion
    </button>
  );
}
