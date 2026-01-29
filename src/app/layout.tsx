import type { Metadata } from "next";
import { Manrope, Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import { ForceLight } from '@/components/ForceLight';
import { AppProviders } from '@/components/Providers';
import SEOTracking from '@/components/SEOTracking';
import { prisma } from '@/lib/prisma';

// Configuration des fonts avec fallback pour éviter les timeouts pendant le build
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
  adjustFontFallback: false, // Désactiver l'ajustement automatique pour éviter les timeouts
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: false,
});

// Police temporaire pour Aviano (en attendant la vraie police)
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: false,
});

// Variables pour les polices personnalisées (remplacées par Playfair Display et Montserrat)
// Les polices sont maintenant directement Playfair Display et Montserrat via Google Fonts
const customFonts = {
  nakilla: "--font-display", // Utilise Playfair Display
  aviano: "--font-montserrat", // Utilise Montserrat
};

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
      </head>
      <body className={`${manrope.variable} ${playfair.variable} ${montserrat.variable} font-sans antialiased`}>
        <ForceLight />
        <AppProviders>
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
