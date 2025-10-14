import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import Link from 'next/link';

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
          <Link href='/admin/used-boats' className='text-sm rounded-full border border-black/15 px-4 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</Link>
        </div>
        <form action="/api/admin/used-boats/update" method="post" className='mt-6 grid gap-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm' encType='multipart/form-data'>
          <input type='hidden' name='id' value={id} />
          <input type='hidden' name='keepPhotos' id='keepPhotosInput' />
          <input type='hidden' name='mainImageChoice' id='mainImageChoiceInput' />
          {/* Ligne Nom + Slug */}
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'>
              <span>Nom *</span>
              <input name='titleFr' defaultValue={boat.titleFr} required className='h-11 rounded-lg border border-black/15 px-3' />
            </label>
            <label className='grid gap-1 text-sm'>
              <span>Slug</span>
              <input name='slug' defaultValue={boat.slug} readOnly className='h-11 rounded-lg border border-black/15 px-3 bg-black/5 text-black/60' />
            </label>
          </div>
          <input type='hidden' name='titleEn' value='' />

          {/* Specs */}
          <div className='grid md:grid-cols-3 gap-5'>
            <label className='grid gap-1 text-sm'><span>Année *</span><input required name='year' type='number' defaultValue={boat.year} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Longueur (m) *</span><input required step='0.01' name='lengthM' type='number' defaultValue={boat.lengthM} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Prix EUR *</span><input required name='priceEur' type='number' defaultValue={boat.priceEur} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Moteurs</span><input name='engines' defaultValue={boat.engines||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='2x Volvo IPS...' /></label>
            <label className='grid gap-1 text-sm'><span>Heures moteur</span><input name='engineHours' type='number' defaultValue={boat.engineHours??''} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Carburant</span><input name='fuelType' defaultValue={boat.fuelType||''} className='h-11 rounded-lg border border-black/15 px-3' placeholder='diesel' /></label>
          </div>

          {/* Gestion images drag & drop */}
          <div className='grid gap-3'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
              <p className='text-sm font-medium'>Galerie images</p>
              <label className='text-xs rounded-full border border-black/15 px-4 h-9 inline-flex items-center gap-2 cursor-pointer hover:bg-black/5'>
                <span>➕</span> <span>Ajouter</span>
                <input type='file' name='images' multiple accept='image/*' className='hidden' id='imageInput' />
              </label>
            </div>
            <div id='dropZone' className='min-h-[140px] rounded-xl border-2 border-dashed border-black/15 bg-black/[0.02] p-3 flex flex-wrap gap-3 items-start justify-start'>
              {boat.mainImage && (
                <div className='group relative w-40 h-28 rounded-lg overflow-hidden bg-white border border-black/10 flex-shrink-0 cursor-move' data-url={boat.mainImage} data-main='1'>
                  <img src={boat.mainImage} className='w-full h-full object-cover' />
                  <span className='absolute top-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded'>MAIN</span>
                  <button type='button' className='hidden group-hover:flex absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white items-center justify-center text-xs remove-btn'>✕</button>
                  <button type='button' className='hidden group-hover:flex absolute bottom-1 left-1 right-1 h-6 text-[10px] items-center justify-center rounded bg-white/80 text-black font-medium make-main-btn'>Définir main</button>
                </div>
              )}
              {photoList.map(p=> (
                <div key={p} className='group relative w-40 h-28 rounded-lg overflow-hidden bg-white border border-black/10 flex-shrink-0 cursor-move' data-url={p}>
                  <img src={p} className='w-full h-full object-cover' />
                  <button type='button' className='hidden group-hover:flex absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white items-center justify-center text-xs remove-btn'>✕</button>
                  <button type='button' className='hidden group-hover:flex absolute bottom-1 left-1 right-1 h-6 text-[10px] items-center justify-center rounded bg-white/80 text-black font-medium make-main-btn'>Définir main</button>
                </div>
              ))}
              <div className='text-[11px] text-black/50 flex items-center'>Glisser-déposer pour réordonner. Définir une image principale.</div>
            </div>
          </div>

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

          <div className='flex justify-end gap-3 pt-2'>
            <Link href='/admin/used-boats' className='h-11 px-6 rounded-full border border-black/15 text-sm inline-flex items-center hover:bg-black/5'>Annuler</Link>
            <button type='submit' className='h-11 px-6 rounded-full bg-[color:var(--primary)] text-white text-sm font-semibold hover:brightness-110'>Enregistrer</button>
          </div>
        </form>
      </main>
      <Footer locale={locale as any} t={{} as any} />
      <script dangerouslySetInnerHTML={{ __html: `(() => {\n  const dropZone = document.getElementById('dropZone');\n  const keepInput = document.getElementById('keepPhotosInput');\n  const mainInput = document.getElementById('mainImageChoiceInput');\n  function serialize(){\n    const cards=[...dropZone.querySelectorAll('[data-url]')];\n    const main = cards.find(c=>c.getAttribute('data-main')==='1');\n    if(main) mainInput.value = main.getAttribute('data-url')||'';\n    const others = cards.filter(c=>c!==main).map(c=> c.getAttribute('data-url')).filter(Boolean);\n    keepInput.value = JSON.stringify(others);\n  }\n  function makeDraggable(card){\n    card.draggable=true;\n    card.addEventListener('dragstart',e=>{ card.classList.add('opacity-40'); e.dataTransfer.setData('text/plain', card.getAttribute('data-url')||''); });\n    card.addEventListener('dragend',()=> card.classList.remove('opacity-40'));\n    card.addEventListener('dragover',e=>{ e.preventDefault(); });\n    card.addEventListener('drop',e=>{ e.preventDefault(); const target=card; const url=e.dataTransfer.getData('text/plain'); const dragged=[...dropZone.querySelectorAll('[data-url]')].find(c=>c.getAttribute('data-url')===url); if(dragged && dragged!==target){ dropZone.insertBefore(dragged, target); serialize(); } });\n    const removeBtn = card.querySelector('.remove-btn');\n    if(removeBtn) removeBtn.addEventListener('click',()=>{ card.remove(); serialize(); });\n    const makeMainBtn = card.querySelector('.make-main-btn');\n    if(makeMainBtn) makeMainBtn.addEventListener('click',()=>{ [...dropZone.querySelectorAll('[data-url]')].forEach(c=> c.removeAttribute('data-main')); card.setAttribute('data-main','1'); const tag=card.querySelector('span'); if(tag) tag.textContent='MAIN'; serialize(); });\n  }\n  [...dropZone.querySelectorAll('[data-url]')].forEach(makeDraggable);\n  serialize();\n})();` }} />
    </div>
  );
}
