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
              <a href='/admin/legal-pages' className='rounded-full h-11 px-6 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center transition-colors duration-200'>{locale==='fr'? 'Annuler':'Cancel'}</a>
              <button type='submit' form='legal-form' className='rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: '#2563eb' }}>{locale==='fr'? 'Enregistrer':'Save'}</button>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
