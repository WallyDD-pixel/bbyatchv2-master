import type { Metadata } from "next";
import "./globals.css";
import { ForceLight } from '@/components/ForceLight';
import { AppProviders } from '@/components/Providers';
import SEOTracking from '@/components/SEOTracking';
import PageLoader from '@/components/PageLoader';
import { prisma } from '@/lib/prisma';

// Les fonts Google sont chargées via <link> dans le <head>
// Les variables CSS sont définies dans globals.css

export const metadata: Metadata = {
  title: "BB SERVICES CHARTER - Location de yachts sur la Côte d'Azur",
  description: "Réservez votre yacht de luxe pour une expérience inoubliable sur la Côte d'Azur et la Riviera italienne. Location de bateaux avec skipper professionnel.",
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
    settings = await prisma.settings.findFirst();
  } catch {
    // Ignorer les erreurs de DB pendant le build
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Script d'init light forcé */}
        <script dangerouslySetInnerHTML={{__html:`(function(){try{document.documentElement.classList.remove('dark');localStorage.setItem('theme','light');}catch(e){}})();`}}/>
        {/* Google Fonts chargées côté client (pas pendant le build) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: 'var(--font-sans)' }}>
        <ForceLight />
        <AppProviders>
          <PageLoader />
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
