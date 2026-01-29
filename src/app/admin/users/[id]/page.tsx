import { getServerSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import UserEditClient from "./UserEditClient";
import Link from 'next/link';

export default async function AdminUserDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { lang?: string } }) {
  const { id } = params;
  const session = await getServerSession() as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  const user = await (prisma as any).user.findUnique({ where: { id } }).catch(() => null);
  if (!user) return notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Utilisateur" : "User"}</h1>
          <Link href="/admin/users" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <UserEditClient user={user} locale={locale} />
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
