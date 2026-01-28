import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import SignInFormClient from "./SignInFormClient";

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> | { lang?: string } }) {
  // Next.js 16: searchParams is a Promise, Next.js 15: it's an object
  // Always await to be compatible with both versions
  const resolvedParams = searchParams ? (await Promise.resolve(searchParams)) : {};
  const locale: Locale = resolvedParams?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 flex items-center justify-center px-4 py-10 text-left">
        <SignInFormClient />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
