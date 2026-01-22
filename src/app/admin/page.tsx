import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';

export default async function AdminPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");

  // Fallback DB si la session n'expose pas encore le rôle
  let role: string | undefined = (session.user as any)?.role;
  if (!role && session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      role = u?.role || "user";
    } catch {}
  }
  if ((role || "user") !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let stats = { users: 0, boats: 0, usedBoats: 0, experiences: 0, reservations: 0, gallery: 0, infoCards: 0, availability: 0 };
  try {
    const [users, boats, usedBoats, experiences, reservations, gallery, infoCards, availability] = await Promise.all([
      (prisma as any).user.count(),
      (prisma as any).boat.count(),
      (prisma as any).usedBoat.count(),
      (prisma as any).experience.count(),
      (prisma as any).reservation.count(),
      (prisma as any).galleryImage.count(),
      (prisma as any).infoCard.count(),
      (prisma as any).availabilitySlot.count(),
    ]);
    stats = { users, boats, usedBoats, experiences, reservations, gallery, infoCards, availability };
  } catch (e) {
    // fallback silencieux si Prisma n'est pas prêt
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{locale === "fr" ? "Tableau de bord" : "Dashboard"}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">{locale === "fr" ? "Bienvenue," : "Welcome,"} {session.user?.name ?? session.user?.email}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        {/* Stats Cards */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-gray-600 mb-1">{locale === "fr" ? "Utilisateurs" : "Users"}</div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.users}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-gray-600 mb-1">{locale === "fr" ? "Bateaux" : "Boats"}</div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.boats}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-gray-600 mb-1">{locale === "fr" ? "Expériences" : "Experiences"}</div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.experiences}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div className="text-sm text-gray-600 mb-1">{locale === "fr" ? "Réservations" : "Reservations"}</div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.reservations}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{locale === "fr" ? "Actions rapides" : "Quick Actions"}</h2>
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/boats/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">🛥️</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Nouveau bateau" : "New boat"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Ajouter un bateau" : "Add a boat"}</div>
            </div>
          </Link>
          <Link href="/admin/experiences/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">🌅</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Nouvelle expérience" : "New experience"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Créer une expérience" : "Create an experience"}</div>
            </div>
          </Link>
          <Link href="/admin/used-boats/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">⛵</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Bateau d'occasion" : "Used boat"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Ajouter un bateau" : "Add a boat"}</div>
            </div>
          </Link>
          <Link href="/admin/calendar" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">📆</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Calendrier" : "Calendar"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Voir les disponibilités" : "View availability"}</div>
            </div>
          </Link>
          <Link href="/admin/gallery/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">🖼️</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Nouvelle image" : "New image"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Ajouter à la galerie" : "Add to gallery"}</div>
            </div>
          </Link>
          <Link href="/admin/info-cards/new" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary)]/5 transition-colors group">
            <span className="text-2xl">ℹ️</span>
            <div>
              <div className="font-medium text-gray-900 group-hover:text-[color:var(--primary)]">{locale === "fr" ? "Nouvelle carte" : "New card"}</div>
              <div className="text-sm text-gray-500">{locale === "fr" ? "Créer une carte d'info" : "Create info card"}</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
