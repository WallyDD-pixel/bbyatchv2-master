import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import UsedBoatEditClient from './UsedBoatEditClient';
import UsedBoatEditForm from './UsedBoatEditForm';

export default async function EditUsedBoatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ lang?: string }> }){
  const session = await getServerSession() as any;
  if(!session?.user || (session.user as any).role !== 'admin') redirect('/');
  
  // Next.js 15: params and searchParams are Promises
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if(isNaN(id)) notFound();
  
  const boat = await (prisma as any).usedBoat.findUnique({ where:{ id } });
  if(!boat) notFound();
  
  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = resolvedSearchParams.lang==='en' ? 'en' : 'fr';
  const photoList: string[] = boat.photoUrls ? (()=>{ try { return JSON.parse(boat.photoUrls); } catch{return []; } })() : [];

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale as any} />
      <main className='flex-1 w-full max-w-5xl mx-auto px-4 py-10'>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? `Modifier bateau d'occasion` : 'Edit used boat'}</h1>
          <Link href='/admin/used-boats' className='text-sm rounded-full border border-black/15 px-4 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <form action="/api/admin/used-boats/update" method="post" className='mt-6 grid gap-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm' encType='multipart/form-data'>
          <input type='hidden' name='id' value={id} />
          
          <UsedBoatEditForm 
            boat={boat}
            photoList={photoList}
            locale={locale as any}
          />

          {/* Ligne Nom + Slug */}
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'>
              <span>Nom *</span>
              <input name='titleFr' defaultValue={boat.titleFr} required className='h-11 rounded-lg border border-black/15 px-3' />
            </label>
            <label className='grid gap-1 text-sm'>
              <span>Slug</span>
              <input name='slug' defaultValue={boat.slug} className='h-11 rounded-lg border border-black/15 px-3' placeholder='ranieri' />
              <span className='text-xs text-black/50'>Modifiable pour corriger les erreurs de slug</span>
            </label>
          </div>
          <input type='hidden' name='titleEn' value='' />

          {/* Specs */}
          <div className='grid md:grid-cols-3 gap-5'>
            <label className='grid gap-1 text-sm'><span>Année *</span><input required name='year' type='number' defaultValue={boat.year} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Longueur (m) *</span><input required step='0.01' name='lengthM' type='number' defaultValue={boat.lengthM} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'>
              <span>Prix EUR (laisser vide pour "nous consulter")</span>
              <input name='priceEur' type='number' defaultValue={boat.priceEur || ''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='Ex: 150000' />
            </label>
            <label className='grid gap-1 text-sm'><span>Moteurs</span><input name='engines' defaultValue={boat.engines||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='2x Volvo IPS...' /></label>
            <label className='grid gap-1 text-sm'><span>Heures moteur</span><input name='engineHours' type='number' defaultValue={boat.engineHours??''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Carburant</span><input name='fuelType' defaultValue={boat.fuelType||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='diesel' /></label>
          </div>

          {/* Vidéos */}
          <UsedBoatEditClient boat={boat} locale={locale as any} />

          {/* Résumé & Description */}
          <label className='grid gap-1 text-sm'><span>Résumé</span><input name='summaryFr' defaultValue={boat.summaryFr||''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
          <input type='hidden' name='summaryEn' value='' />
          <label className='grid gap-1 text-sm'><span>Description</span><textarea name='descriptionFr' rows={6} className='rounded-lg border border-black/15 px-3 py-2 resize-y' defaultValue={boat.descriptionFr||''} /></label>
          <input type='hidden' name='descriptionEn' value='' />

          {/* Status & Sort */}
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'><span>Status</span><select name='status' defaultValue={boat.status} className='h-11 rounded-lg border border-black/15 px-3 bg-white'><option value='listed'>listed</option><option value='sold'>sold</option><option value='draft'>draft</option></select></label>
            <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input name='sort' type='number' defaultValue={boat.sort??0} className='h-11 rounded-lg border border-black/15 px-3' /></label>
          </div>

          <div className='flex justify-end gap-3 pt-4 border-t border-black/10 mt-4'>
            <Link href='/admin/used-boats' className='h-11 px-6 rounded-full border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center transition-colors duration-200'>Annuler</Link>
            <button type='submit' className='h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: '#2563eb' }}>Enregistrer</button>
          </div>
        </form>
      </main>
      <Footer locale={locale as any} t={{} as any} />
    </div>
  );
}
