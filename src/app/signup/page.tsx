import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import SignUpFormClient from "./SignUpFormClient";

export default async function SignUpPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 flex items-center justify-center px-4 py-10 text-left">
        <SignUpFormClient />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
