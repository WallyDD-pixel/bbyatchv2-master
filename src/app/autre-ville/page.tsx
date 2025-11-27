import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import AutreVilleClient from './AutreVilleClient';

export const metadata = { title: 'Autre ville - Informations' };

export default async function AutreVillePage({ searchParams }: { searchParams?: { lang?: string } }) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1">
        <AutreVilleClient locale={locale} t={t} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
