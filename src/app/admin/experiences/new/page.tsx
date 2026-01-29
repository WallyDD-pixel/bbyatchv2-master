import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import ExperienceNewClient from "./ExperienceNewClient";

export default async function AdminExperiencesNewPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = await getServerSession() as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {} as { lang?: string };
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Nouvelle expérience" : "New experience"}</h1>
          <a href="/admin/experiences" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</a>
        </div>
        <ExperienceNewClient locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
