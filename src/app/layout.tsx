import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ForceLight } from '@/components/ForceLight';
import { AppProviders } from '@/components/Providers';

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Bbyatch",
  description: "Plateforme de réservation de bateaux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Script d'init light forcé */}
        <script dangerouslySetInnerHTML={{__html:`(function(){try{document.documentElement.classList.remove('dark');localStorage.setItem('theme','light');}catch(e){}})();`}}/>
      </head>
      <body className={`${manrope.variable} ${playfair.variable} antialiased`}>
        <ForceLight />
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
