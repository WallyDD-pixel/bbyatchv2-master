import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import UsedBoatEditFormClient from './UsedBoatEditFormClient';

export default async function EditUsedBoatPage({ params, searchParams }: { params:{ id:string }, searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user || (session.user as any).role !== 'admin') redirect('/');
  const id = parseInt(params.id,10);
  if(isNaN(id)) notFound();
  const boat = await (prisma as any).usedBoat.findUnique({ where:{ id } });
  if(!boat) notFound();
  const sp = searchParams || {};
  const locale = sp.lang==='en' ? 'en' : 'fr';
  const photoList: string[] = boat.photoUrls ? (()=>{ try { return JSON.parse(boat.photoUrls); } catch{return []; } })() : [];

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale as any} />
      <main className='flex-1 w-full max-w-5xl mx-auto px-4 py-10'>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? `Modifier bateau d'occasion` : 'Edit used boat'}</h1>
        </div>
        <UsedBoatEditFormClient
          boatId={id}
          boat={boat}
          initialMainImage={boat.mainImage}
          initialPhotos={photoList}
          locale={locale as any}
        />
      </main>
      <Footer locale={locale as any} t={{} as any} />
    </div>
  );
}
