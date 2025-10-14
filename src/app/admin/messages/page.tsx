import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  const sp = searchParams || {};
  const locale: Locale = sp?.lang==='en' ? 'en':'fr';
  const t = messages[locale];

  let contactMessages: any[] = [];
  try {
    contactMessages = await (prisma as any).contactMessage.findMany({ orderBy:{ createdAt:'desc' }, take:200, include:{ usedBoat:{ select:{ id:true, slug:true, titleFr:true, titleEn:true } } } });
  } catch {}

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-7xl mx-auto w-full px-4 py-10'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Messages':'Messages'}</h1>
          <Link href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>

        <div className='rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='text-left text-black/70 bg-black/[0.035]'>
                <th className='py-2.5 px-3'>Date</th>
                <th className='py-2.5 px-3'>Nom</th>
                <th className='py-2.5 px-3'>Email</th>
                <th className='py-2.5 px-3'>{locale==='fr'? 'Bateau':'Boat'}</th>
                <th className='py-2.5 px-3'>Message</th>
                <th className='py-2.5 px-3'></th>
              </tr>
            </thead>
            <tbody>
              {contactMessages.length===0 && (
                <tr><td colSpan={6} className='py-10 text-center text-black/50 text-sm'>{locale==='fr'? 'Aucun message.':'No messages.'}</td></tr>
              )}
              {contactMessages.map(m=> (
                <tr key={m.id} className='border-t border-black/10 align-top hover:bg-black/[0.03]'>
                  <td className='py-3 px-3 whitespace-nowrap text-[11px] text-black/60'>{new Date(m.createdAt).toLocaleString(locale==='fr'? 'fr-FR':'en-US',{ dateStyle:'short', timeStyle:'short' })}</td>
                  <td className='py-3 px-3 whitespace-nowrap'>{m.name}</td>
                  <td className='py-3 px-3 whitespace-nowrap'><a href={`mailto:${m.email}`} className='text-[color:var(--primary)] hover:underline'>{m.email}</a></td>
                  <td className='py-3 px-3 whitespace-nowrap'>{m.usedBoat ? <a href={`/used-sale/${m.usedBoat.slug}`} className='text-[color:var(--primary)] hover:underline' target='_blank'>{locale==='fr'? m.usedBoat.titleFr : m.usedBoat.titleEn}</a> : '—'}</td>
                  <td className='py-3 px-3 max-w-[380px] text-[13px] leading-snug line-clamp-3'><pre className='whitespace-pre-wrap font-sans'>{m.message}</pre></td>
                  <td className='py-3 px-3 whitespace-nowrap'><button data-view="1" data-id={m.id} className='h-8 px-3 rounded-full text-[11px] font-medium border border-black/15 hover:bg-black/5'>{locale==='fr'? 'Voir':'View'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div id='message-modal' className='hidden fixed inset-0 z-40 items-center justify-center'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' data-close></div>
          <div className='relative w-full max-w-xl mx-auto rounded-2xl bg-white border border-black/10 shadow-xl p-6 flex flex-col gap-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-lg font-semibold' id='mm-title'>Message</h2>
                <p className='text-xs text-black/50' id='mm-meta'></p>
              </div>
              <button className='h-8 w-8 rounded-full border border-black/15 text-black/60 hover:bg-black/5' data-close aria-label='Close'>✕</button>
            </div>
            <div className='rounded-lg border border-black/10 bg-black/[0.02] p-4 max-h-[50vh] overflow-auto text-sm leading-relaxed font-sans whitespace-pre-wrap' id='mm-body'></div>
            <div className='flex justify-end gap-3'>
              <button className='h-9 px-4 rounded-full border border-black/15 text-[12px] hover:bg-black/5' data-close>{locale==='fr'? 'Fermer':'Close'}</button>
              <a id='mm-mail' href='#' className='h-9 px-4 rounded-full bg-[color:var(--primary)] text-white text-[12px] font-medium inline-flex items-center justify-center hover:brightness-110'>{locale==='fr'? 'Répondre':'Reply'}</a>
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{__html:`(()=>{const modal=document.getElementById('message-modal');if(!modal)return;const body=modal.querySelector('#mm-body');const meta=modal.querySelector('#mm-meta');const title=modal.querySelector('#mm-title');const mail=modal.querySelector('#mm-mail');const map=${JSON.stringify(contactMessages.reduce((acc,m)=>{acc[m.id]={message:m.message,name:m.name,email:m.email,boat:m.usedBoat?m.usedBoat.titleFr||m.usedBoat.titleEn:'',slug:m.usedBoat?m.usedBoat.slug:''};return acc;},{}))};function open(id){const d=map[id];if(!d)return;body.textContent=d.message;title.textContent=d.name;meta.textContent=(d.email||'')+(d.boat?' • '+d.boat:'');mail.href='mailto:'+d.email+'?subject=' + encodeURIComponent('Réponse: '+ (d.boat||'Demande'));modal.classList.remove('hidden');modal.classList.add('flex');document.body.style.overflow='hidden';}function close(){modal.classList.add('hidden');modal.classList.remove('flex');document.body.style.overflow='';}modal.addEventListener('click',e=>{const t=e.target; if(t instanceof HTMLElement && t.hasAttribute('data-close')) close();});document.querySelectorAll('button[data-view]').forEach(btn=>btn.addEventListener('click',()=>open(btn.getAttribute('data-id'))));document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});})();`}} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
