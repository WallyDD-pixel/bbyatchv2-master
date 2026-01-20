import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';


interface AgencyRequestRow {
  id: string;
  startDate: Date;
  endDate: Date;
  part: string | null;
  passengers: number | null;
  status: string;
  totalPrice: number | null;
  metadata: string | null;
  user: { email: string | null; firstName: string | null; lastName: string | null } | null;
  boat: { name: string | null } | null;
  reservation: { id: string } | null;
}

export default async function AgencyRequestDetailPage(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ [key:string]: string | string[] | undefined }> }
) {
  const session = await getServerSession(auth);
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role!=='admin') redirect('/dashboard');
  const { id } = await params;
  const sp = await (searchParams || Promise.resolve({} as any));
  const langParam = Array.isArray((sp as any).lang)? (sp as any).lang[0] : (sp as any).lang;
  const errorParam = Array.isArray((sp as any).error)? (sp as any).error[0] : (sp as any).error;
  const updatedParam = Array.isArray((sp as any).updated)? (sp as any).updated[0] : (sp as any).updated;
  const locale:Locale = langParam==='en'? 'en':'fr';
  const t = messages[locale];

  const row = await prisma.agencyRequest.findUnique({
    where:{ id },
    select:{
      id:true,
      startDate:true,
      endDate:true,
      part:true,
      passengers:true,
      status:true,
      totalPrice:true,
      metadata:true,
      user:{ select:{ email:true, firstName:true, lastName:true } },
      boat:{ select:{ name:true } },
      reservation:{ select:{ id:true } }
    }
  }) as AgencyRequestRow | null;
  if(!row) notFound();
  const start = row.startDate ? new Date(row.startDate).toISOString().slice(0,10):'';
  const end = row.endDate ? new Date(row.endDate).toISOString().slice(0,10): start;
  const dateDisplay = start + (end && end!==start? ' → '+end:'');
  const userName = (row.user?.firstName||'')+(row.user?.lastName? ' '+row.user.lastName:'') || row.user?.email || '';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Demande agence':'Agency request'}</h1>
          <Link href='/admin/agency-requests' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        
        {/* Message d'erreur */}
        {errorParam === 'overlap' && (
          <div className='mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm'>
            <div className='flex items-start gap-3'>
              <div className='text-2xl'>⚠️</div>
              <div className='flex-1'>
                <h2 className='font-semibold text-red-900 mb-1'>{locale==='fr'? 'Impossible de convertir':'Cannot convert'}</h2>
                <p className='text-sm text-red-800/80'>
                  {locale==='fr' 
                    ? 'Un conflit existe avec une autre réservation pour ces dates. Veuillez vérifier le calendrier et libérer les créneaux nécessaires avant de convertir cette demande.'
                    : 'A conflict exists with another reservation for these dates. Please check the calendar and free up the necessary slots before converting this request.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message de succès */}
        {updatedParam === '1' && !errorParam && (
          <div className='mt-6 rounded-2xl border border-green-200 bg-green-50/50 p-5 shadow-sm'>
            <div className='flex items-start gap-3'>
              <div className='text-2xl'>✅</div>
              <div className='flex-1'>
                <p className='text-sm text-green-800/80'>
                  {locale==='fr' 
                    ? 'La demande a été mise à jour avec succès.'
                    : 'The request has been updated successfully.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Section d'informations */}
        <div className='mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm'>
          <div className='flex items-start gap-3'>
            <div className='text-2xl'>ℹ️</div>
            <div className='flex-1 space-y-2'>
              <h2 className='font-semibold text-blue-900'>{locale==='fr'? 'Demande de réservation d\'agence':'Agency booking request'}</h2>
              <p className='text-sm text-blue-800/80'>
                {locale==='fr' 
                  ? 'Cette demande provient d\'une agence partenaire. Avant d\'accepter cette demande, veuillez suivre les étapes suivantes :'
                  : 'This request comes from a partner agency. Before accepting this request, please follow these steps:'
                }
              </p>
              <ul className='text-sm text-blue-800/80 space-y-1.5 mt-3 list-disc list-inside'>
                <li>
                  {locale==='fr'? 'Vérifier la disponibilité du bateau aux dates demandées':'Check boat availability for the requested dates'}
                  {row.boatId && (
                    <Link 
                      href={`/admin/calendar?boatId=${row.boatId}&from=${start}&to=${end}${locale==='en'? '&lang=en':''}`}
                      className='ml-2 text-blue-600 hover:underline font-medium'
                      target='_blank'
                    >
                      {locale==='fr'? '(Voir le calendrier)':'(View calendar)'}
                    </Link>
                  )}
                </li>
                <li>{locale==='fr'? 'Contacter l\'agence pour confirmer les détails et valider la demande':'Contact the agency to confirm details and validate the request'}</li>
                <li>{locale==='fr'? 'S\'assurer que toutes les informations sont correctes (dates, nombre de passagers, prix)':'Ensure all information is correct (dates, number of passengers, price)'}</li>
                <li>{locale==='fr'? 'Une fois acceptée, la demande peut être convertie en réservation':'Once approved, the request can be converted into a reservation'}</li>
              </ul>
              {row.user?.email && (
                <div className='mt-3 pt-3 border-t border-blue-200'>
                  <p className='text-xs text-blue-700/70 mb-1'>{locale==='fr'? 'Contact agence':'Agency contact'}:</p>
                  <a 
                    href={`mailto:${row.user.email}?subject=${encodeURIComponent(locale==='fr'? 'Demande de réservation':'Booking request')} ${row.id.slice(0,8)}`}
                    className='text-sm text-blue-700 hover:underline font-medium'
                  >
                    ✉ {row.user.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-5'>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'ID':'ID'}</span>
            <code className='text-xs bg-black/5 rounded px-2 py-1'>{row.id}</code>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Utilisateur':'User'}</span>
            <span>{userName}</span>
            <span className='text-xs text-black/60'>{row.user?.email}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Bateau':'Boat'}</span>
            <span>{row.boat?.name || '—'}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Dates':'Dates'}</span>
            <span>{dateDisplay}</span>
            <span className='text-xs text-black/50'>{locale==='fr'? 'Partie':'Part'}: {row.part ? (row.part === 'AM' ? (locale==='fr'? 'Matin':'AM') : row.part === 'PM' ? (locale==='fr'? 'Après-midi':'PM') : row.part) : (locale==='fr'? 'Journée':'FULL')}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Passagers':'Passengers'}</span>
            <span>{row.passengers ?? '—'}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Statut':'Status'}</span>
            <span>
              <span className='inline-flex text-[11px] px-2 h-5 rounded-full border border-black/15 bg-black/5'>
                {locale==='fr' 
                  ? (row.status === 'pending' ? 'En attente' : row.status === 'approved' ? 'Approuvé' : row.status === 'rejected' ? 'Refusé' : row.status === 'converted' ? 'Converti' : row.status)
                  : row.status
                }
              </span>
            </span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Montant total':'Total amount'}</span>
            <span>{row.totalPrice? row.totalPrice.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €':'—'}</span>
          </div>
          {row.metadata && (() => {
            let metadataObj: any = {};
            try {
              metadataObj = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            } catch {}
            return (
              <div className='grid gap-2 text-sm'>
                <span className='text-black/50'>{locale==='fr'? 'Informations complémentaires':'Additional information'}</span>
                <div className='bg-black/5 rounded-lg p-4 space-y-3 text-xs'>
                  {metadataObj.childrenCount && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Nombre d\'enfants':'Number of children'}: </span>
                      <span>{metadataObj.childrenCount}</span>
                    </div>
                  )}
                  {metadataObj.waterToys !== undefined && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Jeux d\'eau':'Water toys'}: </span>
                      <span>{metadataObj.waterToys === 'yes' || metadataObj.waterToys === true ? (locale==='fr'? 'Oui':'Yes') : (locale==='fr'? 'Non':'No')}</span>
                    </div>
                  )}
                  {metadataObj.wantsExcursion && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Excursion':'Excursion'}: </span>
                      <span>{locale==='fr'? 'Oui':'Yes'}</span>
                    </div>
                  )}
                  {metadataObj.specialNeeds && (
                    <div>
                      <span className='font-semibold text-black/70 block mb-1'>{locale==='fr'? 'Besoins spéciaux':'Special needs'}: </span>
                      <p className='text-black/70 whitespace-pre-line'>{decodeURIComponent(metadataObj.specialNeeds)}</p>
                    </div>
                  )}
                  {metadataObj.optionIds && Array.isArray(metadataObj.optionIds) && metadataObj.optionIds.length > 0 && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Options sélectionnées':'Selected options'}: </span>
                      <span>{metadataObj.optionIds.join(', ')}</span>
                    </div>
                  )}
                  {metadataObj.departurePort && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Port de départ':'Departure port'}: </span>
                      <span>{metadataObj.departurePort}</span>
                    </div>
                  )}
                  {metadataObj.skipperRequired && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale==='fr'? 'Skipper requis':'Skipper required'}: </span>
                      <span>{locale==='fr'? 'Oui':'Yes'}</span>
                      {metadataObj.effectiveSkipperPrice && (
                        <span className='ml-2 text-black/50'>({metadataObj.effectiveSkipperPrice}€ HT/jour)</span>
                      )}
                    </div>
                  )}
                  {(metadataObj.boatCapacity || metadataObj.boatLength || metadataObj.boatSpeed) && (
                    <div className='pt-2 border-t border-black/10'>
                      <span className='font-semibold text-black/70 block mb-1'>{locale==='fr'? 'Caractéristiques du bateau':'Boat specifications'}:</span>
                      <ul className='space-y-0.5 text-black/60'>
                        {metadataObj.boatCapacity && <li>• {locale==='fr'? 'Capacité':'Capacity'}: {metadataObj.boatCapacity} {locale==='fr'? 'personnes':'people'}</li>}
                        {metadataObj.boatLength && <li>• {locale==='fr'? 'Longueur':'Length'}: {metadataObj.boatLength}m</li>}
                        {metadataObj.boatSpeed && <li>• {locale==='fr'? 'Vitesse':'Speed'}: {metadataObj.boatSpeed} {locale==='fr'? 'nœuds':'knots'}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <div className='pt-4 flex gap-2 flex-wrap'>
            <form action={`/api/admin/agency-requests/${row.id}`} method='post' className='flex gap-2 flex-wrap'>
              <input type='hidden' name='_method' value='PATCH' />
              <select name='status' defaultValue={row.status} className='h-10 rounded-full border border-black/15 px-3 text-sm'>
                <option value='pending'>{locale==='fr'? 'En attente':'pending'}</option>
                <option value='approved'>{locale==='fr'? 'Approuvé':'approved'}</option>
                <option value='rejected'>{locale==='fr'? 'Refusé':'rejected'}</option>
                <option value='converted'>{locale==='fr'? 'Converti':'converted'}</option>
              </select>
              <button className='h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors'>{locale==='fr'? 'Mettre à jour':'Update'}</button>
            </form>
            {/* Remplacement du onSubmit par data-confirm + script global */}
            <form action={`/api/admin/agency-requests/${row.id}`} method='post' data-confirm={locale==='fr'? 'Supprimer ?':'Delete?'}>
              <input type='hidden' name='_method' value='DELETE' />
              <button className='h-10 px-4 rounded-full bg-red-600 text-white text-sm font-medium hover:brightness-110'>{locale==='fr'? 'Supprimer':'Delete'}</button>
            </form>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
      {/* Script confirmation (même logique que la page liste) */}
      <script dangerouslySetInnerHTML={{ __html:`document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('form[data-confirm]').forEach(f=>{f.addEventListener('submit',e=>{const msg=f.getAttribute('data-confirm'); if(msg && !confirm(msg)) e.preventDefault();});});});` }} />
    </div>
  );
}
