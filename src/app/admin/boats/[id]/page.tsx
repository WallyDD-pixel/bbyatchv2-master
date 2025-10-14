import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import BoatEditClient from "./BoatEditClient";
import Link from 'next/link';

export default async function AdminBoatDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { lang?: string } }) {
  const { id } = params;
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  const rawBoat = await (prisma as any).boat.findUnique({ where: { id: Number(id) }, include:{ options:true, boatExperiences:{ include:{ experience:true } } } }).catch(() => null);
  if (!rawBoat) return notFound();
  const experiences = await (prisma as any).experience.findMany({ orderBy:{ id:'asc' } });
  const safeParse = (v: any) => {
    if (!v || typeof v !== 'string') return [];
    try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : []; } catch { return []; }
  };
  const boat = {
    ...rawBoat,
    videoUrls: safeParse(rawBoat.videoUrls),
    photoUrls: safeParse(rawBoat.photoUrls),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Bateau" : "Boat"}</h1>
          <Link href="/admin/boats" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <BoatEditClient boat={{...boat, boatExperiences: rawBoat.boatExperiences, allExperiences: experiences}} locale={locale} />
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
