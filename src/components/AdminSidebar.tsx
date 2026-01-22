"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type Locale } from "@/i18n/messages";
import SignOutButton from "@/app/dashboard/SignOutButton";
import { useState, useEffect } from "react";

interface MenuItem {
  href: string;
  labelFr: string;
  labelEn: string;
  icon: string;
  badge?: number;
}

interface AdminSidebarProps {
  locale: Locale;
  stats?: {
    users?: number;
    boats?: number;
    usedBoats?: number;
    experiences?: number;
    reservations?: number;
    gallery?: number;
    infoCards?: number;
  };
}

export default function AdminSidebar({ locale: initialLocale, stats }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale: Locale = searchParams?.get('lang') === 'en' ? 'en' : (initialLocale || 'fr');
  const [isOpen, setIsOpen] = useState(false);
  
  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const menuItems: MenuItem[] = [
    { href: "/admin", labelFr: "Tableau de bord", labelEn: "Dashboard", icon: "📊" },
    { href: "/admin/boats", labelFr: "Bateaux", labelEn: "Boats", icon: "🛥️", badge: stats?.boats },
    { href: "/admin/used-boats", labelFr: "Bateaux d'occasion", labelEn: "Used Boats", icon: "⛵", badge: stats?.usedBoats },
    { href: "/admin/experiences", labelFr: "Expériences", labelEn: "Experiences", icon: "🌅", badge: stats?.experiences },
    { href: "/admin/reservations", labelFr: "Réservations", labelEn: "Reservations", icon: "📅", badge: stats?.reservations },
    { href: "/admin/calendar", labelFr: "Calendrier", labelEn: "Calendar", icon: "📆" },
    { href: "/admin/users", labelFr: "Utilisateurs", labelEn: "Users", icon: "👥", badge: stats?.users },
    { href: "/admin/messages", labelFr: "Messages", labelEn: "Messages", icon: "✉️" },
    { href: "/admin/agency-requests", labelFr: "Demandes agence", labelEn: "Agency Requests", icon: "🏢" },
    { href: "/admin/info-cards", labelFr: "Cartes d'info", labelEn: "Info Cards", icon: "ℹ️", badge: stats?.infoCards },
    { href: "/admin/homepage-settings", labelFr: "Page d'accueil", labelEn: "Homepage", icon: "🏠" },
    { href: "/admin/about-settings", labelFr: "Page À propos", labelEn: "About Page", icon: "ℹ️" },
    { href: "/admin/navbar", labelFr: "Navigation", labelEn: "Navigation", icon: "🧭" },
    { href: "/admin/legal-pages", labelFr: "Pages légales", labelEn: "Legal Pages", icon: "📄" },
    { href: "/admin/social-media", labelFr: "Réseaux sociaux", labelEn: "Social Media", icon: "📱" },
    { href: "/admin/general-settings", labelFr: "Paramètres généraux", labelEn: "General Settings", icon: "⚙️" },
    { href: "/admin/notifications", labelFr: "Notifications", labelEn: "Notifications", icon: "📧" },
    { href: "/admin/stripe", labelFr: "Stripe", labelEn: "Stripe", icon: "💳" },
    { href: "/admin/seo-tracking", labelFr: "SEO & Tracking", labelEn: "SEO & Tracking", icon: "📊" },
    { href: "/admin/used-sale-settings", labelFr: "LP Occasions", labelEn: "Used Sale LP", icon: "📄" },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Bouton menu mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 lg:hidden bg-slate-900 text-white p-2.5 sm:p-2 rounded-lg shadow-lg hover:bg-slate-800 transition-colors touch-manipulation"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>
      
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
            A
          </div>
          <div>
            <div className="font-bold text-sm">Admin Panel</div>
            <div className="text-xs text-slate-400">BB Services</div>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{locale === "fr" ? item.labelFr : item.labelEn}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-semibold
                  ${active ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"}
                `}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span>👁️</span>
          <span>{locale === "fr" ? "Voir le site" : "View site"}</span>
        </Link>
        <div className="pt-2">
          <SignOutButton variant="dark" locale={locale} />
        </div>
      </div>
    </aside>
    </>
  );
}
