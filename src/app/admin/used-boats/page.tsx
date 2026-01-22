import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';
import DeleteUsedBoatButton from './DeleteUsedBoatButton';
import AdminInstructions from "@/components/AdminInstructions";

export default async function AdminUsedBoatsPage({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any)?.role !== 'admin') redirect('/dashboard');
  const sp = searchParams || {};
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];
  let boats: any[] = [];
  try {
    boats = await (prisma as any).usedBoat.findMany({ orderBy:[{ sort:'asc' }, { createdAt:'desc' }], take:200 });
  } catch{}
  const money = (v:number)=> (v/1).toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €';
  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{locale==='fr'? 'Bateaux d\'occasion':'Used boats'}</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale==='fr'? 'Retour':'Back'}</Link>
            <Link href="/admin/used-boats/new" className="text-sm rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 h-9 inline-flex items-center font-semibold shadow-sm transition-colors" style={{ backgroundColor: '#2563eb' }}>{locale==='fr'? 'Nouveau':'New'}</Link>
          </div>
        </div>
        <AdminInstructions
          locale={locale}
          title={locale==='fr'?'Comment gérer les bateaux d\'occasion':'How to manage used boats'}
          instructions={[
            {
              title: locale==='fr'?'Ajouter un bateau':'Add a boat',
              description: locale==='fr'?'Cliquez sur "Nouveau" pour créer une nouvelle annonce de bateau d\'occasion. Remplissez les informations (titre, année, longueur, prix, etc.) et ajoutez des photos.':'Click on "New" to create a new used boat listing. Fill in information (title, year, length, price, etc.) and add photos.'
            },
            {
              title: locale==='fr'?'Modifier un bateau':'Edit a boat',
              description: locale==='fr'?'Cliquez sur "Éditer" dans le tableau pour modifier toutes les informations d\'un bateau d\'occasion.':'Click on "Edit" in the table to modify all information of a used boat.'
            },
            {
              title: locale==='fr'?'Statut des bateaux':'Boat status',
              description: locale==='fr'?'Les bateaux peuvent avoir le statut "listed" (en vente), "sold" (vendu) ou "draft" (brouillon). Le statut détermine si le bateau est visible sur le site.':'Boats can have status "listed" (for sale), "sold" (sold) or "draft" (draft). Status determines if the boat is visible on the site.'
            },
            {
              title: locale==='fr'?'Ordre d\'affichage':'Display order',
              description: locale==='fr'?'Le champ "Sort" détermine l\'ordre d\'affichage. Les bateaux avec un nombre plus petit apparaissent en premier.':'The "Sort" field determines display order. Boats with a smaller number appear first.'
            },
            {
              title: locale==='fr'?'Supprimer un bateau':'Delete a boat',
              description: locale==='fr'?'Utilisez le bouton "Supprimer" dans le tableau. Attention : cette action est irréversible.':'Use the "Delete" button in the table. Warning: this action is irreversible.'
            }
          ]}
        />
      </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm align-middle">
            <thead>
              <tr className="text-left text-black/70 bg-black/[0.035]">
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Titre FR':'Title FR'}</th>
                <th className="py-2.5 px-3">Année</th>
                <th className="py-2.5 px-3">m</th>
                <th className="py-2.5 px-3">Prix</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {boats.length===0 && <tr><td colSpan={7} className="py-8 text-center text-black/60">{locale==='fr'? 'Aucun bateau.':'No boats.'}</td></tr>}
              {boats.map(b=> (
                <tr key={b.id} className="border-t border-black/10 hover:bg-black/[0.03]">
                  <td className="py-2.5 px-3 text-[11px] text-black/60">{b.slug}</td>
                  <td className="py-2.5 px-3">{b.titleFr}</td>
                  <td className="py-2.5 px-3">{b.year}</td>
                  <td className="py-2.5 px-3">{b.lengthM}</td>
                  <td className="py-2.5 px-3 text-right">{money(b.priceEur)}</td>
                  <td className="py-2.5 px-3"><span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[10px] font-semibold ${b.status==='listed'? 'bg-emerald-100 text-emerald-700': b.status==='sold'? 'bg-red-100 text-red-700':'bg-black/10 text-black/60'}`}>{b.status}</span></td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/used-boats/${b.id}`} className="text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5">{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <DeleteUsedBoatButton id={b.id} locale={locale} />
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
