"use client";
import { useState } from "react";

export default function SignUpFormClient() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("France");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accept, setAccept] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!firstName || !lastName) return "Renseignez nom et prénom.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email invalide.";
    if (password.length < 6) return "Mot de passe trop court (min 6).";
    if (password !== confirm) return "Les mots de passe ne correspondent pas.";
    if (!accept) return "Veuillez accepter les conditions.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null); setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, password,
          phone, address, city, zip, country,
        }),
      });
      if (res.ok) setOk("Compte créé. Vous pouvez vous connecter.");
      else {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error === "exists" ? "Un compte existe déjà avec cet email." : "Erreur lors de l'inscription");
      }
    } catch (e) {
      setErr("Impossible d'inscrire pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-11 rounded-lg border border-black/15 px-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30";

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl border border-black/10 p-6 shadow-md">
      <h1 className="text-2xl font-extrabold">Créer un compte</h1>
      <p className="mt-1 text-sm text-black/60">Renseignez vos informations pour réserver plus rapidement.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Prénom</label>
            <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Téléphone</label>
            <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Adresse</label>
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Ville</label>
            <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Code postal</label>
            <input className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Pays</label>
            <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={`${inputCls} pr-10`} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-2 my-1 px-2 rounded-md text-xs text-black/70 hover:bg-black/5">
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
            <div className="mt-1 h-1 rounded bg-black/10">
              <div className="h-1 rounded bg-[color:var(--primary)] transition-all" style={{ width: `${Math.min(100, password.length * 15)}%` }} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmer le mot de passe</label>
            <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-black/70">
          <input type="checkbox" className="size-4" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          J'accepte les <a className="text-[color:var(--primary)] hover:underline" href="#">conditions générales</a>
        </label>

        {ok && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">{ok}</p>}
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{err}</p>}

        <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[color:var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50">{loading ? "Inscription…" : "Inscription"}</button>

        <p className="text-sm text-black/70">Vous avez déjà un compte ? <a className="text-[color:var(--primary)] hover:underline" href="/signin">Se connecter</a></p>
      </form>
    </div>
  );
}
