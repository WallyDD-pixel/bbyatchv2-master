import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import ImageUploadClient from '../ImageUploadClient';

export default async function AdminInfoCardEditPage({ params, searchParams }: { params: Promise<{ id:string }>, searchParams?: Promise<{ lang?: string }> }){
  const { id: idStr } = await params;
  const id = parseInt(idStr,10); if(isNaN(id)) notFound();
  const session = await getServerSession() as any;
  if(!session?.user) redirect('/signin');
  const role = (session.user as any)?.role||'user';
  if(role!=='admin') redirect('/dashboard');
  const card = await (prisma as any).infoCard.findUnique({ where:{ id } });
  if(!card) notFound();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const locale = resolvedSearchParams.lang==='en'? 'en':'fr';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale as any} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Modifier carte':'Edit card'}</h1>
          <Link href='/admin/info-cards' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <form action={`/api/admin/info-cards/${id}`} method='post' className='mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm' encType='multipart/form-data'>
          <input type='hidden' name='_method' value='PUT' />
          <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (FR)':'Title (FR)'}</span><input name='titleFr' defaultValue={card.titleFr} required className='h-11 rounded-lg border border-black/15 px-3' /></label>
          <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (EN)':'Title (EN)'}</span><input name='titleEn' defaultValue={card.titleEn} required className='h-11 rounded-lg border border-black/15 px-3' /></label>
          <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (FR)':'Description (FR)'}</span><textarea name='descFr' rows={4} defaultValue={card.descFr||''} className='rounded-lg border border-black/15 px-3 py-2' /></label>
          <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (EN)':'Description (EN)'}</span><textarea name='descEn' rows={4} defaultValue={card.descEn||''} className='rounded-lg border border-black/15 px-3 py-2' /></label>
          <div className='border-t border-black/10 pt-4 mt-2'>
            <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Contenu détaillé (page dédiée)':'Detailed content (dedicated page)'}</h3>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Texte détaillé (FR)':'Detailed text (FR)'}</span><textarea name='contentFr' rows={6} defaultValue={card.contentFr||''} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Texte complet affiché sur la page dédiée...':'Full text displayed on dedicated page...'} /></label>
            <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Texte détaillé (EN)':'Detailed text (EN)'}</span><textarea name='contentEn' rows={6} defaultValue={card.contentEn||''} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Full text displayed on dedicated page...':'Full text displayed on dedicated page...'} /></label>
          </div>
          <div className='border-t border-black/10 pt-4 mt-2'>
            <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Bouton CTA (optionnel)':'CTA Button (optional)'}</h3>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'URL du lien':'Link URL'}</span><input name='ctaUrl' type='url' defaultValue={card.ctaUrl||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='https://...' /></label>
            <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Label du bouton (FR)':'Button label (FR)'}</span><input name='ctaLabelFr' defaultValue={card.ctaLabelFr||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder={locale==='fr'? 'En savoir plus':'Learn more'} /></label>
            <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Label du bouton (EN)':'Button label (EN)'}</span><input name='ctaLabelEn' defaultValue={card.ctaLabelEn||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='Learn more' /></label>
          </div>
          <ImageUploadClient locale={locale} existingImageUrl={card.imageUrl} />
          <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input type='number' name='sort' defaultValue={card.sort??0} className='h-11 rounded-lg border border-black/15 px-3' /></label>
          <div className='flex justify-end gap-2 pt-4 border-t border-black/10 mt-4'>
            <Link href='/admin/info-cards' className='rounded-full h-11 px-6 border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium inline-flex items-center transition-colors duration-200'>{locale==='fr'? 'Annuler':'Cancel'}</Link>
            <button type='submit' className='rounded-full h-11 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold inline-flex items-center transition-all duration-200 shadow-sm hover:shadow' style={{ backgroundColor: '#2563eb' }}>{locale==='fr'? 'Enregistrer':'Save'}</button>
          </div>
        </form>
      </main>
      <Footer locale={locale as any} t={{} as any} />
      <form action={`/api/admin/info-cards/${id}`} method='post' className='fixed bottom-6 right-6'>
        <input type='hidden' name='_method' value='DELETE' />
        <button id='delCardBtn' type='submit' className='h-11 px-5 rounded-full bg-red-600 text-white text-sm font-semibold shadow hover:brightness-110'>{locale==='fr'? 'Supprimer':'Delete'}</button>
      </form>
      <script dangerouslySetInnerHTML={{ __html:`document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('delCardBtn'); if(b){ b.addEventListener('click',e=>{ if(!confirm('${locale==='fr'? 'Supprimer cette carte ?':'Delete this card?'}')) e.preventDefault(); }); } });` }} />
    </div>
  );
}
