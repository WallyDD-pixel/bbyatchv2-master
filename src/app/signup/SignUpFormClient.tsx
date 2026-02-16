"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function SignUpFormClient() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || searchParams.get("callbackUrl") || "/dashboard";
  
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
  // Erreurs spécifiques par champ
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirm?: string;
    accept?: string;
  }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    let isValid = true;

    // Validation prénom
    if (!firstName || !firstName.trim()) {
      errors.firstName = "Le prénom est requis.";
      isValid = false;
    }

    // Validation nom
    if (!lastName || !lastName.trim()) {
      errors.lastName = "Le nom est requis.";
      isValid = false;
    }

    // Validation email
    if (!email || !email.trim()) {
      errors.email = "L'email est requis.";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Format d'email invalide.";
      isValid = false;
    }

    // Validation mot de passe
    if (!password) {
      errors.password = "Le mot de passe est requis.";
      isValid = false;
    } else {
      if (password.length < 12) {
        errors.password = "Le mot de passe doit contenir au moins 12 caractères.";
        isValid = false;
      } else if (!/[A-Z]/.test(password)) {
        errors.password = "Le mot de passe doit contenir au moins une majuscule.";
        isValid = false;
      } else if (!/[a-z]/.test(password)) {
        errors.password = "Le mot de passe doit contenir au moins une minuscule.";
        isValid = false;
      } else if (!/\d/.test(password)) {
        errors.password = "Le mot de passe doit contenir au moins un chiffre.";
        isValid = false;
      }
    }

    // Validation confirmation mot de passe
    if (!confirm) {
      errors.confirm = "Veuillez confirmer le mot de passe.";
      isValid = false;
    } else if (password !== confirm) {
      errors.confirm = "Les mots de passe ne correspondent pas.";
      isValid = false;
    }

    // Validation acceptation conditions
    if (!accept) {
      errors.accept = "Veuillez accepter les conditions générales.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null);
    setErr(null);
    setFieldErrors({});
    
    // Validation côté client
    if (!validate()) {
      return;
    }
    
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
      if (res.ok) {
        setOk("Compte créé avec succès !");
        setLoading(true);
        
        // Connecter automatiquement l'utilisateur après inscription
        try {
          const supabase = createClient();
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            console.error("Erreur lors de la connexion automatique:", signInError);
            // Si la connexion automatique échoue, rediriger vers la page de connexion avec callbackUrl
            setTimeout(() => {
              window.location.href = `/signin?callbackUrl=${encodeURIComponent(redirectUrl)}`;
            }, 1500);
          } else {
            // Connexion réussie, rediriger vers la page de retour (panier / checkout)
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 500);
          }
        } catch (connectErr) {
          console.error("Erreur lors de la connexion automatique:", connectErr);
          // En cas d'erreur, rediriger vers la page de connexion
          setTimeout(() => {
            window.location.href = `/signin?callbackUrl=${encodeURIComponent(redirectUrl)}`;
          }, 1500);
        }
      } else {
        const j = await res.json().catch(() => ({}));
        const errors: typeof fieldErrors = {};
        
        // Mapper les erreurs API vers les champs correspondants
        if (j?.error === "exists") {
          errors.email = "Un compte existe déjà avec cet email.";
        } else if (j?.error === "missing") {
          if (!email) errors.email = "L'email est requis.";
          if (!password) errors.password = "Le mot de passe est requis.";
        } else if (j?.error === "invalid_email") {
          errors.email = j?.details || "Format d'email invalide.";
        } else if (j?.error === "weak_password") {
          errors.password = j?.details || "Le mot de passe est trop faible. " + (j?.suggestions?.join(" ") || "");
        } else if (j?.error === "invalid_name") {
          if (j?.details?.toLowerCase().includes("prénom") || j?.details?.toLowerCase().includes("firstname")) {
            errors.firstName = j?.details || "Prénom invalide.";
          } else {
            errors.lastName = j?.details || "Nom invalide.";
          }
        } else if (j?.error === "invalid_phone") {
          errors.phone = j?.details || "Format de téléphone invalide. Utilisez le format international (+33...) ou français (06...).";
        } else {
          // Erreur générale si on ne peut pas la mapper à un champ spécifique
          setErr(j?.error || "Erreur lors de l'inscription");
        }
        
        setFieldErrors(errors);
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
            <input 
              className={`${inputCls} ${fieldErrors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`} 
              value={firstName} 
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) {
                  setFieldErrors(prev => ({ ...prev, firstName: undefined }));
                }
              }} 
            />
            {fieldErrors.firstName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input 
              className={`${inputCls} ${fieldErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`} 
              value={lastName} 
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) {
                  setFieldErrors(prev => ({ ...prev, lastName: undefined }));
                }
              }} 
            />
            {fieldErrors.lastName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input 
              type="email" 
              className={`${inputCls} ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`} 
              value={email} 
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: undefined }));
                }
              }} 
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Téléphone <span className="text-black/40 text-xs">(optionnel)</span></label>
            <input 
              type="tel" 
              className={`${inputCls} ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : ''}`} 
              value={phone} 
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) {
                  setFieldErrors(prev => ({ ...prev, phone: undefined }));
                }
              }} 
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
            )}
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
              <input 
                type={showPassword ? "text" : "password"} 
                className={`${inputCls} pr-10 ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`} 
                value={password} 
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }
                }} 
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-2 my-1 px-2 rounded-md text-xs text-black/70 hover:bg-black/5">
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
            <div className="mt-1 h-1 rounded bg-black/10">
              <div className={`h-1 rounded transition-all ${
                password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
                  ? "bg-green-500" 
                  : password.length >= 8 
                    ? "bg-yellow-500" 
                    : "bg-red-500"
              }`} style={{ width: `${Math.min(100, (password.length / 12) * 100)}%` }} />
            </div>
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-black/50">
                Minimum 12 caractères, avec majuscule, minuscule et chiffre
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmer le mot de passe</label>
            <input 
              type="password" 
              className={`${inputCls} ${fieldErrors.confirm ? 'border-red-500 focus:ring-red-500' : ''}`} 
              value={confirm} 
              onChange={(e) => {
                setConfirm(e.target.value);
                if (fieldErrors.confirm) {
                  setFieldErrors(prev => ({ ...prev, confirm: undefined }));
                }
              }} 
            />
            {fieldErrors.confirm && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm}</p>
            )}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input 
              type="checkbox" 
              className="size-4" 
              checked={accept} 
              onChange={(e) => {
                setAccept(e.target.checked);
                if (fieldErrors.accept) {
                  setFieldErrors(prev => ({ ...prev, accept: undefined }));
                }
              }} 
            />
            J'accepte les <a className="text-[color:var(--primary)] hover:underline" href="#">conditions générales</a>
          </label>
          {fieldErrors.accept && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.accept}</p>
          )}
        </div>

        {ok && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">{ok}</p>}
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{err}</p>}

        <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50">{loading ? "Inscription…" : "Inscription"}</button>

        <p className="text-sm text-black/70">Vous avez déjà un compte ? <a className="text-[color:var(--primary)] hover:underline" href={`/signin?callbackUrl=${encodeURIComponent(redirectUrl)}`}>Se connecter</a></p>
      </form>
    </div>
  );
}
