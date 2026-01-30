import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';
import MessageViewClient from './MessageViewClient';
import AdminInstructions from '@/components/AdminInstructions';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }){
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if(role !== 'admin') redirect('/dashboard');
  
  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale: Locale = resolvedSearchParams?.lang==='en' ? 'en':'fr';
  const t = messages[locale];

  let contactMessages: any[] = [];
  try {
    contactMessages = await (prisma as any).contactMessage.findMany({ 
      orderBy:{ createdAt:'desc' }, 
      take:200, 
      include:{ usedBoat:{ select:{ id:true, slug:true, titleFr:true, titleEn:true } } },
      // Pas de filtre where - récupère tous les messages y compris "autre-ville"
    });
    console.log(`Found ${contactMessages.length} contact messages, including ${contactMessages.filter((m: any) => m.sourcePage === 'autre-ville').length} autre-ville requests`);
  } catch (e: any) {
    console.error('Error fetching contact messages:', e);
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <main className='flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10'>
        <div className='mb-4 sm:mb-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4'>
            <h1 className='text-xl sm:text-2xl font-bold'>{locale==='fr'? 'Messages':'Messages'}</h1>
            <Link href='/admin' className='text-xs sm:text-sm rounded-full border border-black/15 px-3 sm:px-4 h-8 sm:h-9 inline-flex items-center hover:bg-black/5 transition-colors whitespace-nowrap self-start sm:self-auto'>← {locale==='fr'? 'Retour':'Back'}</Link>
          </div>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment gérer les messages':'How to manage messages'}
            instructions={[
              {
                title: locale==='fr'?'Voir les messages':'View messages',
                description: locale==='fr'?'Le tableau affiche tous les messages de contact reçus, y compris les demandes "Autre ville". Cliquez sur "Voir" pour afficher le message complet.':'The table displays all contact messages received, including "Other city" requests. Click on "View" to display the full message.'
              },
              {
                title: locale==='fr'?'Types de messages':'Message types',
                description: locale==='fr'?'Les messages peuvent provenir de la page de contact, des demandes de bateaux d\'occasion ou des demandes "Autre ville". Les demandes "Autre ville" sont marquées avec un badge spécial.':'Messages can come from the contact page, used boat requests or "Other city" requests. "Other city" requests are marked with a special badge.'
              },
              {
                title: locale==='fr'?'Contacter le client':'Contact the client',
                description: locale==='fr'?'Cliquez sur l\'email dans le tableau pour ouvrir votre client de messagerie et répondre directement au client.':'Click on the email in the table to open your email client and reply directly to the client.'
              },
              {
                title: locale==='fr'?'Voir les détails':'View details',
                description: locale==='fr'?'Cliquez sur "Voir" pour afficher toutes les informations du message dans une modal détaillée, y compris le bateau concerné si applicable.':'Click on "View" to display all message information in a detailed modal, including the related boat if applicable.'
              }
            ]}
          />
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
                  <td className='py-3 px-3 whitespace-nowrap'>
                    {m.sourcePage === 'autre-ville' ? (
                      <span className='inline-flex items-center gap-1'>
                        <span className='text-xs'>📍</span>
                        <span className='font-medium'>{m.name}</span>
                        <span className='text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700'>Autre ville</span>
                      </span>
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className='py-3 px-3 whitespace-nowrap'><a href={`mailto:${m.email}`} className='text-[color:var(--primary)] hover:underline'>{m.email}</a></td>
                  <td className='py-3 px-3 whitespace-nowrap'>
                    {m.sourcePage === 'autre-ville' ? (
                      <span className='text-xs text-black/50'>Demande autre ville</span>
                    ) : (
                      m.usedBoat ? <a href={`/used-sale/${m.usedBoat.slug}`} className='text-[color:var(--primary)] hover:underline' target='_blank'>{locale==='fr'? m.usedBoat.titleFr : m.usedBoat.titleEn}</a> : '—'
                    )}
                  </td>
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
