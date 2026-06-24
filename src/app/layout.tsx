import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ForceLight } from '@/components/ForceLight';
import { AppProviders } from '@/components/Providers';
import SEOTracking, {
  GoogleTagManagerHead,
  GoogleTagManagerNoScript,
} from '@/components/SEOTracking';
import PageLoader from '@/components/PageLoader';
import { ClientBootRecovery } from '@/components/ClientBootRecovery';
import { getBuildId } from '@/lib/build-id';
import { getCachedSiteSettings } from '@/lib/site-settings';

// Les fonts Google sont chargées via <link> dans le <head>
// Les variables CSS sont définies dans globals.css
// Favicon : logo jaune (public/brand-favicon-source.png) — voir scripts/generate-favicon.mjs

export const metadata: Metadata = {
  title: "BB SERVICES CHARTER - Location de yachts sur la Côte d'Azur",
  description:
    "Réservez votre yacht de luxe pour une expérience inoubliable sur la Côte d'Azur et la Riviera italienne. Location de bateaux avec skipper professionnel.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Charger les paramètres SEO et tracking
  let settings = null;
  try {
    settings = await getCachedSiteSettings();
  } catch {
    // Ignorer les erreurs de DB pendant le build
  }

  const buildId = getBuildId();

  return (
    <html lang="fr" suppressHydrationWarning style={{ colorScheme: "light only" }}>
      <head>
        {/* Google Tag Manager — le plus haut possible dans <head> (instructions Google) */}
        {settings?.googleTagManagerId ? (
          <GoogleTagManagerHead containerId={settings.googleTagManagerId} />
        ) : null}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="bb-build-id" content={buildId} />
        {/* Script d'init light forcé + détection nouveau build avant les chunks JS */}
        <script dangerouslySetInnerHTML={{__html:`(function(){try{var r=document.documentElement;r.classList.remove('dark');r.style.colorScheme='light only';localStorage.setItem('theme','light');var m=document.querySelector('meta[name="bb-build-id"]');var id=m&&m.getAttribute('content');if(id){var k='__bb_build_id__';var p=sessionStorage.getItem(k);if(p&&p!==id){sessionStorage.setItem(k,id);sessionStorage.removeItem('__bb_chunk_reload__');location.replace(location.pathname+location.search+(location.search?'&':'?')+'_bb='+Date.now());return;}sessionStorage.setItem(k,id);}}catch(e){}})();`}}/>
        {/* Google Fonts chargées côté client (pas pendant le build) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: 'var(--font-sans)' }}>
        {settings?.googleTagManagerId ? (
          <GoogleTagManagerNoScript containerId={settings.googleTagManagerId} />
        ) : null}
        <ForceLight />
        <ClientBootRecovery />
        <AppProviders>
          <Suspense fallback={null}>
            <PageLoader />
          </Suspense>
          {children}
        </AppProviders>
        <SEOTracking
          facebookPixelId={settings?.facebookPixelId}
          googleAnalyticsId={settings?.googleAnalyticsId}
          googleTagManagerId={settings?.googleTagManagerId}
        />
        <script dangerouslySetInnerHTML={{__html:`
          (function() {
            // Gestion globale des erreurs CSS pour éviter les crashes
            window.addEventListener('error', function(e) {
              if (e.message && e.message.includes('cssRules')) {
                console.warn('Erreur CSS ignorée (probablement due à une extension de navigateur):', e.message);
                e.preventDefault();
                return true;
              }
            }, true);
            
            // Gestion des erreurs de promesses non capturées
            window.addEventListener('unhandledrejection', function(e) {
              if (e.reason && e.reason.message && e.reason.message.includes('cssRules')) {
                console.warn('Erreur CSS promise ignorée:', e.reason.message);
                e.preventDefault();
                return true;
              }
            });
          })();
        `}} />
      </body>
    </html>
  );
}
