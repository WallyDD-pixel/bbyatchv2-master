"use client";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { messages, type Locale } from "@/i18n/messages";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

interface NavbarItem {
  id: number;
  labelFr: string;
  labelEn: string;
  href: string;
  icon?: string;
  target: string;
}

export default function HeaderBar({ initialLocale }: { initialLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const locale = (searchParams.get("lang") as Locale) || initialLocale || "fr";
  const t = messages[locale];
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'user';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const defaultLogo = "/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png";
  const [logoUrl, setLogoUrl] = useState<string>(defaultLogo);
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);

  useEffect(() => {
    async function fetchLogo() {
      try {
        // Ajouter un timestamp pour éviter le cache
        const res = await fetch(`/api/settings/logo?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          // Ne mettre à jour que si on a une URL valide (non null, non vide)
          if (data.logoUrl && data.logoUrl.trim() !== '' && data.logoUrl !== null) {
            // Vérifier que l'URL est différente de l'actuelle pour éviter les re-renders inutiles
            setLogoUrl(prev => {
              if (prev !== data.logoUrl) {
                return data.logoUrl;
              }
              return prev;
            });
          }
          // Si logoUrl est null ou vide, on garde le logo actuel (ne pas réinitialiser)
        }
      } catch (e) {
        // En cas d'erreur, garder le logo actuel (ne pas réinitialiser)
        console.error('Error fetching logo:', e);
      }
    }

    async function fetchNavbarItems() {
      try {
        const res = await fetch("/api/navbar");
        if (res.ok) {
          const data = await res.json();
          if (data.navbarItems) setNavbarItems(data.navbarItems);
        }
      } catch (e) {
        // Fallback to default items
        setNavbarItems([
          { id: 1, labelFr: 'Bateaux disponibles', labelEn: 'Available boats', href: `/?lang=${locale}#fleet`, icon: '⛵', target: '_self' },
          { id: 2, labelFr: 'Nos expériences', labelEn: 'Our experiences', href: `/?lang=${locale}#experiences`, icon: '🌊', target: '_self' },
          { id: 3, labelFr: 'Vente d\'occasion', labelEn: 'Used sale', href: `/used-sale?lang=${locale}`, icon: '💼', target: '_self' },
          { id: 4, labelFr: 'À propos', labelEn: 'About', href: `/about${locale === 'en' ? '?lang=en' : ''}`, icon: 'ℹ️', target: '_self' }
        ]);
      }
    }

    fetchLogo();
    fetchNavbarItems();
  }, [locale]);

  const setLocale = (l: Locale) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", l);
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const homeBase = `/?lang=${locale}`;

  return (
    <header className="px-2 sm:px-4 py-4 flex items-center justify-center sticky top-0 z-[120] transition-all duration-300">
      <div className="w-full max-w-7xl relative">
        {/* Barre principale ultra-moderne */}
        <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-white/96 via-white/92 to-white/96 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] px-4 sm:px-6 py-3 ring-1 ring-[color:var(--primary)]/15 hover:ring-[color:var(--primary)]/25 transition-all duration-300 group">
          {/* Logo avec animation sophistiquée - visible sur mobile et desktop */}
          <a href={homeBase} className="flex items-center group hover:scale-[1.02] transition-all duration-300 ease-out" aria-label={t.app_name}>
            <div className="relative h-10 sm:h-12 w-auto">
              <img 
                src={logoUrl || defaultLogo} 
                alt="BB YACHTS" 
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" 
                key={logoUrl || defaultLogo}
                style={{ display: 'block', maxWidth: '180px' }}
                onError={(e) => {
                  // En cas d'erreur de chargement, utiliser le logo par défaut
                  const target = e.target as HTMLImageElement;
                  console.error('Erreur chargement logo:', target.src);
                  if (target.src !== defaultLogo && !target.src.includes(defaultLogo)) {
                    target.src = defaultLogo;
                    setLogoUrl(defaultLogo);
                  }
                }}
                onLoad={(e) => {
                  // Vérifier que l'image s'est bien chargée
                  console.log('Logo loaded:', (e.target as HTMLImageElement).src);
                }}
              />
            </div>
          </a>

          {/* Navigation desktop améliorée */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-2 text-sm">
            {navbarItems.map((link, i) => (
              <a 
                key={link.href} 
                href={link.href} 
                target={link.target}
                className="group relative px-5 py-3 rounded-2xl font-semibold text-slate-700 dark:text-slate-200/95 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/50 transition-all duration-300 overflow-hidden no-underline visited:text-slate-700 visited:dark:text-slate-200/95 hover:visited:text-slate-900 active:text-slate-900" 
                style={{ textDecoration: 'none' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="font-medium">{locale === 'fr' ? link.labelFr : link.labelEn}</span>
                </span>
                {/* Légère ombre au survol, pas de fond transparent */}
                <span className="absolute inset-0 bg-slate-100 dark:bg-white/10 rounded-2xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </a>
            ))}
          </nav>

          {/* Bloc actions redesigné */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Sélecteur de langue modernisé */}
            <div className="relative flex items-center gap-1 rounded-2xl border border-slate-300/60 dark:border-white/15 p-1 bg-gradient-to-r from-white/80 via-white/70 to-white/80 dark:from-white/10 dark:via-white/5 dark:to-white/10 shadow-inner backdrop-blur-sm">
              <button
                className={`relative h-9 px-4 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                  locale === "fr" 
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105" 
                    : "text-slate-600 dark:text-white/90 hover:bg-slate-200/70 dark:hover:bg-white/15 hover:scale-105"
                }`}
                style={locale === "fr" ? { background: 'linear-gradient(to right, #2563eb, #1d4ed8)' } : {}}
                aria-pressed={locale === "fr"}
                onClick={() => setLocale("fr")}
                type="button"
              >
                <span className="relative z-10">FR</span>
                {locale === "fr" && <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />}
              </button>
              <button
                className={`relative h-9 px-4 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                  locale === "en" 
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105" 
                    : "text-slate-600 dark:text-white/90 hover:bg-slate-200/70 dark:hover:bg-white/15 hover:scale-105"
                }`}
                style={locale === "en" ? { background: 'linear-gradient(to right, #2563eb, #1d4ed8)' } : {}}
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
                type="button"
              >
                <span className="relative z-10">EN</span>
                {locale === "en" && <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />}
              </button>
            </div>
            {/* Bouton de connexion premium */}
            {!session && (
              <a
                href="/signin"
                className="group relative rounded-2xl px-6 h-11 flex items-center text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
                style={{ backgroundColor: '#2563eb' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base">👤</span>
                  {t.auth_signin}
                </span>
                {/* Effet de brillance au survol */}
                <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
              </a>
            )}
            {/* Menu utilisateur premium */}
            {session && (
              <div className="relative">
                <button 
                  type="button" 
                  onClick={()=>setUserMenuOpen(v=>!v)} 
                  className="group h-11 pl-3 pr-4 rounded-2xl flex items-center gap-3 bg-gradient-to-r from-slate-100/90 via-slate-50/90 to-slate-100/90 dark:from-white/15 dark:via-white/10 dark:to-white/15 text-slate-700 dark:text-slate-200 text-sm font-medium hover:from-slate-200/90 hover:via-slate-100/90 hover:to-slate-200/90 dark:hover:from-white/20 dark:hover:via-white/15 dark:hover:to-white/20 transition-all duration-300 ring-1 ring-inset ring-white/60 dark:ring-white/10 shadow-md hover:shadow-lg backdrop-blur-sm"
                >
                  <div className="relative">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#2563eb' }}>
                      {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse" />
                  </div>
                  <span className="hidden xl:inline max-w-[140px] truncate text-sm font-semibold">{session.user?.name || session.user?.email}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${userMenuOpen? 'rotate-180':''}`}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-300/60 dark:border-white/10 bg-gradient-to-br from-white/95 to-white/90 dark:from-[#243443]/95 dark:to-[#1f2c38]/95 shadow-2xl p-1.5 z-[130] text-sm backdrop-blur-xl">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" style={{ backgroundColor: '#2563eb' }} />{userRole==='admin'? 'Admin': userRole==='agency'? 'Agence':'Utilisateur'}
                    </div>
                    <a href={userRole==='admin'? '/admin': userRole==='agency'? '/agency':'/dashboard'} className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 text-slate-700 dark:text-slate-200">
                      <span className="text-[15px]">📊</span><span>{locale==='fr'? 'Tableau de bord':'Dashboard'}</span>
                    </a>
                    {userRole==='admin' && (
                      <>
                        <a href="/admin/reservations" className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 text-slate-700 dark:text-slate-200"><span className="text-[15px]">🗂️</span><span>{locale==='fr'? 'Réservations':'Reservations'}</span></a>
                        <a href="/admin/agency-requests" className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 text-slate-700 dark:text-slate-200"><span className="text-[15px]">🤝</span><span>{locale==='fr'? 'Demandes agence':'Agency requests'}</span></a>
                      </>
                    )}
                    <div className="my-1 h-px bg-gradient-to-r from-transparent via-slate-300/70 dark:via-white/10 to-transparent" />
                    <button onClick={()=>signOut({ callbackUrl: '/?lang='+locale })} className="w-full text-left flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-500/10 dark:active:bg-red-500/20 text-red-600 dark:text-red-400 font-medium">
                      <span className="text-[15px]">↩</span><span>{locale==='fr'? 'Déconnexion':'Sign out'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bouton mobile premium */}
          <button
            className="md:hidden ml-auto group inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-white/60 dark:border-white/15 bg-gradient-to-br from-white/95 via-white/90 to-white/85 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90 text-slate-700 dark:text-slate-200 shadow-lg hover:shadow-xl backdrop-blur-sm hover:scale-105 active:scale-95 transition-all duration-300 ring-1 ring-inset ring-white/40 dark:ring-white/10"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${open ? 'rotate-90 scale-110 opacity-70' : 'group-hover:scale-110'}`}>
              {open ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile */}
        {open && (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] md:hidden transition-opacity duration-300" onClick={() => setOpen(false)} />
            <div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              className="md:hidden fixed left-1/2 -translate-x-1/2 top-[76px] w-[92%] max-w-md rounded-3xl bg-white border border-slate-200/80 shadow-2xl p-6 z-[110] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300"
            >
              {/* Logo dans le menu mobile */}
              <div className="flex justify-center mb-6 pb-5 border-b border-slate-200">
                <a href={homeBase} onClick={() => setOpen(false)} className="flex items-center justify-center hover:opacity-80 transition-opacity" aria-label={t.app_name}>
                  <img 
                    src={logoUrl || defaultLogo} 
                    alt="BB YACHTS" 
                    className="h-14 w-auto object-contain max-w-[220px] min-h-[40px]" 
                    style={{ display: 'block' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error('Erreur chargement logo:', target.src);
                      if (target.src !== defaultLogo && !target.src.includes(defaultLogo)) {
                        target.src = defaultLogo;
                        setLogoUrl(defaultLogo);
                      }
                    }}
                    onLoad={(e) => {
                      console.log('Logo mobile chargé avec succès:', (e.target as HTMLImageElement).src);
                    }}
                  />
                </a>
              </div>
              <nav className="flex flex-col gap-2 text-sm">
                {navbarItems.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    target={l.target}
                    onClick={()=>setOpen(false)}
                    className="group px-5 py-4 rounded-2xl font-semibold flex items-center justify-between transition-all duration-200 relative bg-slate-50 hover:bg-blue-50 active:bg-blue-100 border border-slate-200 hover:border-blue-200"
                  >
                    {/* labels: texte sombre pour meilleure lisibilité */}
                    <span className="text-slate-900 text-base font-semibold">{locale === 'fr' ? l.labelFr : l.labelEn}</span>
                    {/* Flèche indicateur */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </a>
                ))}
              </nav>
              <div className="my-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              
              {/* Sélecteur de langue */}
              <div className="flex items-center gap-2 rounded-2xl border border-slate-300 p-1.5 bg-slate-50 mb-4">
                <button
                  className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-200 ${
                    locale === "fr" 
                      ? "bg-blue-600 text-white shadow-lg scale-[1.02]" 
                      : "text-slate-700 hover:text-slate-900 hover:bg-white"
                  }`}
                  style={locale === "fr" ? { backgroundColor: '#2563eb' } : {}}
                  aria-pressed={locale === "fr"}
                  onClick={() => setLocale("fr")}
                  type="button"
                >
                  FR
                </button>
                <button
                  className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all duration-200 ${
                    locale === "en" 
                      ? "bg-blue-600 text-white shadow-lg scale-[1.02]" 
                      : "text-slate-700 hover:text-slate-900 hover:bg-white"
                  }`}
                  style={locale === "en" ? { backgroundColor: '#2563eb' } : {}}
                  aria-pressed={locale === "en"}
                  onClick={() => setLocale("en")}
                  type="button"
                >
                  EN
                </button>
              </div>

              {/* Actions utilisateur */}
              {!session && (
                <a
                  href="/signin"
                  className="w-full rounded-2xl px-6 py-4 min-h-[56px] flex items-center justify-center gap-2 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
                  onClick={() => setOpen(false)}
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {t.auth_signin}
                </a>
              )}
              {session && (
                <div className="flex flex-col gap-3">
                  <a
                    href={userRole==='admin'? '/admin': userRole==='agency'? '/agency':'/dashboard'}
                    onClick={()=>setOpen(false)}
                    className="group w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white min-h-[56px] flex items-center justify-center gap-2 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    <span className="text-lg">📊</span>
                    <span>{locale==='fr'? 'Dashboard':'Dashboard'}</span>
                  </a>
                  <button
                    onClick={()=>{ setOpen(false); signOut({ callbackUrl: '/?lang='+locale }); }}
                    className="w-full rounded-2xl min-h-[56px] text-base font-semibold border-2 border-red-400 text-red-600 hover:bg-red-50 hover:border-red-500 active:bg-red-100 transition-all duration-200 active:scale-[0.98]"
                  >
                    {locale==='fr'? 'Déconnexion':'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
