import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Footer from '@/components/Footer';
import HeaderBar from '@/components/HeaderBar';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';
import AdminInstructions from '@/components/AdminInstructions';

export const dynamic = 'force-dynamic';

export default async function AgencyRequestsAdminPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale: Locale = resolvedSearchParams?.lang==='en' ? 'en':'fr';
  const t = messages[locale];

  let rows: any[] = [];
  try {
    rows = await (prisma as any).agencyRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include:{ user:{ select:{ email:true, firstName:true, lastName:true, phone:true } }, boat:{ select:{ name:true } }, reservation:{ select:{ id:true, startDate:true } } }
    });
  } catch {}

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 w-full'>
        <div className='mb-4 sm:mb-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4'>
            <h1 className='text-xl sm:text-2xl font-bold'>{locale==='fr'? 'Demandes agence':'Agency requests'}</h1>
            <Link href='/admin' className='text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap self-start sm:self-auto'>← {locale==='fr'? 'Retour':'Back'}</Link>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les demandes d\'agence':'How to manage agency requests'}
            instructions={[
              {
                title: locale==='fr'?'Voir les demandes':'View requests',
                description: locale==='fr'?'Le tableau affiche toutes les demandes de réservation provenant d\'agences partenaires. Cliquez sur "Voir" pour afficher les détails complets.':'The table displays all reservation requests from partner agencies. Click on "View" to display full details.'
              },
              {
                title: locale==='fr'?'Statuts des demandes':'Request statuses',
                description: locale==='fr'?'Les demandes peuvent avoir le statut "En attente", "Approuvé", "Refusé" ou "Converti" (converti en réservation).':'Requests can have status "Pending", "Approved", "Rejected" or "Converted" (converted to reservation).'
              },
              {
                title: locale==='fr'?'Approuver une demande':'Approve a request',
                description: locale==='fr'?'Dans la page de détails, vous pouvez approuver une demande qui créera automatiquement une réservation.':'In the details page, you can approve a request which will automatically create a reservation.'
              },
              {
                title: locale==='fr'?'Informations affichées':'Displayed information',
                description: locale==='fr'?'Chaque demande affiche l\'utilisateur, le bateau, les dates, le type de créneau et le nombre de passagers.':'Each request displays the user, boat, dates, time slot type and number of passengers.'
              }
            ]}
          />
        </div>
        <div className='mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-black/10 bg-white p-3 sm:p-5 shadow-sm overflow-x-auto -mx-3 sm:mx-0'>
          <table className='min-w-full text-xs sm:text-sm'>
            <thead>
              <tr className='text-left text-black/70 bg-black/[0.035]'>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell'>ID</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell'>{locale==='fr'? 'Créé':'Created'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell'>{locale==='fr'? 'Utilisateur':'User'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell'>{locale==='fr'? 'Téléphone':'Phone'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3'>{locale==='fr'? 'Bateau':'Boat'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell'>{locale==='fr'? 'Dates':'Dates'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell'>{locale==='fr'? 'Partie':'Part'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell'>{locale==='fr'? 'Passagers':'Pax'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell'>{locale==='fr'? 'Commentaire / Special needs':'Comment / Special needs'}</th>
                <th className='py-2 sm:py-2.5 px-2 sm:px-3'>{locale==='fr'? 'Statut':'Status'}</th>
                {/* Colonne Prix supprimée */}
                <th className='py-2 sm:py-2.5 px-2 sm:px-3'>{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 && (
                <tr><td colSpan={11} className='text-center py-6 sm:py-8 text-black/60 text-xs sm:text-sm'>{locale==='fr'? 'Aucune demande.':'No requests.'}</td></tr>
              )}
              {rows.map(r=>{
                const start = r.startDate ? new Date(r.startDate).toISOString().slice(0,10):'';
                const end = r.endDate ? new Date(r.endDate).toISOString().slice(0,10): start;
                const dateDisplay = start + (end && end!==start? ' → '+end:'');
                const userName = (r.user?.firstName||'')+ (r.user?.lastName? ' '+r.user.lastName:'') || r.user?.email || '';
                // Parser les métadonnées pour extraire specialNeeds
                let specialNeeds = '';
                if (r.metadata) {
                  try {
                    const metadataObj = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
                    if (metadataObj.specialNeeds) {
                      const raw = typeof metadataObj.specialNeeds === 'string' ? metadataObj.specialNeeds : String(metadataObj.specialNeeds);
                      try { specialNeeds = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch { specialNeeds = raw; }
                      // Limiter à 50 caractères pour l'affichage dans le tableau
                      if (specialNeeds.length > 50) {
                        specialNeeds = specialNeeds.substring(0, 50) + '...';
                      }
                    }
                  } catch {}
                }
                return (
                  <tr key={r.id} className='border-t border-black/10'>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 font-mono text-[9px] sm:text-[11px] hidden md:table-cell'>{r.id.slice(0,8)}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 text-[9px] sm:text-xs hidden lg:table-cell'>{new Date(r.createdAt).toLocaleDateString(locale==='fr'? 'fr-FR':'en-GB')}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell text-[10px] sm:text-xs'>{userName}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell text-[10px] sm:text-xs'>
                      {r.user?.phone ? (
                        <a href={`tel:${r.user.phone}`} className='text-[color:var(--primary)] hover:underline'>
                          {r.user.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 font-medium text-[10px] sm:text-xs'>{r.boat?.name||'—'}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell text-[9px] sm:text-xs'>{dateDisplay}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell text-[9px] sm:text-xs'>{r.part ? (r.part === 'AM' ? (locale==='fr'? 'Matin':'AM') : r.part === 'PM' ? (locale==='fr'? 'Après-midi':'PM') : r.part) : (locale==='fr'? 'Journée':'FULL')}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden lg:table-cell text-[10px] sm:text-xs'>{r.passengers??'—'}</td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3 hidden md:table-cell text-[9px] sm:text-xs text-black/70 max-w-[180px] truncate' title={specialNeeds || undefined}>
                      {specialNeeds || '—'}
                    </td>
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3'>
                      <span className='inline-flex items-center justify-center text-[9px] sm:text-[11px] px-1.5 sm:px-2 h-4 sm:h-5 rounded-full border border-black/15 bg-black/5'>
                        {locale==='fr' 
                          ? (r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvé' : r.status === 'rejected' ? 'Refusé' : r.status === 'converted' ? 'Converti' : r.status)
                          : r.status
                        }
                      </span>
                    </td>
                    {/* Cellule prix supprimée */}
                    <td className='py-2 sm:py-2.5 px-2 sm:px-3'>
                      <Link 
                        href={`/admin/agency-requests/${r.id}${locale==='en'? '?lang=en':''}`}
                        className='text-[9px] sm:text-[11px] rounded-full px-2 sm:px-3 h-6 sm:h-7 inline-flex items-center justify-center border border-black/15 text-black/70 hover:bg-black/5 transition-colors whitespace-nowrap'
                      >
                        {locale==='fr'? 'Voir':'View'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
