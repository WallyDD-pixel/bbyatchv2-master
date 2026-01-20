"use client";
import { useState, useEffect } from "react";

export default function ProfileCardClient({ name, email, locale }: { name: string; email: string; locale: "fr" | "en" }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name, email, firstName: "", lastName: "", phone: "", address: "", city: "", zip: "", country: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Ouvrir la modale si l’URL contient #edit-profile
  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined" && window.location.hash === "#edit-profile") {
        setOpen(true);
      }
    };
    check();
    const onHash = () => check();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const close = () => {
    setOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#edit-profile") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) setMsg(locale === "fr" ? "Profil mis à jour." : "Profile updated.");
      else setMsg(locale === "fr" ? "Erreur lors de la mise à jour." : "Update failed.");
    } catch {
      setMsg(locale === "fr" ? "Erreur réseau." : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={() => setOpen(true)} className="w-full text-left rounded-xl border border-black/10 bg-white p-5 hover:bg-black/[0.03]">
        <h2 className="text-lg font-semibold">{locale === "fr" ? "Mes informations" : "My info"}</h2>
        <ul className="mt-2 text-sm text-black/70">
          <li>Email: {email}</li>
          <li>{locale === "fr" ? "Nom" : "Name"}: {name || "-"}</li>
          <li className="mt-1 text-[11px] text-black/50">{locale === "fr" ? "Cliquer pour modifier" : "Click to edit"}</li>
        </ul>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-black/10 p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{locale === "fr" ? "Modifier mon profil" : "Edit profile"}</h3>
            <form onSubmit={onSave} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm mb-1">{locale === "fr" ? "Nom" : "Name"}</label>
                <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">{locale === "fr" ? "Prénom" : "First name"}</label>
                  <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{locale === "fr" ? "Nom de famille" : "Last name"}</label>
                  <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">{locale === "fr" ? "Téléphone" : "Phone"}</label>
                <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">{locale === "fr" ? "Adresse" : "Address"}</label>
                <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">{locale === "fr" ? "Ville" : "City"}</label>
                  <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{locale === "fr" ? "Code postal" : "ZIP"}</label>
                  <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">{locale === "fr" ? "Pays" : "Country"}</label>
                <input className="w-full h-11 rounded-lg border border-black/15 px-3" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              {msg && <p className="text-xs text-black/70">{msg}</p>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="rounded-full h-9 px-4 border border-black/15 bg-white hover:bg-black/5" onClick={close}>
                  {locale === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button disabled={saving} type="submit" className="rounded-full h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                  {saving ? (locale === "fr" ? "Enregistrement…" : "Saving…") : (locale === "fr" ? "Enregistrer" : "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
