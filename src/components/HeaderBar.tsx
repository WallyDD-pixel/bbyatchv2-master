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
  const [logoUrl, setLogoUrl] = useState<string>("/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png");
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);

  useEffect(() => {
    async function fetchLogo() {
      try {
        const res = await fetch("/api/settings/logo");
        if (res.ok) {
          const data = await res.json();
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (e) {
        // Fallback to default logo
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
          {/* Logo avec animation sophistiquée */}
          <a href={homeBase} className="flex items-center gap-3 group hover:scale-[1.02] transition-all duration-300 ease-out" aria-label={t.app_name}>
            <div className="relative">
              <Image 
                src={logoUrl} 
                alt="BB YACHTS" 
                width={150} 
                height={50} 
                priority 
                className="h-12 w-auto object-contain drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" 
                onError={(e) => {
                  // Fallback vers le logo par défaut en cas d'erreur
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png") {
                    target.src = "/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png";
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--primary)]/0 via-[color:var(--primary)]/5 to-[color:var(--primary)]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            </div>
          </a>

          {/* Navigation desktop améliorée */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-2 text-sm">
            {navbarItems.map((link, i) => (
              <a 
                key={link.href} 
                href={link.href} 
                target={link.target}
                className="group relative px-5 py-3 rounded-2xl font-semibold text-slate-700 dark:text-slate-200/95 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/50 transition-all duration-300 overflow-hidden no-underline visited:text-slate-700 visited:dark:text-slate-200/95 hover:visited:text-white active:text-white" 
                style={{ textDecoration: 'none' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-base opacity-80 group-hover:opacity-100 transition-opacity duration-300">{link.icon}</span>
                  <span className="font-medium">{locale === 'fr' ? link.labelFr : link.labelEn}</span>
                </span>
                {/* Effet de survol dégradé */}
                <span className="absolute inset-0 bg-gradient-to-r from-[color:var(--primary)]/80 via-[color:var(--primary)] to-[color:var(--primary)]/80 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl scale-0 group-hover:scale-100" />
                {/* Animation de bordure */}
                <span className="absolute inset-0 rounded-2xl border border-[color:var(--primary)]/30 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {/* Effet de brillance */}
                <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
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
                    ? "bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--primary)]/80 text-white shadow-lg scale-105" 
                    : "text-slate-600 dark:text-white/90 hover:bg-slate-200/70 dark:hover:bg-white/15 hover:scale-105"
                }`}
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
                    ? "bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--primary)]/80 text-white shadow-lg scale-105" 
                    : "text-slate-600 dark:text-white/90 hover:bg-slate-200/70 dark:hover:bg-white/15 hover:scale-105"
                }`}
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
                className="group relative rounded-2xl px-6 h-11 flex items-center text-sm font-bold text-white bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--primary)]/90 to-[color:var(--primary)] hover:from-[color:var(--primary)]/90 hover:via-[color:var(--primary)] hover:to-[color:var(--primary)]/90 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
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
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--primary)]/80 text-white text-sm font-bold shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
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
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--primary)]" />{userRole==='admin'? 'Admin': userRole==='agency'? 'Agence':'Utilisateur'}
                    </div>
                    <a href={userRole==='admin'? '/admin': userRole==='agency'? '/agency':'/dashboard'} className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-[color:var(--primary)]/10 active:bg-[color:var(--primary)]/15 text-slate-700 dark:text-slate-200">
                      <span className="text-[15px]">📊</span><span>{locale==='fr'? 'Tableau de bord':'Dashboard'}</span>
                    </a>
                    {userRole==='admin' && (
                      <>
                        <a href="/admin/reservations" className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-[color:var(--primary)]/10 active:bg-[color:var(--primary)]/15 text-slate-700 dark:text-slate-200"><span className="text-[15px]">🗂️</span><span>{locale==='fr'? 'Réservations':'Reservations'}</span></a>
                        <a href="/admin/agency/requests" className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-[color:var(--primary)]/10 active:bg-[color:var(--primary)]/15 text-slate700 dark:text-slate-200"><span className="text-[15px]">🤝</span><span>{locale==='fr'? 'Demandes agence':'Agency requests'}</span></a>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${open ? 'rotate-90 scale-110' : 'group-hover:scale-110'}`}>
              {open ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" className="transform origin-center transition-transform duration-300" />
                  <line x1="3" y1="12" x2="21" y2="12" className="transform origin-center transition-transform duration-300" />
                  <line x1="3" y1="18" x2="21" y2="18" className="transform origin-center transition-transform duration-300" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile */}
        {open && (
          <>
            <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] md:hidden" onClick={() => setOpen(false)} />
            <div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              className="md:hidden fixed left-1/2 -translate-x-1/2 top-[76px] w-[94%] max-w-6xl rounded-3xl bg-gradient-to-b from-white/98 via-white/95 to-white/92 dark:from-[#1f2c38]/96 dark:via-[#203241]/96 dark:to-[#1f2c38]/96 border border-white/70 dark:border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] p-5 z-[110] backdrop-blur-xl"
            >
              <nav className="flex flex-col gap-1 text-sm">
                {navbarItems.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    target={l.target}
                    onClick={()=>setOpen(false)}
                    className="group px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition relative bg-transparent"
                  >
                    {/* icons: force light color for dark overlay */}
                    <span className="text-lg opacity-90 group-hover:opacity-100 text-white drop-shadow-sm">{l.icon}</span>
                    {/* labels: strong white for maximum contrast on dark blurred background */}
                    <span className="text-white font-semibold drop-shadow-sm">{locale === 'fr' ? l.labelFr : l.labelEn}</span>
                    <span className="absolute inset-0 rounded-xl bg-[color:var(--primary)]/7 opacity-0 group-hover:opacity-100 group-active:bg-[color:var(--primary)]/12 transition pointer-events-none"/>
                  </a>
                ))}
              </nav>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300/70 dark:via-white/15 to-transparent" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-1 rounded-full border border-slate-300/80 dark:border-white/15 p-1 flex-1 justify-center bg-white/80 dark:bg-white/5 shadow-inner">
                  {/* active state stays primary, inactive state forced to white for readability */}
                  <button
                    className={`h-9 px-4 rounded-full text-sm font-semibold transition leading-none ${locale === "fr" ? "bg-[color:var(--primary)] text-white shadow" : "text-white/90 dark:text-white/90 hover:bg-white/10"}`}
                    aria-pressed={locale === "fr"}
                    onClick={() => setLocale("fr")}
                    type="button"
                  >FR</button>
                  <button
                    className={`h-9 px-4 rounded-full text-sm font-semibold transition leading-none ${locale === "en" ? "bg-[color:var(--primary)] text-white shadow" : "text-white/90 dark:text-white/90 hover:bg-white/10"}`}
                    aria-pressed={locale === "en"}
                    onClick={() => setLocale("en")}
                    type="button"
                  >EN</button>
                </div>
                {!session && (
                  <a
                    href="/signin"
                    className="w-full sm:flex-1 rounded-2xl px-6 py-4 min-h-[56px] flex items-center justify-center text-base font-bold text-white bg-[color:var(--primary)] hover:brightness-105 active:brightness-95 transition shadow-lg"
                    onClick={() => setOpen(false)}
                    style={{letterSpacing: '0.2px'}}
                  >{t.auth_signin}</a>
                )}
                {session && (
                  <div className="flex flex-col sm:flex-row flex-1 gap-3">
                    <a
                      href={userRole==='admin'? '/admin': userRole==='agency'? '/agency':'/dashboard'}
                      onClick={()=>setOpen(false)}
                      className="group flex-1 rounded-2xl bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--primary)]/90 to-[color:var(--primary)]/80 text-white min-h-[56px] flex items-center justify-center gap-2 text-base sm:text-lg font-semibold shadow-[0_6px_18px_-4px_rgba(0,0,0,0.35)] hover:brightness-110 active:brightness-95 transition tracking-wide"
                    >
                      <span className="text-lg drop-shadow-sm">📊</span>
                      <span className="relative">
                        {locale==='fr'? 'Dashboard':'Dashboard'}
                        <span className="absolute -bottom-0.5 left-0 w-0 group-hover:w-full transition-all h-0.5 bg-white/60 rounded-full" />
                      </span>
                    </a>
                    <button
                      onClick={()=>{ setOpen(false); signOut({ callbackUrl: '/?lang='+locale }); }}
                      className="flex-1 rounded-2xl min-h-[56px] text-base font-semibold border border-red-400/60 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-100/70 dark:active:bg-red-500/20 transition shadow-inner"
                    >{locale==='fr'? 'Déconnexion':'Sign out'}</button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
