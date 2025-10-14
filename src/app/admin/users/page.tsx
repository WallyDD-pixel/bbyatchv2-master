import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import UsersActionsClient from "@/app/admin/users/UsersActionsClient";
import NewUserForm from "@/app/admin/users/NewUserForm";

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
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Utilisateurs" : "Users"}</h1>
          <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
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
      <Footer locale={locale} t={t} />
    </div>
  );
}
