"use client";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { messages, type Locale } from "@/i18n/messages";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

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

  const isHome = pathname === "/";
  const homeBase = `/?lang=${locale}`;
  const experiencesHref = isHome ? "#experiences" : `${homeBase}#experiences`;
  const fleetHref = isHome ? "#fleet" : `${homeBase}#fleet`;
  const usedHref = `/used-sale?lang=${locale}`;

  return (
    <header className="px-2 sm:px-4 py-3 flex items-center justify-center sticky top-0 z-[120]">
      <div className="w-full max-w-6xl relative">
        {/* Barre principale repensée : gradient clair + légère bordure colorée */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-white/95 via-white/90 to-white/95 dark:from-[#222f3b]/90 dark:via-[#253747]/90 dark:to-[#222f3b]/90 backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_4px_18px_-4px_rgba(0,0,0,0.15)] px-3 sm:px-5 py-2 ring-1 ring-[color:var(--primary)]/10">
          {/* Logo */}
          <a href={homeBase} className="flex items-center gap-2 group" aria-label={t.app_name}>
            <Image src="/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png" alt="BB YACHTS" width={150} height={50} priority className="h-10 w-auto object-contain drop-shadow-sm" />
            <span className="hidden xs:inline text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200 group-hover:text-[color:var(--primary)] transition-colors">{t.app_name}</span>
          </a>

          {/* Navigation desktop */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1 text-sm">
            {[{href:fleetHref,label:t.nav_available},{href:experiencesHref,label:t.nav_experiences},{href:usedHref,label:t.nav_used_sale}].map(link => (
              <a key={link.href} href={link.href} className="relative px-4 py-2 rounded-full font-medium text-slate-700 dark:text-slate-200/90 hover:text-[color:var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/40 transition group">
                <span>{link.label}</span>
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[color:var(--primary)]/6 opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100 transition" />
              </a>
            ))}
          </nav>

          {/* Bloc actions (langue + auth) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-slate-300/50 dark:border-white/10 p-0.5 bg-white/70 dark:bg-white/5 shadow-inner">
              <button
                className={`h-8 px-3 rounded-full text-xs font-medium transition ${locale === "fr" ? "bg-[color:var(--primary)] text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"}`}
                aria-pressed={locale === "fr"}
                onClick={() => setLocale("fr")}
                type="button"
              >FR</button>
              <button
                className={`h-8 px-3 rounded-full text-xs font-medium transition ${locale === "en" ? "bg-[color:var(--primary)] text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"}`}
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
                type="button"
              >EN</button>
            </div>
            {!session && (
              <a
                href="/signin"
                className="rounded-full px-5 h-9 flex items-center text-sm font-semibold text-white bg-[color:var(--primary)] hover:brightness-110 active:brightness-95 transition shadow-md"
              >{t.auth_signin}</a>
            )}
            {session && (
              <div className="relative">
                <button type="button" onClick={()=>setUserMenuOpen(v=>!v)} className="h-9 pl-2 pr-3 rounded-full flex items-center gap-2 bg-slate-100/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200/70 dark:hover:bg-white/20 transition ring-1 ring-inset ring-white/50 dark:ring-white/10">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--primary)] text-white text-[11px] font-semibold shadow">{session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                  <span className="hidden lg:inline max-w-[120px] truncate text-[13px] font-medium">{session.user?.name || session.user?.email}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition ${userMenuOpen? 'rotate-180':''}`}><path d="M6 9l6 6 6-6"/></svg>
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

          {/* Bouton mobile */}
          <button
            className="md:hidden ml-auto inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-[#253747]/80 text-slate-700 dark:text-slate-200 shadow"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] md:hidden" onClick={() => setOpen(false)} />
            <div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              className="md:hidden fixed left-1/2 -translate-x-1/2 top-[76px] w-[94%] max-w-6xl rounded-3xl bg-gradient-to-b from-white/98 via-white/95 to-white/92 dark:from-[#1f2c38]/96 dark:via-[#203241]/96 dark:to-[#1f2c38]/96 border border-white/70 dark:border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] p-5 z-[110] backdrop-blur-xl"
            >
              <nav className="flex flex-col gap-1 text-sm">
                {[{href:fleetHref,label:t.nav_available,icon:'⛵'},{href:experiencesHref,label:t.nav_experiences,icon:'🌊'},{href:usedHref,label:t.nav_used_sale,icon:'💼'}].map(l => (
                  <a key={l.href} href={l.href} onClick={()=>setOpen(false)} className="group px-4 py-3 rounded-xl font-medium flex items-center gap-3 text-slate-700 dark:text-slate-100 hover:text-[color:var(--primary)] transition relative">
                    <span className="text-lg opacity-70 group-hover:opacity-100">{l.icon}</span>
                    <span>{l.label}</span>
                    <span className="absolute inset-0 rounded-xl bg-[color:var(--primary)]/7 opacity-0 group-hover:opacity-100 group-active:bg-[color:var(--primary)]/12 transition"/>
                  </a>
                ))}
              </nav>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300/70 dark:via-white/15 to-transparent" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-1 rounded-full border border-slate-300/80 dark:border-white/15 p-1 flex-1 justify-center bg-white/80 dark:bg-white/5 shadow-inner">
                  <button
                    className={`h-9 px-4 rounded-full text-sm font-semibold transition leading-none ${locale === "fr" ? "bg-[color:var(--primary)] text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10"}`}
                    aria-pressed={locale === "fr"}
                    onClick={() => setLocale("fr")}
                    type="button"
                  >FR</button>
                  <button
                    className={`h-9 px-4 rounded-full text-sm font-semibold transition leading-none ${locale === "en" ? "bg-[color:var(--primary)] text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10"}`}
                    aria-pressed={locale === "en"}
                    onClick={() => setLocale("en")}
                    type="button"
                  >EN</button>
                </div>
                {!session && (
                  <a
                    href="/signin"
                    className="flex-1 rounded-xl px-6 h-11 flex items-center justify-center text-sm font-semibold text-white bg-[color:var(--primary)] hover:brightness-110 active:brightness-95 transition shadow-md"
                    onClick={() => setOpen(false)}
                  >{t.auth_signin}</a>
                )}
                {session && (
                  <div className="flex flex-col sm:flex-row flex-1 gap-3">
                    <a
                      href={userRole==='admin'? '/admin': userRole==='agency'? '/agency':'/dashboard'}
                      onClick={()=>setOpen(false)}
                      className="group flex-1 rounded-2xl bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--primary)]/90 to-[color:var(--primary)]/80 text-white h-12 flex items-center justify-center gap-2 text-base font-semibold shadow-[0_4px_14px_-2px_rgba(0,0,0,0.3)] hover:brightness-110 active:brightness-95 transition tracking-wide"
                    >
                      <span className="text-lg drop-shadow-sm">📊</span>
                      <span className="relative">
                        {locale==='fr'? 'Dashboard':'Dashboard'}
                        <span className="absolute -bottom-0.5 left-0 w-0 group-hover:w-full transition-all h-0.5 bg-white/60 rounded-full" />
                      </span>
                    </a>
                    <button
                      onClick={()=>{ setOpen(false); signOut({ callbackUrl: '/?lang='+locale }); }}
                      className="flex-1 rounded-2xl h-12 text-sm font-semibold border border-red-400/60 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-100/70 dark:active:bg-red-500/20 transition shadow-inner"
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
