import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";

export default async function AdminBoatsPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let boats: any[] = [];
  try {
    boats = await (prisma as any).boat.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Bateaux" : "Boats"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
            <Link href="/admin/boats/new" className="text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90">{locale === "fr" ? "Nouveau" : "New"}</Link>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Nom" : "Name"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Ville" : "City"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Prix/jour" : "Price/day"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Matin" : "AM"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Après‑midi" : "PM"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Dispo" : "Avail."}</th>
                <th className="py-2.5 px-3 text-right">{locale === "fr" ? "Actions" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {boats.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucun bateau." : "No boats."}</td></tr>
              ) : boats.map((b) => (
                <tr key={b.id} className="border-t border-black/10">
                  <td className="py-2.5 px-3 text-[11px] text-black/60">{b.slug}</td>
                  <td className="py-2.5 px-3">{b.name}</td>
                  <td className="py-2.5 px-3">{b.city || "-"}</td>
                  <td className="py-2.5 px-3">{b.pricePerDay ? `${b.pricePerDay}€` : "-"}</td>
                  <td className="py-2.5 px-3">{b.priceAm != null ? `${b.priceAm}€` : "-"}</td>
                  <td className="py-2.5 px-3">{b.pricePm != null ? `${b.pricePm}€` : "-"}</td>
                  <td className="py-2.5 px-3">{b.available ? "✔" : "✖"}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/boats/${b.id}`} className="inline-flex items-center rounded-full border border-black/15 bg-white text-xs h-8 px-3 hover:bg-black/5">{locale === "fr" ? "Voir / Éditer" : "View / Edit"}</Link>
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
