"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";

// Icônes SVG officielles des réseaux sociaux (uniformisées)
const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);


function AdminSocialMediaContent() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("fr");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    footerInstagram: "",
    footerFacebook: "",
  });

  useEffect(() => {
    // Lire la langue depuis l'URL sans useSearchParams pour éviter les problèmes de pré-rendu
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const lang = sp.get("lang");
      setLocale(lang === "en" ? "en" : "fr");
    }

    // Charger les paramètres
    fetch("/api/admin/homepage-settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setFormData({
          footerInstagram: data?.footerInstagram || "",
          footerFacebook: data?.footerFacebook || "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formDataToSend = new FormData();
    formDataToSend.append("footerInstagram", formData.footerInstagram);
    formDataToSend.append("footerFacebook", formData.footerFacebook);

    try {
      const response = await fetch("/api/admin/homepage-settings", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        router.push("/admin/social-media?success=1");
        router.refresh();
      } else {
        alert(locale === "fr" ? "Erreur lors de l'enregistrement" : "Error saving");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(locale === "fr" ? "Erreur lors de l'enregistrement" : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const t = messages[locale];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderBar initialLocale={locale} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-black/60">{locale === "fr" ? "Chargement..." : "Loading..."}</div>
        </main>
        <Footer locale={locale} t={t} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <Link href="/admin" className="mb-6 inline-block text-sm rounded-full border border-blue-400/30 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700">
          ← {locale === "fr" ? "Retour page d'accueil" : "Back to admin"}
        </Link>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Réseaux sociaux" : "Social Media"}</h1>
        </div>

        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow p-6 border border-blue-100">
          <h2 className="text-lg font-bold mb-2 text-blue-700">
            {locale === "fr" ? "Liens des réseaux sociaux" : "Social Media Links"}
          </h2>
          <p className="text-sm text-black/60 mb-6">
            {locale === "fr" 
              ? "Configurez les liens vers vos réseaux sociaux. Les icônes s'afficheront automatiquement dans le footer si un lien est renseigné."
              : "Configure links to your social media. Icons will automatically appear in the footer if a link is provided."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instagram */}
            <div className="bg-white rounded-lg p-4 border border-black/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center text-[#E4405F]">
                  <InstagramIcon />
                </div>
                <div>
                  <label className="block font-semibold text-sm">Instagram</label>
                  <p className="text-xs text-black/50">@votrepage</p>
                </div>
              </div>
              <input
                type="url"
                value={formData.footerInstagram}
                onChange={(e) => setFormData({ ...formData, footerInstagram: e.target.value })}
                placeholder="https://instagram.com/votrepage"
                className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Facebook */}
            <div className="bg-white rounded-lg p-4 border border-black/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center text-[#1877F2]">
                  <FacebookIcon />
                </div>
                <div>
                  <label className="block font-semibold text-sm">Facebook</label>
                  <p className="text-xs text-black/50">facebook.com/votrepage</p>
                </div>
              </div>
              <input
                type="url"
                value={formData.footerFacebook}
                onChange={(e) => setFormData({ ...formData, footerFacebook: e.target.value })}
                placeholder="https://facebook.com/votrepage"
                className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>


            <div className="flex justify-end gap-3 pt-4">
              <Link
                href="/admin"
                className="rounded-full h-11 px-6 border border-black/15 bg-white hover:bg-black/5 inline-flex items-center"
              >
                {locale === "fr" ? "Annuler" : "Cancel"}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {locale === "fr" ? "Enregistrement..." : "Saving..."}
                  </>
                ) : (
                  locale === "fr" ? "Enregistrer" : "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

export default function AdminSocialMediaPage() {
  return <AdminSocialMediaContent />;
}

