import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import Link from "next/link";
import DeleteExperienceButton from './DeleteExperienceButton';
import AdminInstructions from "@/components/AdminInstructions";

export default async function AdminExperiencesPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  let experiences: any[] = [];
  try {
    experiences = await (prisma as any).experience.findMany({ orderBy: { id: "desc" }, take: 50 });
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{locale === "fr" ? "Expériences" : "Experiences"}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/admin" className="text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap">← {locale === "fr" ? "Retour" : "Back"}</Link>
              <Link href="/admin/experiences/new" className="text-xs sm:text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center transition-colors whitespace-nowrap font-medium">{locale === "fr" ? "Nouveau" : "New"}</Link>
            </div>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les expériences':'How to manage experiences'}
            instructions={[
              {
                title: locale==='fr'?'Créer une expérience':'Create an experience',
                description: locale==='fr'?'Cliquez sur "Nouveau" pour créer une nouvelle expérience. Remplissez les titres en français et anglais, ajoutez une description et une photo.':'Click on "New" to create a new experience. Fill in titles in French and English, add a description and a photo.'
              },
              {
                title: locale==='fr'?'Modifier une expérience':'Edit an experience',
                description: locale==='fr'?'Cliquez sur "Éditer" dans le tableau pour modifier toutes les informations d\'une expérience.':'Click on "Edit" in the table to modify all information of an experience.'
              },
              {
                title: locale==='fr'?'Gérer les disponibilités':'Manage availability',
                description: locale==='fr'?'Les expériences peuvent avoir des créneaux de disponibilité définis dans le calendrier. Sélectionnez l\'expérience dans le calendrier pour voir ses créneaux.':'Experiences can have availability slots defined in the calendar. Select the experience in the calendar to see its slots.'
              },
              {
                title: locale==='fr'?'Supprimer une expérience':'Delete an experience',
                description: locale==='fr'?'Utilisez le bouton "Supprimer" dans le tableau. Attention : cette action est irréversible.':'Use the "Delete" button in the table. Warning: this action is irreversible.'
              }
            ]}
          />
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (FR)" : "Title (FR)"}</th>
                <th className="py-2.5 px-3">{locale === "fr" ? "Titre (EN)" : "Title (EN)"}</th>
                <th className="py-2.5 px-3 w-40">{locale === 'fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {experiences.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-black/60">{locale === "fr" ? "Aucune expérience." : "No experiences."}</td></tr>
              ) : experiences.map((e) => (
                <tr key={e.id} className="border-t border-black/10">
                  <td className="py-2.5 px-3 text-[11px] text-black/60">{e.slug}</td>
                  <td className="py-2.5 px-3">{e.titleFr}</td>
                  <td className="py-2.5 px-3">{e.titleEn}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/experiences/${e.id}`} className="text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5">{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <DeleteExperienceButton id={e.id} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
