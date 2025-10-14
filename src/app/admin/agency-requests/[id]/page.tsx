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
            <span className='text-xs text-black/50'>{locale==='fr'? 'Partie':'Part'}: {row.part||'FULL'}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Passagers':'Passengers'}</span>
            <span>{row.passengers ?? '—'}</span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>Status</span>
            <span><span className='inline-flex text-[11px] px-2 h-5 rounded-full border border-black/15 bg-black/5 capitalize'>{row.status}</span></span>
          </div>
          <div className='grid gap-1 text-sm'>
            <span className='text-black/50'>{locale==='fr'? 'Montant total':'Total amount'}</span>
            <span>{row.totalPrice? (row.totalPrice/100).toFixed(2)+' €':'—'}</span>
          </div>
          {row.metadata && <div className='grid gap-1 text-sm'><span className='text-black/50'>Metadata</span><pre className='text-[11px] bg-black/5 rounded p-2 overflow-auto max-h-60'>{row.metadata}</pre></div>}
          <div className='pt-4 flex gap-2 flex-wrap'>
            <form action={`/api/admin/agency-requests/${row.id}`} method='post' className='flex gap-2 flex-wrap'>
              <input type='hidden' name='_method' value='PATCH' />
              <select name='status' defaultValue={row.status} className='h-10 rounded-full border border-black/15 px-3 text-sm'>
                <option value='pending'>pending</option>
                <option value='approved'>approved</option>
                <option value='rejected'>rejected</option>
                <option value='converted'>converted</option>
              </select>
              <button className='h-10 px-5 rounded-full bg-[color:var(--primary)] text-white text-sm font-semibold hover:opacity-90'>{locale==='fr'? 'Mettre à jour':'Update'}</button>
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
