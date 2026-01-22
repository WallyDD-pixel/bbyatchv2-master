import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import ExperienceEditClient from './ExperienceEditClient';

export default async function AdminExperienceEditPage({ params, searchParams }: { params: Promise<{ id:string }>, searchParams?: Promise<{ lang?: string }> }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role||'user';
  if(role!=='admin') redirect('/dashboard');
  // Next.js 15 : params et searchParams sont maintenant des Promises
  const { id: idParam } = await params;
  const sp = await (searchParams || Promise.resolve({}));
  const id = parseInt(idParam,10); if(isNaN(id)) notFound();
  const exp = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!exp) notFound();
  const locale = sp.lang==='en'? 'en':'fr';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale as any} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Modifier expérience':'Edit experience'}</h1>
          <Link href='/admin/experiences' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <ExperienceEditClient experience={exp} locale={locale as any} />
      </main>
      <Footer locale={locale as any} t={{} as any} />
    </div>
  );
}
