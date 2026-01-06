import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import DeleteLegalPageButton from '../DeleteLegalPageButton';
import LegalPageForm from '../LegalPageForm';

export default async function AdminLegalEdit({ params, searchParams }: { params:{ id:string }, searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any).role !== 'admin') redirect('/dashboard');
  const locale: Locale = searchParams?.lang==='en'? 'en':'fr';
  const t = messages[locale];
  const id = parseInt(params.id,10); if(Number.isNaN(id)) notFound();
  const page = await (prisma as any).legalPage.findUnique({ where:{ id } });
  if(!page) notFound();

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Modifier page légale':'Edit legal page'}</h1>
          <a href='/admin/legal-pages' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</a>
        </div>
        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm'>
          <LegalPageForm 
            slug={page.slug}
            locale={locale}
            defaultValues={page}
            formAction={`/api/admin/legal-pages/${id}`}
            method='PUT'
          />
          <div className='flex justify-between items-center pt-2 mt-4'>
            <DeleteLegalPageButton id={id} locale={locale} />
            <div className='flex gap-2'>
              <a href='/admin/legal-pages' className='rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5'>{locale==='fr'? 'Annuler':'Cancel'}</a>
              <button type='submit' form='legal-form' className='rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90'>{locale==='fr'? 'Enregistrer':'Save'}</button>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
