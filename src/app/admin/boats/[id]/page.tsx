import { getServerSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import BoatEditClient from "./BoatEditClient";
import Link from 'next/link';

export default async function AdminBoatDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const session = await getServerSession() as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale: Locale = resolvedSearchParams.lang === "en" ? "en" : "fr";
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
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Bateau" : "Boat"}</h1>
          <Link href="/admin/boats" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <BoatEditClient boat={{...boat, boatExperiences: rawBoat.boatExperiences, allExperiences: experiences}} locale={locale} />
        </div>
      </main>
    </div>
  );
}
