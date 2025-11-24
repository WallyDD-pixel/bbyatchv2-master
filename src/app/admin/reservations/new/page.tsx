import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import CreateReservationForm from './CreateReservationForm';

export default async function AdminCreateReservationPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = (sp.lang === "en") ? "en" : "fr";
  const t = messages[locale];

  // Récupérer les utilisateurs avec le rôle "agency"
  let agencyUsers: any[] = [];
  try {
    agencyUsers = await (prisma as any).user.findMany({
      where: { role: 'agency' },
      select: { id: true, email: true, firstName: true, lastName: true, name: true },
      orderBy: { email: 'asc' }
    });
  } catch {}

  // Récupérer tous les bateaux avec leurs options
  let boats: any[] = [];
  try {
    boats = await (prisma as any).boat.findMany({
      where: { available: true },
      include: { options: { select: { id: true, label: true, price: true } } },
      orderBy: { name: 'asc' }
    });
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Créer une réservation pour une agence" : "Create reservation for agency"}</h1>
          <Link href="/admin/reservations" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <CreateReservationForm 
            locale={locale} 
            agencyUsers={agencyUsers}
            boats={boats}
          />
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

