import Link from "next/link";
import Image from "next/image";
import { type Locale } from "@/i18n/messages";
import { prisma } from "@/lib/prisma";

export default async function Footer({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  const year = new Date().getFullYear();
  // Lire le mapping de liens légaux depuis Settings
  const s = await prisma.settings.findFirst();
  const baseSlug = (s as any)?.legalBaseSlug || "conditions-paiement-location";
  const termsSlug = (s as any)?.legalTermsSlug || "terms";
  const privacySlug = (s as any)?.legalPrivacySlug || "privacy";
  return (
    <footer className="mt-16 border-t border-black/10 bg-white/70 backdrop-blur text-left">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png" alt="BB YACHTS" width={210} height={72} className="h-16 w-auto object-contain" />
            </div>
            <p className="mt-2 text-sm text-black/60">
              {locale === "fr"
                ? "Location de yachts et d'expériences en mer sur la Côte d'Azur."
                : "Yacht charters and sea experiences on the French Riviera."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-black/80">{locale === "fr" ? "Navigation" : "Navigation"}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#experiences" className="text-black/70 hover:text-[--primary]">{t.nav_experiences}</a></li>
              <li><a href="#fleet" className="text-black/70 hover:text-[--primary]">{t.nav_available}</a></li>
              <li><a href="#used" className="text-black/70 hover:text-[--primary]">{t.nav_used_sale}</a></li>
              <li><a href="#contact" className="text-black/70 hover:text-[--primary]">{t.nav_contact}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-black/80">{locale === "fr" ? "Aide" : "Help"}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="#how" className="text-black/70 hover:text-[--primary]">{t.nav_how}</Link></li>
              <li><a href="#faq" className="text-black/70 hover:text-[--primary]">{locale === "fr" ? "FAQ" : "FAQ"}</a></li>
              <li><a href="#support" className="text-black/70 hover:text-[--primary]">{locale === "fr" ? "Support" : "Support"}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-black/80">{locale === "fr" ? "Contacts" : "Contacts"}</h4>
            <ul className="mt-3 space-y-2 text-sm text-black/70">
              <li>📍 Port Camille Rayon – Avenue des frères Roustan – 06220 Vallauris, France</li>
              <li>✉️ charter@bb-yachts.com</li>
              <li>☎️ 06 09 17 62 82</li>
            </ul>
            <div className="mt-4 flex items-center gap-3 text-[--primary]">
              <a href="#" aria-label="Instagram" className="hover:opacity-80">IG</a>
              <a href="#" aria-label="Facebook" className="hover:opacity-80">FB</a>
              <a href="#" aria-label="X" className="hover:opacity-80">X</a>
            </div>
          </div>
        </div>

        {/* Bloc conditions légales retiré – remplacé par liens */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3 text-[11px] sm:text-xs text-black/65">
          <div>
            <h4 className='font-semibold text-black/80 mb-2'>{locale==='fr'? 'Légal':'Legal'}</h4>
            <ul className='space-y-1.5'>
              <li><a href={`/legal/${baseSlug}`} className='hover:text-[--primary]'>{locale==='fr'? 'Conditions & Paiement':'Charter & Payment Terms'}</a></li>
              <li><a href={`/legal/${termsSlug}`} className='hover:text-[--primary]'>{locale==='fr'? 'CGU / Mentions':'Terms & Notices'}</a></li>
              <li><a href={`/legal/${privacySlug}`} className='hover:text-[--primary]'>{locale==='fr'? 'Confidentialité':'Privacy'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className='font-semibold text-black/80 mb-2'>{locale==='fr'? 'Réservations':'Bookings'}</h4>
            <ul className='space-y-1.5'>
              <li><a href={`/legal/${baseSlug}#annulation`} className='hover:text-[--primary]'>{locale==='fr'? 'Politique d\'annulation':'Cancellation Policy'}</a></li>
              <li><a href={`/legal/${baseSlug}#paiement`} className='hover:text-[--primary]'>{locale==='fr'? 'Modalités de paiement':'Payment Modalities'}</a></li>
              <li><a href={`/legal/${baseSlug}#carburant`} className='hover:text-[--primary]'>{locale==='fr'? 'Carburant & dépôt':'Fuel & Security Deposit'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className='font-semibold text-black/80 mb-2'>{locale==='fr'? 'Assistance':'Support'}</h4>
            <ul className='space-y-1.5'>
              <li><a href='#contact' className='hover:text-[--primary]'>{locale==='fr'? 'Contact':'Contact'}</a></li>
              <li><a href='/#faq' className='hover:text-[--primary]'>FAQ</a></li>
              <li><a href='mailto:charter@bb-yachts.com' className='hover:text-[--primary]'>{locale==='fr'? 'Email direct':'Direct email'}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-black/10 text-xs sm:text-sm text-black/60 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>© {year} {t.app_name}. {t.footer_rights}</div>
          <div className="flex items-center gap-4">
            <a href={`/legal/${termsSlug}`} className="hover:text-[--primary]">{locale === "fr" ? "Conditions" : "Terms"}</a>
            <a href={`/legal/${privacySlug}`} className="hover:text-[--primary]">{locale === "fr" ? "Confidentialité" : "Privacy"}</a>
            <a href={`/legal/${privacySlug}#cookies`} className="hover:text-[--primary]">{locale === "fr" ? "Cookies" : "Cookies"}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
