import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");

  // Vérifier le rôle
  let role: string | undefined = (session.user as any)?.role;
  if (!role && session.user?.email) {
    try {
      const u = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } });
      role = u?.role || "user";
    } catch {}
  }
  if ((role || "user") !== "admin") redirect("/dashboard");

  const locale: Locale = "fr"; // Par défaut, la sidebar utilisera useSearchParams côté client

  // Charger les statistiques pour la sidebar
  let stats = { users: 0, boats: 0, usedBoats: 0, experiences: 0, reservations: 0, gallery: 0, infoCards: 0 };
  try {
    const [users, boats, usedBoats, experiences, reservations, gallery, infoCards] = await Promise.all([
      (prisma as any).user.count().catch(() => 0),
      (prisma as any).boat.count().catch(() => 0),
      (prisma as any).usedBoat.count().catch(() => 0),
      (prisma as any).experience.count().catch(() => 0),
      (prisma as any).reservation.count().catch(() => 0),
      (prisma as any).galleryImage.count().catch(() => 0),
      (prisma as any).infoCard.count().catch(() => 0),
    ]);
    stats = { users, boats, usedBoats, experiences, reservations, gallery, infoCards };
  } catch (e) {
    // fallback silencieux
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar locale={locale} stats={stats} />
      
      {/* Main content */}
      <main className="lg:ml-64 flex-1">
        {children}
      </main>
    </div>
  );
}
