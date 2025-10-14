import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { messages, type Locale } from '@/i18n/messages';
import MappingForm from './MappingForm';

export default async function AdminLegalPages({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any).role !== 'admin') redirect('/dashboard');
  const locale: Locale = searchParams?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  const pages = await (prisma as any).legalPage.findMany({ orderBy:{ id:'asc' } }).catch(()=>[]);

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-4xl mx-auto px-4 py-10 w-full'>
  <MappingForm />
  <div className='h-6' />
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Pages légales':'Legal pages'}</h1>
          <div className='flex items-center gap-2'>
            <Link href='/admin' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
            <Link href='/admin/legal-pages/new' className='text-sm rounded-full bg-[color:var(--primary)] text-white px-3 h-9 inline-flex items-center hover:opacity-90'>{locale==='fr'? 'Créer':'Create'}</Link>
          </div>
        </div>
        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='text-left text-black/70 bg-black/[0.035]'>
                <th className='py-2.5 px-3'>ID</th>
                <th className='py-2.5 px-3'>Slug</th>
                <th className='py-2.5 px-3'>Titre FR</th>
                <th className='py-2.5 px-3'>Titre EN</th>
                <th className='py-2.5 px-3 w-40'>{locale==='fr'? 'Actions':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {pages.length===0? (
                <tr><td colSpan={5} className='text-center py-8 text-black/60'>{locale==='fr'? 'Aucune page.':'No pages.'}</td></tr>
              ) : pages.map((p:any)=> (
                <tr key={p.id} className='border-t border-black/10'>
                  <td className='py-2.5 px-3'>{p.id}</td>
                  <td className='py-2.5 px-3'>{p.slug}</td>
                  <td className='py-2.5 px-3'>{p.titleFr}</td>
                  <td className='py-2.5 px-3'>{p.titleEn}</td>
                  <td className='py-2.5 px-3'>
                    <div className='flex items-center gap-2'>
                      <Link href={`/admin/legal-pages/${p.id}`} className='text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5'>{locale==='fr'? 'Éditer':'Edit'}</Link>
                      <a href={`/legal/${p.slug}`} target='_blank' className='text-[11px] rounded-full border border-black/15 px-3 h-7 inline-flex items-center hover:bg-black/5'>View</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
