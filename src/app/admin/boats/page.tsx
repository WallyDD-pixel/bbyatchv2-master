import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import { BoatsTableClient } from "./BoatsTableClient";
import AdminInstructions from "@/components/AdminInstructions";

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
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{locale === "fr" ? "Bateaux" : "Boats"}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/admin" className="text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap">← {locale === "fr" ? "Retour" : "Back"}</Link>
              <Link href="/admin/boats/new" className="text-xs sm:text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center transition-colors whitespace-nowrap font-medium">{locale === "fr" ? "Nouveau" : "New"}</Link>
            </div>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les bateaux':'How to manage boats'}
            instructions={[
              {
                title: locale==='fr'?'Ajouter un bateau':'Add a boat',
                description: locale==='fr'?'Cliquez sur le bouton "Nouveau" pour créer un nouveau bateau. Remplissez tous les champs requis (nom, capacité, prix, etc.) et téléchargez une photo.':'Click on the "New" button to create a new boat. Fill in all required fields (name, capacity, price, etc.) and upload a photo.'
              },
              {
                title: locale==='fr'?'Modifier un bateau':'Edit a boat',
                description: locale==='fr'?'Cliquez sur le nom d\'un bateau dans le tableau pour accéder à la page d\'édition où vous pouvez modifier toutes les informations.':'Click on a boat name in the table to access the edit page where you can modify all information.'
              },
              {
                title: locale==='fr'?'Supprimer un bateau':'Delete a boat',
                description: locale==='fr'?'Utilisez le bouton "Supprimer" dans la page d\'édition. Attention : cette action est irréversible.':'Use the "Delete" button on the edit page. Warning: this action is irreversible.'
              },
              {
                title: locale==='fr'?'Gérer les prix':'Manage prices',
                description: locale==='fr'?'Vous pouvez définir des prix différents pour la journée complète, la demi-journée (matin/après-midi) et le coucher de soleil.':'You can set different prices for full day, half-day (morning/afternoon) and sunset.'
              },
              {
                title: locale==='fr'?'Options et extras':'Options and extras',
                description: locale==='fr'?'Ajoutez des options supplémentaires (skipper, équipement, etc.) avec leurs prix respectifs lors de la création ou modification.':'Add additional options (skipper, equipment, etc.) with their respective prices when creating or editing.'
              }
            ]}
          />
        </div>
        <BoatsTableClient boats={boats} locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
