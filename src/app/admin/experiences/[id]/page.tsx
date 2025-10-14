import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default async function AdminExperienceEditPage({ params, searchParams }: { params:{ id:string }, searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role||'user';
  if(role!=='admin') redirect('/dashboard');
  const id = parseInt(params.id,10); if(isNaN(id)) notFound();
  const exp = await (prisma as any).experience.findUnique({ where:{ id } });
  if(!exp) notFound();
  const sp = searchParams || {};
  const locale = sp.lang==='en'? 'en':'fr';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale as any} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Modifier expérience':'Edit experience'}</h1>
          <Link href='/admin/experiences' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <form action={`/api/admin/experiences/${id}`} method='post' className='mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm' encType='multipart/form-data'>
          <input type='hidden' name='_method' value='PUT' />
          <div className='grid sm:grid-cols-2 gap-4'>
            <label className='grid gap-1 text-sm'><span>Slug</span><input name='slug' defaultValue={exp.slug} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (FR)':'Title (FR)'}</span><input required name='titleFr' defaultValue={exp.titleFr} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (EN)':'Title (EN)'}</span><input required name='titleEn' defaultValue={exp.titleEn} className='h-11 rounded-lg border border-black/15 px-3' /></label>
          </div>
          <div className='grid sm:grid-cols-2 gap-4'>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (FR)':'Description (FR)'}</span><textarea name='descFr' rows={4} defaultValue={exp.descFr||''} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (EN)':'Description (EN)'}</span><textarea name='descEn' rows={4} defaultValue={exp.descEn||''} className='rounded-lg border border-black/15 px-3 py-2' /></label>
          </div>
          <div className='grid sm:grid-cols-2 gap-4'>
            <label className='grid gap-1 text-sm'><span>Heure (FR)</span><input name='timeFr' defaultValue={exp.timeFr||''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Time (EN)</span><input name='timeEn' defaultValue={exp.timeEn||''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
          </div>
          <label className='grid gap-1 text-sm'><span>Image URL</span><input name='imageUrl' defaultValue={exp.imageUrl||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='/uploads/...' /></label>
          <label className='grid gap-1 text-sm'><span>Nouveau fichier image</span><input type='file' name='imageFile' accept='image/*' className='h-11 rounded-lg border border-black/15 px-3 bg-white' /></label>
          <div className='flex justify-between items-center pt-2'>
            {exp.imageUrl && <img src={exp.imageUrl} className='h-20 rounded border border-black/10 object-cover' alt='preview' />}
            <div className='flex gap-2 ml-auto'>
              <Link href='/admin/experiences' className='rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5'>{locale==='fr'? 'Annuler':'Cancel'}</Link>
              <button type='submit' className='rounded-full h-10 px-4 bg-[color:var(--primary)] text-white hover:opacity-90'>{locale==='fr'? 'Enregistrer':'Save'}</button>
              <form action={`/api/admin/experiences/${id}`} method='post' className='inline'>
                <input type='hidden' name='_method' value='DELETE' />
                <button id='delExpBtn' type='submit' formNoValidate className='rounded-full h-10 px-4 bg-red-600 text-white hover:brightness-110'>{locale==='fr'? 'Supprimer':'Delete'}</button>
              </form>
            </div>
          </div>
        </form>
      </main>
      <Footer locale={locale as any} t={{} as any} />
      <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('DOMContentLoaded',()=>{ const b=document.getElementById('delExpBtn'); if(b){ b.addEventListener('click', (e)=>{ if(!confirm('${locale==='fr'? 'Supprimer cette expérience ?':'Delete this experience?'}')){ e.preventDefault(); } }); } });` }} />
    </div>
  );
}
