"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { userId: string; disabled?: boolean; locale: "fr" | "en" };

export default function UsersActionsClient({ userId, disabled, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const t = {
    fr: {
      deleting: "Suppression…",
      delete: "Supprimer",
      sure: "Êtes-vous sûr ? Cette action est irréversible.",
      deleted: "Utilisateur supprimé",
      failed: "Échec de l'opération",
    },
    en: {
      deleting: "Deleting…",
      delete: "Delete",
      sure: "Are you sure? This action cannot be undone.",
      deleted: "User deleted",
      failed: "Operation failed",
    },
  }[locale];

  const onDelete = async () => {
    if (disabled) return;
    if (!confirm(t.sure)) return;
    setLoading("delete");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad");
      // Optionally toast
      router.refresh();
    } catch (e) {
      alert(t.failed);
    } finally {
      setLoading(null);
    }
  };

  return (
    <button
      onClick={onDelete}
      disabled={disabled || !!loading}
      className="inline-flex items-center rounded-full bg-red-600 text-white text-xs h-8 px-3 hover:opacity-90 disabled:opacity-50"
    >
      {loading ? t.deleting : t.delete}
    </button>
  );
}
