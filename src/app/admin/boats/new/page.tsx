import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import BoatNewClient from './BoatNewClient';

export default async function AdminBoatsNewPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{locale === "fr" ? "Nouveau bateau" : "New boat"}</h1>
          <Link href="/admin/boats" className="text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5">← {locale === "fr" ? "Retour" : "Back"}</Link>
        </div>
        <form id="boat-create" className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm grid gap-4" action="/api/admin/boats" method="post" encType="multipart/form-data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Nom" : "Name"}</span>
              <input name="name" id="boat-name" required className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Slug</span>
              <input name="slug" id="boat-slug" required readOnly className="h-11 rounded-lg border border-black/15 px-3 bg-black/5" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Ville" : "City"}</span>
              <select name="city" className="h-11 rounded-lg border border-black/15 px-3 bg-white">
                <option value="">{locale === 'fr' ? 'Choisir...' : 'Select...'}</option>
                <option value="Nice">Nice</option>
                <option value="Antibes">Antibes</option>
                <option value="Golfe-Juan">Golfe-Juan</option>
                <option value="Cannes">Cannes</option>
                <option value="Monaco">Monaco</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Prix/jour (€)" : "Price/day (€)"}</span>
              <input name="pricePerDay" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Capacité" : "Capacity"}</span>
              <input name="capacity" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Vitesse (kn)" : "Speed (kn)"}</span>
              <input name="speedKn" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Puissance (cv)" : "Power (hp)"}</span>
              <input name="enginePower" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="grid gap-1 text-sm">
              <span>{locale === 'fr' ? 'Prix matin (AM)' : 'Morning price (AM)'}</span>
              <input name="priceAm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === 'fr' ? 'Prix après-midi (PM)' : 'Afternoon price (PM)'}</span>
              <input name="pricePm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
            </label>
            <div className="grid gap-1 text-xs text-black/50 items-end">
              <p>{locale === 'fr' ? 'Laissez vide pour utiliser une répartition du prix jour.' : 'Leave blank to derive from day price.'}</p>
            </div>
          </div>
          {/* Inputs fichiers images */}
          <div className="grid gap-2">
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Images (une ou plusieurs)" : "Images (one or many)"}</span>
              <input name="imageFiles" id="imageFiles" type="file" multiple accept="image/*" className="h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[color:var(--primary)] file:text-white file:cursor-pointer" />
            </label>
            <p className="text-xs text-black/60">{locale === "fr" ? "La première deviendra l'image principale." : "The first becomes the main image."}</p>
          </div>
          <div id="images-preview" className="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>
          <label className="grid gap-1 text-sm">
            <span>{locale === "fr" ? "Vidéos (séparées par des virgules ou JSON)" : "Videos (comma or JSON array)"}</span>
            <textarea name="videoUrls" className="min-h-[90px] rounded-lg border border-black/15 p-3 text-sm" placeholder="https://...mp4, https://...mp4" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{locale === "fr" ? "Photos externes (URLs, virgules ou JSON)" : "External photos (URLs, comma or JSON)"}</span>
            <textarea name="photoUrls" id="photoUrls" className="min-h-[90px] rounded-lg border border-black/15 p-3 text-sm" placeholder="https://...jpg, https://...png" />
          </label>
          <div id="photos-preview" className="grid grid-cols-2 gap-2"></div>
          <div className="flex items-center gap-2">
            <input id="available" name="available" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="available" className="text-sm">{locale === "fr" ? "Disponible" : "Available"}</label>
          </div>
          <div className="border-t border-black/10 pt-4 mt-2">
            <h2 className="text-sm font-semibold mb-2">{locale==='fr'? 'Options':'Options'}</h2>
            <p className="text-xs text-black/50 mb-3">{locale==='fr'? 'Ajoutez des options payantes (ex: Skipper, Carburant, Paddle).':'Add paid options (e.g. Skipper, Fuel, Paddle).'} </p>
            <BoatNewClient locale={locale} />
          </div>
          <div className="flex justify-end gap-2">
            <Link href="/admin/boats" className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5">{locale === "fr" ? "Annuler" : "Cancel"}</Link>
            <button className="rounded-full h-10 px-4 bg-[color:var(--primary)] text-white hover:opacity-90">{locale === "fr" ? "Créer" : "Create"}</button>
          </div>
        </form>
      </main>
      <Footer locale={locale} t={t} />
      <script dangerouslySetInnerHTML={{ __html: `(() => { const filesInput = document.getElementById('imageFiles'); const imagesWrap = document.getElementById('images-preview'); const photosInput = document.getElementById('photoUrls'); const photosWrap = document.getElementById('photos-preview'); const nameInput = document.getElementById('boat-name'); const slugInput = document.getElementById('boat-slug'); const parseList = (s) => { if(!s) return []; s=s.trim(); if(!s) return []; if(s.startsWith('[') && s.endsWith(']')) { try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; } } return s.split(',').map(x=>x.trim()).filter(Boolean); }; const slugify = (str) => str.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); if(nameInput && slugInput){ nameInput.addEventListener('input', ()=>{ slugInput.value = slugify(nameInput.value); }); } if(filesInput){ filesInput.addEventListener('change', ()=>{ imagesWrap.innerHTML=''; const files = filesInput.files; if(!files) return; Array.from(files).forEach((f,i)=>{ if(!f.type.startsWith('image/')) return; const reader=new FileReader(); reader.onload = (ev)=>{ const d=document.createElement('div'); d.className='relative rounded-md overflow-hidden border border-black/10'; const im=document.createElement('img'); im.src=ev.target?.result||''; im.alt='img'+i; im.className='w-full h-32 object-cover'; d.appendChild(im); imagesWrap.appendChild(d); }; reader.readAsDataURL(f); }); }); } if(photosInput){ const updatePhotos=()=>{ const urls = parseList(photosInput.value); photosWrap.innerHTML=''; urls.forEach(u=>{ const d=document.createElement('div'); d.className='rounded-md overflow-hidden border border-black/10'; const im=document.createElement('img'); im.src=u; im.alt='photo'; im.className='w-full h-28 object-cover'; d.appendChild(im); photosWrap.appendChild(d); }); }; photosInput.addEventListener('input', updatePhotos); } })();` }} />
    </div>
  );
}
