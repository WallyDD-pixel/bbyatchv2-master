import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPartLabel } from '@/lib/part-labels';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

async function handleAgencyRequestAction(formData: FormData) {
  'use server';
  const { getServerSession } = await import('@/lib/auth');
  const id = formData.get('id') as string;
  const action = formData.get('action') as string;
  const session = await getServerSession() as any;
  if (!session?.user) return;
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } });
  if (me?.role !== 'admin') return;
  if (!id || !action) return;

  const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', convert: 'converted' };
  const newStatus = statusMap[action];
  if (!newStatus) return;

  const agencyRequest = await prisma.agencyRequest.findUnique({
    where: { id },
    select: {
      userId: true,
      boatId: true,
      startDate: true,
      endDate: true,
      part: true,
      passengers: true,
      totalPrice: true,
      locale: true,
      currency: true,
      reservationId: true,
      metadata: true,
    },
  });
  if (!agencyRequest) return;

  if (newStatus === 'converted' && !agencyRequest.reservationId) {
    const { findBoatReservationConflict, blockAvailabilityForNewReservation } = await import('@/lib/reservation-availability');
    const overlap = agencyRequest.boatId
      ? await findBoatReservationConflict(
          agencyRequest.boatId,
          agencyRequest.startDate,
          agencyRequest.endDate,
          agencyRequest.part || 'FULL'
        )
      : null;
    if (overlap) redirect('/admin/agency/requests?error=overlap');

    const reservation = await prisma.reservation.create({
      data: {
        userId: agencyRequest.userId,
        boatId: agencyRequest.boatId,
        startDate: agencyRequest.startDate,
        endDate: agencyRequest.endDate,
        part: agencyRequest.part,
        passengers: agencyRequest.passengers,
        totalPrice: agencyRequest.totalPrice,
        status: 'pending_deposit',
        locale: agencyRequest.locale,
        currency: agencyRequest.currency || 'eur',
        metadata: agencyRequest.metadata ?? undefined,
      },
    });
    await blockAvailabilityForNewReservation(reservation.boatId, reservation.startDate, reservation.endDate);
    await prisma.agencyRequest.update({
      where: { id },
      data: { status: 'converted', reservationId: reservation.id },
    });
    return;
  }

  await prisma.agencyRequest.update({ where: { id }, data: { status: newStatus } });
}

export default async function AdminAgencyRequestsPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }){
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role!=='admin') redirect('/dashboard');

  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  let requests: any[] = [];
  try {
    requests = await prisma.agencyRequest.findMany({ orderBy:{ createdAt:'desc' }, take:150, include:{ user:{ select:{ email:true, firstName:true, lastName:true } }, boat:{ select:{ name:true, slug:true } }, reservation:{ select:{ id:true } } } });
  } catch {}

  const dateFmt = (d: Date)=> d.toISOString().slice(0,10);
  const partLabel = (p:string|null|undefined) => formatPartLabel(p, locale);
  const statusLabel = (s:string)=>{
    switch(s){
      case 'pending': return locale==='fr'? 'En attente':'Pending';
      case 'approved': return locale==='fr'? 'Approuvée':'Approved';
      case 'rejected': return locale==='fr'? 'Refusée':'Rejected';
      case 'converted': return locale==='fr'? 'Convertie':'Converted';
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
      <main className='flex-1 max-w-7xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Demandes agence':'Agency requests'}</h1>
          <a href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</a>
        </div>
        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto'>
          <table className='min-w-full text-xs md:text-sm align-middle'>
            <thead>
              <tr className='text-left text-black/70 bg-black/[0.035]'>
                <th className='py-2.5 px-3'>Ref</th>
                <th className='py-2.5 px-3'>Agence</th>
                <th className='py-2.5 px-3'>Email</th>
                <th className='py-2.5 px-3'>Boat</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Début':'Start'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Fin':'End'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Partie':'Part'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Prix estimé':'Est. price'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Statut':'Status'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {requests.length===0 && (
                <tr><td colSpan={10} className='py-8 text-center text-black/60'>{locale==='fr'? 'Aucune demande.':'No requests.'}</td></tr>
              )}
              {requests.map(r=>{
                const userName = [r.user?.firstName,r.user?.lastName].filter(Boolean).join(' ') || r.user?.email;
                return (
                  <tr key={r.id} className='border-t border-black/10 hover:bg-black/[0.03]'>
                    <td className='py-2.5 px-3 text-[10px] text-black/60 max-w-[90px] truncate' title={r.id}>{r.id.slice(-6)}</td>
                    <td className='py-2.5 px-3 whitespace-nowrap'>{userName}</td>
                    <td className='py-2.5 px-3 whitespace-nowrap text-black/60'>{r.user?.email}</td>
                    <td className='py-2.5 px-3 whitespace-nowrap'>{r.boat? <a href={`/boats/${r.boat.slug}`} className='text-[color:var(--primary)] hover:underline'>{r.boat.name}</a> : '—'}</td>
                    <td className='py-2.5 px-3 whitespace-nowrap'>{dateFmt(new Date(r.startDate))}</td>
                    <td className='py-2.5 px-3 whitespace-nowrap'>{dateFmt(new Date(r.endDate))}</td>
                    <td className='py-2.5 px-3'>{partLabel(r.part)}</td>
                    <td className='py-2.5 px-3 text-right font-medium'>{r.totalPrice!=null? (r.totalPrice.toLocaleString(locale==='fr'? 'fr-FR':'en-US')+' €'):'—'}</td>
                    <td className='py-2.5 px-3'><span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[10px] font-semibold ${badge(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td className='py-2.5 px-3 min-w-[170px]'>
                      <form action={handleAgencyRequestAction} className='flex items-center gap-1'>
                        <input type='hidden' name='id' value={r.id} />
                        {r.status==='pending' && <button name='action' value='approve' className='h-7 px-3 rounded-md bg-emerald-500 text-white text-[11px] hover:brightness-110'>✔</button>}
                        {r.status==='pending' && <button name='action' value='reject' className='h-7 px-3 rounded-md bg-red-500 text-white text-[11px] hover:brightness-110'>✖</button>}
                        {r.status==='approved' && <button name='action' value='convert' className='h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] transition-colors'>↺</button>}
                      </form>
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
