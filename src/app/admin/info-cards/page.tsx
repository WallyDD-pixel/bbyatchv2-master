import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import DeleteInfoCardButton from './DeleteInfoCardButton';
import Link from 'next/link';
import AdminInstructions from "@/components/AdminInstructions";

export default async function AdminInfoCardsPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = await searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let cards: any[] = [];
  try {
    cards = await (prisma as any).infoCard.findMany({ orderBy: { sort: "asc" } });
  } catch {}

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Cartes d'info" : "Info cards"}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
            <Link href="/admin/info-cards/new" className="text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 h-9 inline-flex items-center font-semibold shadow-sm transition-colors" style={{ backgroundColor: '#2563eb' }}>{locale === "fr" ? "Créer" : "Create"}</Link>
          </div>
        </div>
        <AdminInstructions
          locale={locale}
          title={locale==='fr'?'Comment gérer les cartes d\'information':'How to manage info cards'}
          instructions={[
            {
              title: locale==='fr'?'Créer une carte':'Create a card',
              description: locale==='fr'?'Cliquez sur "Créer" pour ajouter une nouvelle carte d\'information. Remplissez les titres en français et anglais, ajoutez une description et une image.':'Click on "Create" to add a new info card. Fill in titles in French and English, add a description and an image.'
            },
            {
              title: locale==='fr'?'Modifier une carte':'Edit a card',
              description: locale==='fr'?'Cliquez sur "Éditer" dans le tableau pour modifier toutes les informations d\'une carte.':'Click on "Edit" in the table to modify all information of a card.'
            },
            {
              title: locale==='fr'?'Ordre d\'affichage':'Display order',
              description: locale==='fr'?'Le champ "Sort" détermine l\'ordre d\'affichage des cartes. Les cartes avec un nombre plus petit apparaissent en premier.':'The "Sort" field determines the display order of cards. Cards with a smaller number appear first.'
            },
            {
              title: locale==='fr'?'Supprimer une carte':'Delete a card',
              description: locale==='fr'?'Utilisez le bouton "Supprimer" dans le tableau. Attention : cette action est irréversible.':'Use the "Delete" button in the table. Warning: this action is irreversible.'
            }
          ]}
        />
      </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (FR)" : "Title (FR)"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (EN)" : "Title (EN)"}</th>
                <th className="py-2.5 px-3">Sort</th>
                <th className="py-2.5 px-3 w-44">{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucune carte." : "No cards."}</td></tr>
              ) : cards.map((c) => (
                <tr key={c.id} className="border-t border-black/10">
                  <td className="py-2.5 px-3">{c.id}</td>
                  <td className="py-2.5 px-3">{c.titleFr}</td>
                  <td className="py-2.5 px-3">{c.titleEn}</td>
                  <td className="py-2.5 px-3">{c.sort ?? 0}</td>
                  <td className="py-2.5 px-3">
                    <div className='flex items-center gap-2'>
                      <Link href={`/admin/info-cards/${c.id}`} className='text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5'>{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <DeleteInfoCardButton id={c.id} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
