import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export default async function AgencyDashboard({ searchParams }: { searchParams?: Promise<{ lang?: string }> | { lang?: string } }){
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  const userEmail = session.user.email as string;
  const user = await prisma.user.findUnique({ where:{ email: userEmail }, select:{ id:true, role:true } });
  if(!user) redirect('/signin');
  if(user.role!=='agency') redirect('/dashboard');

  const sp = await (searchParams || Promise.resolve({} as any));
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  // Demandes agence de l'utilisateur
  let requests: any[] = [];
  try {
    requests = await prisma.agencyRequest.findMany({ where:{ userId: user.id }, orderBy:{ createdAt:'desc' }, include:{ boat:{ select:{ name:true, slug:true } }, reservation:{ select:{ id:true, status:true } } } });
  } catch {}

  // Réservations converties (optionnel: afficher séparément)
  const dateFmt = (d: Date)=> d.toISOString().slice(0,10);
  const partLabel = (p:string|null|undefined) => p==='FULL'? (locale==='fr'? 'Journée entière':'Full day') : p==='AM'? (locale==='fr'? 'Matin':'Morning') : p==='PM'? (locale==='fr'? 'Après-midi':'Afternoon') : '—';
  const statusLabel = (s:string)=>{
    switch(s){
      case 'pending': return locale==='fr'? 'En attente':'Pending';
      case 'approved': return locale==='fr'? 'Acceptée':'Approved';
      case 'rejected': return locale==='fr'? 'Refusée':'Rejected';
      case 'converted': return locale==='fr'? 'Terminée':'Completed';
      default: return s;
    }
  };
  const badge = (s:string)=>{
    switch(s){
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-blue-100 text-blue-700';
      default: return 'bg-black/10 text-black/60';
    }
  };

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-6xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold'>{locale==='fr'? 'Espace agence':'Agency dashboard'}</h1>
            <p className='mt-1 text-black/70'>{locale==='fr'? 'Vos demandes de réservation':'Your booking requests'}</p>
          </div>
          <Link href={locale==='fr'? '/?lang=fr#fleet':'/?lang=en#fleet'} className='rounded-full bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 flex items-center text-sm font-medium transition-colors'>{locale==='fr'? 'Nouvelle demande':'New request'}</Link>
        </div>

        <div className='mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>{locale==='fr'? 'Demandes':'Requests'}</h2>
            <span className='text-xs text-black/50'>{requests.length} {locale==='fr'? 'entrée(s)':'item(s)'}</span>
          </div>
          <div className='mt-4 overflow-x-auto hidden md:block'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-black/70 bg-black/[0.035]'>
                  <th className='py-2.5 pl-3 pr-4 rounded-l-md'>ID</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Bateau':'Boat'}</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Début':'Start'}</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Fin':'End'}</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Partie':'Part'}</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Statut':'Status'}</th>
                  <th className='py-2.5 px-4'>{locale==='fr'? 'Réservation':'Reservation'}</th>
                  <th className='py-2.5 pl-4 pr-3 rounded-r-md text-right'>{locale==='fr'? 'Prix estimé':'Est. price'}</th>
                </tr>
              </thead>
              <tbody>
                {requests.length===0 && (
                  <tr className='border-t border-black/10'><td colSpan={8} className='py-8 text-center text-black/60'>{locale==='fr'? 'Aucune demande.':'No requests.'}</td></tr>
                )}
                {requests.map(r => (
                  <tr key={r.id} className='border-t border-black/5 hover:bg-black/[0.025]'>
                    <td className='py-2.5 pl-3 pr-4 text-[11px] text-black/60'>{r.id.slice(-6)}</td>
                    <td className='py-2.5 px-4 whitespace-nowrap'>{r.boat? <Link href={`/boats/${r.boat.slug}`} className='text-[color:var(--primary)] hover:underline'>{r.boat.name}</Link> : '—'}</td>
                    <td className='py-2.5 px-4 whitespace-nowrap'>{dateFmt(new Date(r.startDate))}</td>
                    <td className='py-2.5 px-4 whitespace-nowrap'>{dateFmt(new Date(r.endDate))}</td>
                    <td className='py-2.5 px-4'>{partLabel(r.part)}</td>
                    <td className='py-2.5 px-4'><span className={`inline-flex items-center rounded-full px-2.5 h-6 text-xs font-semibold ${badge(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td className='py-2.5 px-4'>{r.reservation? <a href={`/api/invoices/${r.reservation.id}`} className='text-xs underline'>{locale==='fr'? 'Voir':'View'}</a> : '—'}</td>
                    <td className='py-2.5 pl-4 pr-3 text-right font-medium'>{r.totalPrice!=null? (r.totalPrice.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €'):'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className='md:hidden mt-4 space-y-3'>
            {requests.length===0 && <div className='rounded-xl border border-black/10 p-5 text-center text-black/60 text-sm'>{locale==='fr'? 'Aucune demande.':'No requests.'}</div>}
            {requests.map(r => (
              <div key={r.id} className='rounded-xl border border-black/10 bg-white/70 p-4 shadow-sm'>
                <div className='flex justify-between items-start gap-3'>
                  <div>
                    <div className='font-semibold text-[color:var(--primary)]'>{r.boat?.name || '—'}</div>
                    <div className='mt-1 text-xs text-black/60'>{dateFmt(new Date(r.startDate))} → {dateFmt(new Date(r.endDate))}</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-semibold ${badge(r.status)}`}>{statusLabel(r.status)}</span>
                </div>
                <div className='mt-3 grid grid-cols-2 gap-3 text-xs'>
                  <div className='space-y-1'><div className='font-medium text-black/70'>{locale==='fr'? 'Partie':'Part'}</div><div className='text-sm font-semibold'>{partLabel(r.part)}</div></div>
                  <div className='space-y-1'><div className='font-medium text-black/70'>ID</div><div className='text-sm font-semibold'>{r.id.slice(-6)}</div></div>
                  <div className='space-y-1'><div className='font-medium text-black/70'>{locale==='fr'? 'Réservation':'Reservation'}</div><div className='text-sm font-semibold'>{r.reservation? <a href={`/api/invoices/${r.reservation.id}`} className='underline'>PDF</a> : '—'}</div></div>
                  <div className='space-y-1'><div className='font-medium text-black/70'>{locale==='fr'? 'Prix':'Price'}</div><div className='text-sm font-semibold'>{r.totalPrice!=null? (r.totalPrice.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €'):'—'}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
