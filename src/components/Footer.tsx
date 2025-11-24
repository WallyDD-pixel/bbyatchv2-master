import Link from "next/link";
import Image from "next/image";
import { type Locale } from "@/i18n/messages";
import { prisma } from "@/lib/prisma";

// Icônes SVG pour les contacts
const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

// Icônes SVG pour les réseaux sociaux (uniformes)
const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default async function Footer({ locale, t }: { locale: Locale; t: Record<string, string> }) {
  const year = new Date().getFullYear();
  // Lire le mapping de liens légaux et réseaux sociaux depuis Settings
  const s = await prisma.settings.findFirst();
  const baseSlug = (s as any)?.legalBaseSlug || "conditions-paiement-location";
  const termsSlug = (s as any)?.legalTermsSlug || "terms";
  const privacySlug = (s as any)?.legalPrivacySlug || "privacy";
  
  // URLs des réseaux sociaux depuis Settings
  const instagramUrl = (s as any)?.footerInstagram || "#";
  const facebookUrl = (s as any)?.footerFacebook || "#";
  const linkedInUrl = (s as any)?.footerLinkedIn || "#";
  const youtubeUrl = (s as any)?.footerYouTube || "#";
  const tiktokUrl = (s as any)?.footerTikTok || "#";
  
  const phoneNumber = "0609176282";
  const whatsappUrl = `https://wa.me/33${phoneNumber.replace(/\s/g, "")}`;
  
  return (
    <footer className="mt-16 border-t border-black/10 bg-white/70 backdrop-blur text-left">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-12">
        {/* Grille principale avec espacement uniforme */}
        <div className="grid gap-12 md:grid-cols-4 md:gap-6 lg:gap-8">
          {/* Colonne 1: Logo et description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image 
                src="/cropped-LOGO-BB-yacht-ok_black-FEEL-THE-MEdierranean-247x82.png" 
                alt="BB SERVICES CHARTER" 
                width={210} 
                height={72} 
                className="h-16 w-auto object-contain" 
              />
            </div>
            <p className="text-xs leading-relaxed text-[#666666] max-w-[240px]">
              {locale === "fr"
                ? "Location de yachts et d'expériences en mer sur la Côte d'Azur."
                : "Yacht charters and sea experiences on the French Riviera."}
            </p>
          </div>

          {/* Colonne 2: Navigation */}
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight">
              {locale === "fr" ? "Navigation" : "Navigation"}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href={`/${locale === 'en' ? '?lang=en' : ''}#experiences`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {t.nav_experiences}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/${locale === 'en' ? '?lang=en' : ''}#fleet`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {t.nav_available}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/used-sale${locale === 'en' ? '?lang=en' : ''}`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {t.nav_used_sale}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/contact${locale === 'en' ? '?lang=en' : ''}`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {t.nav_contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3: Aide */}
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight">
              {locale === "fr" ? "Aide" : "Help"}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href={`/how-it-works${locale === 'en' ? '?lang=en' : ''}`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {t.nav_how}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/faq${locale === 'en' ? '?lang=en' : ''}`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {locale === "fr" ? "FAQ" : "FAQ"}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/support${locale === 'en' ? '?lang=en' : ''}`} 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  {locale === "fr" ? "Support" : "Support"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 4: Contacts */}
          <div className="md:col-span-1">
            <h4 className="text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight">
              {locale === "fr" ? "Contacts" : "Contacts"}
            </h4>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 text-[#999999] flex-shrink-0">
                  <LocationIcon />
                </span>
                <span className="text-[13px] leading-relaxed text-[#4a4a4a]">
                  Port Camille Rayon – Avenue des frères Roustan – 06220 Vallauris, France
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-[#999999] flex-shrink-0">
                  <EmailIcon />
                </span>
                <a 
                  href="mailto:charter@bb-yachts.com" 
                  className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                >
                  charter@bb-yachts.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-[#999999] flex-shrink-0">
                  <PhoneIcon />
                </span>
                <div className="flex items-center gap-2">
                  <a 
                    href={`tel:+33${phoneNumber.replace(/\s/g, "")}`} 
                    className="text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
                  >
                    06 09 17 62 82
                  </a>
                  <a 
                    href={whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors duration-200"
                    aria-label="WhatsApp"
                    title="Contacter via WhatsApp"
                  >
                    <WhatsAppIcon />
                  </a>
                </div>
              </li>
            </ul>
            {/* Réseaux sociaux avec espacement uniforme */}
            <div className="mt-5 flex items-center gap-3">
              <a 
                href={instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Instagram" 
                className="text-[#999999] hover:text-[color:var(--primary)] transition-colors duration-200"
              >
                <InstagramIcon />
              </a>
              <a 
                href={facebookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Facebook" 
                className="text-[#999999] hover:text-[color:var(--primary)] transition-colors duration-200"
              >
                <FacebookIcon />
              </a>
              <a 
                href={linkedInUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="LinkedIn" 
                className="text-[#999999] hover:text-[color:var(--primary)] transition-colors duration-200"
              >
                <LinkedInIcon />
              </a>
              <a 
                href={youtubeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="YouTube" 
                className="text-[#999999] hover:text-[color:var(--primary)] transition-colors duration-200"
              >
                <YouTubeIcon />
              </a>
              <a 
                href={tiktokUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="TikTok" 
                className="text-[#999999] hover:text-[color:var(--primary)] transition-colors duration-200"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Section liens légaux avec alignement uniforme */}
        <div className="mt-14 pt-8 border-t border-black/10 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-8">
          <div>
            <h4 className='text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight'>
              {locale==='fr'? 'Légal':'Legal'}
            </h4>
            <ul className='space-y-3'>
              <li>
                <a 
                  href={`/legal/${baseSlug}`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Conditions & Paiement':'Charter & Payment Terms'}
                </a>
              </li>
              <li>
                <a 
                  href={`/legal/${termsSlug}`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'CGU / Mentions':'Terms & Notices'}
                </a>
              </li>
              <li>
                <a 
                  href={`/legal/${privacySlug}`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Confidentialité':'Privacy'}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className='text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight'>
              {locale==='fr'? 'Réservations':'Bookings'}
            </h4>
            <ul className='space-y-3'>
              <li>
                <a 
                  href={`/legal/${baseSlug}#annulation`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Politique d\'annulation':'Cancellation Policy'}
                </a>
              </li>
              <li>
                <a 
                  href={`/legal/${baseSlug}#paiement`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Modalités de paiement':'Payment Modalities'}
                </a>
              </li>
              <li>
                <a 
                  href={`/legal/${baseSlug}#carburant`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Carburant & dépôt':'Fuel & Security Deposit'}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className='text-sm font-semibold text-[#1a1a1a] mb-4 tracking-tight'>
              {locale==='fr'? 'Assistance':'Support'}
            </h4>
            <ul className='space-y-3'>
              <li>
                <Link 
                  href={`/contact${locale === 'en' ? '?lang=en' : ''}`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Contact':'Contact'}
                </Link>
              </li>
              <li>
                <Link 
                  href={`/faq${locale === 'en' ? '?lang=en' : ''}`} 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  FAQ
                </Link>
              </li>
              <li>
                <a 
                  href='mailto:charter@bb-yachts.com' 
                  className='text-[13px] leading-relaxed text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200'
                >
                  {locale==='fr'? 'Email direct':'Direct email'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom avec alignement centré */}
        <div className="mt-12 pt-6 border-t border-black/10 text-xs sm:text-sm text-[#666666] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            © {year} {t.app_name}. {t.footer_rights}
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-6">
            <a 
              href={`/legal/${termsSlug}`} 
              className="text-[13px] text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
            >
              {locale === "fr" ? "Conditions" : "Terms"}
            </a>
            <a 
              href={`/legal/${privacySlug}`} 
              className="text-[13px] text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
            >
              {locale === "fr" ? "Confidentialité" : "Privacy"}
            </a>
            <a 
              href={`/legal/${privacySlug}#cookies`} 
              className="text-[13px] text-[#4a4a4a] hover:text-[color:var(--primary)] transition-colors duration-200"
            >
              {locale === "fr" ? "Cookies" : "Cookies"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
