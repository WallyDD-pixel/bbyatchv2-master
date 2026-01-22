import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import UsersActionsClient from "@/app/admin/users/UsersActionsClient";
import NewUserForm from "@/app/admin/users/NewUserForm";
import AdminInstructions from "@/components/AdminInstructions";
import Link from "next/link";

export default async function AdminUsersPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let users: any[] = [];
  let selfId: string | null = null;
  try {
    users = await (prisma as any).user.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    if (session.user?.email) {
      const me = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      selfId = me?.id ?? null;
    }
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{locale === "fr" ? "Utilisateurs" : "Users"}</h1>
            <Link href="/admin" className="text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap self-start sm:self-auto">← {locale === "fr" ? "Retour" : "Back"}</Link>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les utilisateurs':'How to manage users'}
            instructions={[
              {
                title: locale==='fr'?'Créer un utilisateur':'Create a user',
                description: locale==='fr'?'Utilisez le formulaire à droite pour créer un nouvel utilisateur. Remplissez l\'email, le nom et choisissez le rôle (user ou admin).':'Use the form on the right to create a new user. Fill in email, name and choose the role (user or admin).'
              },
              {
                title: locale==='fr'?'Modifier un utilisateur':'Edit a user',
                description: locale==='fr'?'Cliquez sur "Voir / Éditer" pour accéder à la page de détails où vous pouvez modifier les informations et le rôle.':'Click on "View / Edit" to access the details page where you can modify information and role.'
              },
              {
                title: locale==='fr'?'Gérer les rôles':'Manage roles',
                description: locale==='fr'?'Les utilisateurs peuvent avoir le rôle "user" (client) ou "admin" (administrateur). Seuls les admins peuvent accéder au panneau d\'administration.':'Users can have the role "user" (client) or "admin" (administrator). Only admins can access the admin panel.'
              },
              {
                title: locale==='fr'?'Supprimer un utilisateur':'Delete a user',
                description: locale==='fr'?'Utilisez le bouton de suppression dans les actions. Vous ne pouvez pas supprimer votre propre compte.':'Use the delete button in actions. You cannot delete your own account.'
              }
            ]}
          />
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-black/70 bg-black/[0.035]">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Nom</th>
                  <th className="py-2.5 px-3">Rôle</th>
                  <th className="py-2.5 px-3">Créé</th>
                  <th className="py-2.5 px-3 text-right">{locale === "fr" ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucun utilisateur." : "No users."}</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-t border-black/10">
                    <td className="py-2.5 px-3 text-[11px] text-black/60">{u.id}</td>
                    <td className="py-2.5 px-3">{u.email}</td>
                    <td className="py-2.5 px-3">{u.name || "-"}</td>
                    <td className="py-2.5 px-3"><span className="inline-flex items-center rounded-full bg-black/5 border border-black/10 px-2 h-6 text-xs">{u.role || "user"}</span></td>
                    <td className="py-2.5 px-3">{new Date(u.createdAt).toLocaleString(locale)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/users/${u.id}`} className="inline-flex items-center rounded-full border border-black/15 bg-white text-xs h-8 px-3 hover:bg-black/5">{locale === "fr" ? "Voir / Éditer" : "View / Edit"}</Link>
                        <UsersActionsClient userId={u.id} disabled={selfId === u.id} locale={locale} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-4">{locale === "fr" ? "Créer un utilisateur" : "Create user"}</h2>
            <NewUserForm locale={locale} />
          </div>
        </div>
      </main>
    </div>
  );
}
