import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";

export default async function AdminInfoCardsNewPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {} as { lang?: string };
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Nouvelle carte" : "New card"}</h1>
          <a href="/admin/info-cards" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</a>
        </div>
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <form action="/api/admin/info-cards" method="post" className='grid gap-4' encType='multipart/form-data'>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (FR)':'Title (FR)'} *</span><input required name='titleFr' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Titre (EN)':'Title (EN)'} *</span><input required name='titleEn' className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (FR)':'Description (FR)'}</span><textarea name='descFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Description (EN)':'Description (EN)'}</span><textarea name='descEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <div className='border-t border-black/10 pt-4 mt-2'>
              <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Contenu détaillé (page dédiée)':'Detailed content (dedicated page)'}</h3>
              <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'Texte détaillé (FR)':'Detailed text (FR)'}</span><textarea name='contentFr' rows={6} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Texte complet affiché sur la page dédiée...':'Full text displayed on dedicated page...'} /></label>
              <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Texte détaillé (EN)':'Detailed text (EN)'}</span><textarea name='contentEn' rows={6} className='rounded-lg border border-black/15 px-3 py-2' placeholder={locale==='fr'? 'Full text displayed on dedicated page...':'Full text displayed on dedicated page...'} /></label>
            </div>
            <div className='border-t border-black/10 pt-4 mt-2'>
              <h3 className='text-sm font-semibold mb-3'>{locale==='fr'? 'Bouton CTA (optionnel)':'CTA Button (optional)'}</h3>
              <label className='grid gap-1 text-sm'><span>{locale==='fr'? 'URL du lien':'Link URL'}</span><input name='ctaUrl' type='url' className='h-11 rounded-lg border border-black/15 px-3' placeholder='https://...' /></label>
              <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Label du bouton (FR)':'Button label (FR)'}</span><input name='ctaLabelFr' className='h-11 rounded-lg border border-black/15 px-3' placeholder={locale==='fr'? 'En savoir plus':'Learn more'} /></label>
              <label className='grid gap-1 text-sm mt-3'><span>{locale==='fr'? 'Label du bouton (EN)':'Button label (EN)'}</span><input name='ctaLabelEn' className='h-11 rounded-lg border border-black/15 px-3' placeholder='Learn more' /></label>
            </div>
            <div className='grid gap-2 text-sm'>
              <span>{locale==='fr'? 'Image':'Image'}</span>
              <input type='hidden' name='imageUrl' value='' />
              <div id='dropZone' className='relative h-40 rounded-lg border border-dashed border-black/25 flex flex-col items-center justify-center text-xs text-black/60 cursor-pointer bg-black/[0.02] hover:bg-black/[0.04] transition'>
                <input id='fileInput' name='imageFile' type='file' accept='image/*' className='absolute inset-0 opacity-0 cursor-pointer' />
                <div className='pointer-events-none flex flex-col items-center px-4 text-center'>
                  <svg width='28' height='28' viewBox='0 0 24 24' className='mb-2 text-black/40'><path fill='currentColor' d='M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3h-7Z'/></svg>
                  <span>{locale==='fr'? 'Glisser-déposer ou cliquer pour choisir':'Drag & drop or click to choose'}</span>
                  <span className='mt-1 text-[11px] text-black/40'>{locale==='fr'? 'PNG/JPG, max ~5MB':'PNG/JPG, max ~5MB'}</span>
                </div>
                <img id='previewImg' alt='' className='hidden absolute inset-0 w-full h-full object-cover rounded-lg' />
                <div id='removeBtn' className='hidden absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-medium shadow border border-black/10 cursor-pointer'>×</div>
              </div>
            </div>
            <label className='grid gap-1 text-sm'><span>Ordre (sort)</span><input type='number' name='sort' defaultValue={0} className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <div className='flex justify-end gap-2'>
              <a href='/admin/info-cards' className='rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5'>{locale==='fr'? 'Annuler':'Cancel'}</a>
              <button type='submit' className='rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90'>{locale==='fr'? 'Créer':'Create'}</button>
            </div>
          </form>
        </div>
      </main>
      <Footer locale={locale} t={t} />
      <script dangerouslySetInnerHTML={{ __html: `(()=>{const dz=document.getElementById('dropZone');const fi=document.getElementById('fileInput');const pv=document.getElementById('previewImg');const rm=document.getElementById('removeBtn');if(!dz||!fi||!pv||!rm)return;function clear(){fi.value='';pv.src='';pv.classList.add('hidden');rm.classList.add('hidden');dz.classList.remove('has-image');}fi.addEventListener('change',()=>{const f=fi.files&&fi.files[0];if(f){const url=URL.createObjectURL(f);pv.src=url;pv.classList.remove('hidden');rm.classList.remove('hidden');}else{clear();}});rm.addEventListener('click',(e)=>{e.preventDefault();clear();});dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('ring','ring-[color:var(--primary)]');});dz.addEventListener('dragleave',e=>{dz.classList.remove('ring','ring-[color:var(--primary)]');});dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('ring','ring-[color:var(--primary)]');const files=e.dataTransfer.files;if(files&&files[0]){fi.files=files;const ev=new Event('change');fi.dispatchEvent(ev);}});})();` }} />
    </div>
  );
}
