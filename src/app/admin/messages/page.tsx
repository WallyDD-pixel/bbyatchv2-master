import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';
import MessageViewClient from './MessageViewClient';

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
        <MessageViewClient
          messages={contactMessages.map(m => ({
            id: m.id,
            message: m.message,
            name: m.name,
            email: m.email,
            phone: m.phone || undefined,
            boat: m.usedBoat ? (locale === 'fr' ? m.usedBoat.titleFr : m.usedBoat.titleEn) : undefined,
            slug: m.usedBoat?.slug,
            createdAt: m.createdAt,
            sourcePage: m.sourcePage,
          }))}
          locale={locale}
        />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
