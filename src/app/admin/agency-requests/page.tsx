import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AgencyRequestsAdminPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  const sp = await (searchParams || Promise.resolve({} as any));
  const locale:Locale = (sp as any).lang==='en'? 'en':'fr';
  const t = messages[locale];

  let rows: any[] = [];
  try {
    rows = await (prisma as any).agencyRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include:{ user:{ select:{ email:true, firstName:true, lastName:true } }, boat:{ select:{ name:true } }, reservation:{ select:{ id:true, startDate:true } } }
    });
  } catch {}

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-7xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Demandes agence':'Agency requests'}</h1>
          <Link href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='text-left text-black/70 bg-black/[0.035]'>
                <th className='py-2.5 px-3'>ID</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Créé':'Created'}</th>
                <th className='py-2.5 px-3'>User</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Bateau':'Boat'}</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Dates':'Dates'}</th>
                <th className='py-2.5 px-3'>Part</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Passagers':'Pax'}</th>
                <th className='py-2.5 px-3'>Status</th>
                {/* Colonne Prix supprimée */}
                <th className='py-2.5 px-3'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 && (
                <tr><td colSpan={9} className='text-center py-8 text-black/60'>{locale==='fr'? 'Aucune demande.':'No requests.'}</td></tr>
              )}
              {rows.map(r=>{
                const start = r.startDate ? new Date(r.startDate).toISOString().slice(0,10):'';
                const end = r.endDate ? new Date(r.endDate).toISOString().slice(0,10): start;
                const dateDisplay = start + (end && end!==start? ' → '+end:'');
                const userName = (r.user?.firstName||'')+ (r.user?.lastName? ' '+r.user.lastName:'') || r.user?.email || '';
                return (
                  <tr key={r.id} className='border-t border-black/10'>
                    <td className='py-2.5 px-3 font-mono text:[11px]'>{r.id.slice(0,8)}</td>
                    <td className='py-2.5 px-3 text-xs'>{new Date(r.createdAt).toLocaleDateString(locale==='fr'? 'fr-FR':'en-GB')}</td>
                    <td className='py-2.5 px-3'>{userName}</td>
                    <td className='py-2.5 px-3'>{r.boat?.name||'—'}</td>
                    <td className='py-2.5 px-3'>{dateDisplay}</td>
                    <td className='py-2.5 px-3'>{r.part||'FULL'}</td>
                    <td className='py-2.5 px-3'>{r.passengers??'—'}</td>
                    <td className='py-2.5 px-3'><span className='inline-flex text-[11px] px-2 h-5 rounded-full border border-black/15 bg-black/5 capitalize'>{r.status}</span></td>
                    {/* Cellule prix supprimée */}
                    <td className='py-2.5 px-3'>
                      <div className='flex items-center gap-1 flex-wrap'>
                        <form action={`/api/admin/agency-requests/${r.id}`} method='post'>
                          <input type='hidden' name='_method' value='PATCH' />
                          <input type='hidden' name='status' value='approved' />
                          <button type='submit' disabled={r.status==='approved'} className='text-[11px] rounded-full px-3 h-7 inline-flex items-center border border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                            {locale==='fr'? 'Accepter':'Approve'}
                          </button>
                        </form>
                        <form action={`/api/admin/agency-requests/${r.id}`} method='post' data-confirm={r.status==='rejected'? '' : (locale==='fr'? 'Refuser cette demande ?':'Reject this request?')}>
                          <input type='hidden' name='_method' value='PATCH' />
                          <input type='hidden' name='status' value='rejected' />
                          <button type='submit' disabled={r.status==='rejected'} className='text-[11px] rounded-full px-3 h-7 inline-flex items-center border border-red-600/30 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                            {locale==='fr'? 'Refuser':'Reject'}
                          </button>
                        </form>
                        <form action={`/api/admin/agency-requests/${r.id}`} method='post'>
                          <input type='hidden' name='_method' value='PATCH' />
                          <input type='hidden' name='status' value='converted' />
                          <button type='submit' disabled={r.status==='converted'} className='text-[11px] rounded-full px-3 h-7 inline-flex items-center border border-indigo-600/30 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                            {locale==='fr'? 'Convertir':'Convert'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
      <script dangerouslySetInnerHTML={{ __html:`document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('form[data-confirm]').forEach(f=>{f.addEventListener('submit',e=>{const msg=f.getAttribute('data-confirm'); if(msg && !confirm(msg)) e.preventDefault();});});});` }} />
    </div>
  );
}
