"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  role?: string | null;
};

export default function UserEditClient({ user, locale }: { user: User; locale: "fr" | "en" }) {
  const router = useRouter();
  const [form, setForm] = useState<User>({ ...user });
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    fr: {
      save: "Enregistrer",
      saving: "Enregistrement…",
      updated: "Mise à jour effectuée",
      failed: "Échec",
      reset: "Réinitialiser le mot de passe",
      resetting: "Réinitialisation…",
      deleted: "Utilisateur supprimé",
      delete: "Supprimer l'utilisateur",
    },
    en: {
      save: "Save",
      saving: "Saving…",
      updated: "Updated",
      failed: "Failed",
      reset: "Reset password",
      resetting: "Resetting…",
      deleted: "User deleted",
      delete: "Delete user",
    },
  }[locale];

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) throw new Error("bad");
      router.refresh();
      alert(t.updated);
    } catch (e) {
      alert(t.failed);
    } finally {
      setLoading(false);
    }
  };

  const onResetPwd = async () => {
    if (!pwd) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) throw new Error("bad");
      setPwd("");
      alert(t.updated);
    } catch (e) {
      alert(t.failed);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad");
      alert(t.deleted);
      window.location.href = "/admin/users";
    } catch (e) {
      alert(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input name="email" value={form.email} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Nom affiché</label>
          <input name="name" value={form.name || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Prénom</label>
          <input name="firstName" value={form.firstName || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Nom</label>
          <input name="lastName" value={form.lastName || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Téléphone</label>
          <input name="phone" value={form.phone || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Adresse</label>
          <input name="address" value={form.address || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Ville</label>
          <input name="city" value={form.city || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Code postal</label>
          <input name="zip" value={form.zip || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Pays</label>
          <input name="country" value={form.country || ""} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3" />
        </div>
        <div>
          <label className="block text-sm mb-1">Rôle</label>
          <select name="role" value={form.role || "user"} onChange={onChange} className="w-full h-10 rounded-md border border-black/15 px-3">
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="agency">agence</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white h-11 px-6 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow" style={{ backgroundColor: loading ? '#60a5fa' : '#2563eb' }}>
          {loading ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDelete} disabled={loading} className="inline-flex items-center rounded-full bg-red-600 text-white h-10 px-4">
          {t.delete}
        </button>
      </div>

      <div className="pt-6 border-t border-black/10 mt-6">
        <label className="block text-sm mb-1">{t.reset}</label>
        <div className="flex gap-2">
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full h-10 rounded-md border border-black/15 px-3" />
          <button type="button" onClick={onResetPwd} disabled={loading || !pwd} className="inline-flex items-center rounded-full border border-black/15 bg-white h-10 px-4 hover:bg-black/5">
            {loading ? t.resetting : t.reset}
          </button>
        </div>
      </div>
    </form>
  );
}
