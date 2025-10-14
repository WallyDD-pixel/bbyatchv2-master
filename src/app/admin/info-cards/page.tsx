import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import DeleteInfoCardButton from './DeleteInfoCardButton';
import Link from 'next/link';

export default async function AdminInfoCardsPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let cards: any[] = [];
  try {
    cards = await (prisma as any).infoCard.findMany({ orderBy: { sort: "asc" } });
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        <Link href="/admin" className="mb-6 inline-block text-sm rounded-full border border-blue-400/30 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700">← Retour page d'accueil complète</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Cartes d'info" : "Info cards"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
            <Link href="/admin/info-cards/new" className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (FR)" : "Title (FR)"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (EN)" : "Title (EN)"}</th>
                <th className="py-2.5 px-3">Sort</th>
                <th className="py-2.5 px-3 w-44">{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucune carte." : "No cards."}</td></tr>
              ) : cards.map((c) => (
                <tr key={c.id} className="border-t border-black/10">
                  <td className="py-2.5 px-3">{c.id}</td>
                  <td className="py-2.5 px-3">{c.titleFr}</td>
                  <td className="py-2.5 px-3">{c.titleEn}</td>
                  <td className="py-2.5 px-3">{c.sort ?? 0}</td>
                  <td className="py-2.5 px-3">
                    <div className='flex items-center gap-2'>
                      <Link href={`/admin/info-cards/${c.id}`} className='text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5'>{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <DeleteInfoCardButton id={c.id} locale={locale} />
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
