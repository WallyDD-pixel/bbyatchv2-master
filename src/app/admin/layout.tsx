import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n/messages";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  console.log('[AdminLayout] ===== START =====');
  console.log('[AdminLayout] Session exists:', !!session);
  console.log('[AdminLayout] Session:', JSON.stringify(session, null, 2));
  
  if (!session || !session.user) {
    console.log('[AdminLayout] ❌ No session or user, redirecting to /signin');
    redirect("/signin");
  }

  // Vérifier le rôle
  const role = (session.user as any)?.role || "user";
  console.log('[AdminLayout] Role:', role);
  
  if (role !== "admin") {
    console.log('[AdminLayout] ❌ Role is not admin, redirecting to /dashboard');
    redirect("/dashboard");
  }
  
  console.log('[AdminLayout] ✅ Access granted');
  console.log('[AdminLayout] ===== END =====');

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
      <main className="lg:ml-64 flex-1 pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
