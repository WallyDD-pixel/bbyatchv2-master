import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import DeleteExperienceButton from './DeleteExperienceButton';

export default async function AdminExperiencesPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let experiences: any[] = [];
  try {
    experiences = await (prisma as any).experience.findMany({ orderBy: { id: "desc" }, take: 50 });
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Expériences" : "Experiences"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
            <Link href="/admin/experiences/new" className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90">{locale === "fr" ? "Nouveau" : "New"}</Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (FR)" : "Title (FR)"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (EN)" : "Title (EN)"}</th>
                <th className="py-2.5 px-3 w-40">{locale === 'fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {experiences.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucune expérience." : "No experiences."}</td></tr>
              ) : experiences.map((e) => (
                <tr key={e.id} className="border-t border-black/10">
                  <td className="py-2.5 px-3 text-[11px] text-black/60">{e.slug}</td>
                  <td className="py-2.5 px-3">{e.titleFr}</td>
                  <td className="py-2.5 px-3">{e.titleEn}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/experiences/${e.id}`} className="text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5">{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <DeleteExperienceButton id={e.id} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
