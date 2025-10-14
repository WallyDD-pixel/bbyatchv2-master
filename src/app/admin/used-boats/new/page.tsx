import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

export default async function AdminUsedBoatNewPage({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any)?.role !== 'admin') redirect('/dashboard');
  const sp = searchParams || {} as { lang?: string };
  const locale: Locale = sp?.lang==='en'? 'en':'fr';
  const t = messages[locale];
  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-4xl mx-auto px-4 py-10'>
        <h1 className='text-2xl font-bold'>{locale==='fr'? 'Nouveau bateau d\'occasion':'New used boat'}</h1>
        <form action="/api/admin/used-boats" method="post" className='mt-6 grid gap-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm' encType="multipart/form-data">
          {/* Ligne Nom + Slug */}
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'>
              <span>Nom *</span>
              <input required name='titleFr' id='usedboat-name' className='h-11 rounded-lg border border-black/15 px-3' placeholder='ex: Azimut 55 (2019)' />
            </label>
            <label className='grid gap-1 text-sm'>
              <span>Slug</span>
              <input name='slug' id='usedboat-slug' className='h-11 rounded-lg border border-black/15 px-3 bg-black/5' readOnly placeholder='auto-généré' />
            </label>
          </div>
          <input type='hidden' name='titleEn' value='' />
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'><span>Année *</span><input required name='year' type='number' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Longueur (m) *</span><input required step='0.01' name='lengthM' type='number' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Prix EUR *</span><input required name='priceEur' type='number' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Moteurs</span><input name='engines' className='h-11 rounded-lg border border-black/15 px-3' placeholder='2x Volvo IPS...' /></label>
            <label className='grid gap-1 text-sm'><span>Heures moteur</span><input name='engineHours' type='number' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Carburant</span><input name='fuelType' className='h-11 rounded-lg border border-black/15 px-3' placeholder='diesel' /></label>
            {/* Upload images */}
            <label className='grid gap-1 text-sm md:col-span-2'><span>Images (une ou plusieurs)</span><input name='images' type='file' multiple accept='image/*' className='h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[color:var(--primary)] file:text-white file:cursor-pointer' /></label>
            <div id='images-preview' className='md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2'></div>
          </div>
          <label className='grid gap-1 text-sm'><span>Résumé</span><input name='summaryFr' className='h-11 rounded-lg border border-black/15 px-3' /></label>
          <input type='hidden' name='summaryEn' value='' />
          <label className='grid gap-1 text-sm'><span>Description</span><textarea name='descriptionFr' rows={5} className='rounded-lg border border-black/15 px-3 py-2 resize-y' /></label>
            <input type='hidden' name='descriptionEn' value='' />
          <div className='grid md:grid-cols-2 gap-5'>
            <label className='grid gap-1 text-sm'><span>Status</span><select name='status' defaultValue='listed' className='h-11 rounded-lg border border-black/15 px-3 bg-white'><option value='listed'>listed</option><option value='sold'>sold</option><option value='hidden'>hidden</option></select></label>
            <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input name='sort' type='number' className='h-11 rounded-lg border border-black/15 px-3' defaultValue={0} /></label>
          </div>
          <p className='text-[11px] text-black/50'>La première image deviendra l'image principale automatiquement.</p>
          <div className='flex justify-end gap-3 pt-2'>
            <a href='/admin/used-boats' className='h-11 px-6 rounded-full border border-black/15 text-sm inline-flex items-center hover:bg-black/5'>Annuler</a>
            <button type='submit' className='h-11 px-6 rounded-full bg-[color:var(--primary)] text-white text-sm font-semibold hover:brightness-110'>Enregistrer</button>
          </div>
        </form>
      </main>
      <Footer locale={locale} t={t} />
      <script dangerouslySetInnerHTML={{ __html: `(() => {
  const nameInput = document.getElementById('usedboat-name');
  const slugInput = document.getElementById('usedboat-slug');
  const slugify = (s)=> (s||'').toLowerCase().normalize('NFD').replace(/\\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if(nameInput && slugInput){
    nameInput.addEventListener('input',()=>{ slugInput.value = slugify(nameInput.value); });
    // init
    slugInput.value = slugify(nameInput.value);
  }
  const filesInput = document.querySelector('input[name=images]'); const preview = document.getElementById('images-preview'); if(filesInput){ filesInput.addEventListener('change',()=>{ preview.innerHTML=''; const files = filesInput.files; if(!files) return; Array.from(files).forEach((f,i)=>{ if(!f.type.startsWith('image/')) return; const r=new FileReader(); r.onload=ev=>{ const wrap=document.createElement('div'); wrap.className='relative rounded-lg overflow-hidden border border-black/10'; const img=document.createElement('img'); img.src=ev.target?.result||''; img.className='w-full h-32 object-cover'; wrap.appendChild(img); if(i===0){ const tag=document.createElement('span'); tag.textContent='MAIN'; tag.className='absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white'; wrap.appendChild(tag);} preview.appendChild(wrap); }; r.readAsDataURL(f); }); }); }
})();` }} />
    </div>
  );
}
