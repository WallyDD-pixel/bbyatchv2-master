import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { messages, type Locale } from "@/i18n/messages";
import Link from 'next/link';
import BoatNewClient from './BoatNewClient';

export default async function AdminBoatsNewPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = await getServerSession() as any;
  if (!session?.user) redirect("/signin");
  const role = (session.user as any)?.role ?? "user";
  if (role !== "admin") redirect("/dashboard");

  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
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
        <form id="boat-create" className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm space-y-6" action="/api/admin/boats" method="post" encType="multipart/form-data">
          {/* Informations de base */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Informations de base" : "Basic Information"}</h2>
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
          </div>

          {/* Caractéristiques techniques */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Caractéristiques techniques" : "Technical Specifications"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Places max" : "Max places"}</span>
                <input name="capacity" type="number" min="0" required className="h-11 rounded-lg border border-black/15 px-3 w-full" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Vitesse (noeuds)" : "Speed (knots)"}</span>
                <input name="speedKn" type="number" min="0" required defaultValue="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Puissance (cv)" : "Power (hp)"}</span>
                <input name="enginePower" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Taille (m)" : "Length (m)"}</span>
                <input name="lengthM" type="number" step="0.1" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
              </label>
            </div>
          </div>

          {/* Tarification */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Tarification" : "Pricing"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Prix matin (AM) (€)" : "Morning price (AM) (€)"}</span>
                <input name="priceAm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" placeholder={locale === 'fr' ? 'Prix matin' : 'Morning price'} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === 'fr' ? 'Prix après-midi (PM) (€)' : 'Afternoon price (PM) (€)'}</span>
                <input name="pricePm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Prix Sunset (€)" : "Sunset price (€)"}</span>
                <input name="priceSunset" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3" />
              </label>
            </div>
            <p className="text-xs text-black/50">{locale === 'fr' ? 'Optionnel: si laissés vides on dérive automatiquement à partir du prix/jour.' : 'Optional: if empty they are derived from day price.'}</p>
            
            {/* Prix Agence */}
            <div className="space-y-4 pt-4 border-t border-black/10">
              <h3 className="text-sm font-semibold">{locale === "fr" ? "Prix Agence (optionnel)" : "Agency Prices (optional)"}</h3>
              <p className="text-xs text-black/50">
                {locale === "fr" 
                  ? "Si les prix agence sont différents des prix publics, renseignez-les ici. Sinon, les prix publics seront utilisés."
                  : "If agency prices differ from public prices, fill them here. Otherwise, public prices will be used."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="grid gap-1 text-sm">
                  <span>{locale === "fr" ? "Prix Agence/jour (€)" : "Agency price/day (€)"}</span>
                  <input name="priceAgencyPerDay" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{locale === "fr" ? "Prix Agence matin (€)" : "Agency morning price (€)"}</span>
                  <input name="priceAgencyAm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{locale === "fr" ? "Prix Agence après-midi (€)" : "Agency afternoon price (€)"}</span>
                  <input name="priceAgencyPm" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{locale === "fr" ? "Prix Agence Sunset (€)" : "Agency sunset price (€)"}</span>
                  <input name="priceAgencySunset" type="number" min="0" className="h-11 rounded-lg border border-black/15 px-3 w-full" />
                </label>
              </div>
            </div>
          </div>

          {/* Avantages du bateau */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Avantages du bateau" : "Boat Advantages"}</h2>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Avantages (FR)" : "Advantages (FR)"}</span>
              <textarea 
                name="avantagesFr" 
                className="min-h-[120px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                placeholder={locale === "fr" ? "Équipements, confort, espace disponible, bain de soleil avant/arrière, cabine, douche, coin détente, etc." : "Equipment, comfort, available space, front/rear sunbathing, cabin, shower, relaxation area, etc."}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Avantages (EN)" : "Advantages (EN)"}</span>
              <textarea 
                name="avantagesEn" 
                className="min-h-[120px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                placeholder={locale === "fr" ? "Equipment, comfort, available space, front/rear sunbathing, cabin, shower, relaxation area, etc." : "Equipment, comfort, available space, front/rear sunbathing, cabin, shower, relaxation area, etc."}
              />
            </label>
          </div>

          {/* Options incluses */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Options incluses" : "Included Options"}</h2>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Options incluses (FR)" : "Included Options (FR)"}</span>
              <textarea 
                name="optionsInclusesFr" 
                className="min-h-[120px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                placeholder={locale === "fr" ? "Prêt de serviettes, boissons non alcoolisées offertes, etc." : "Towel rental, non-alcoholic drinks included, etc."}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "fr" ? "Options incluses (EN)" : "Included Options (EN)"}</span>
              <textarea 
                name="optionsInclusesEn" 
                className="min-h-[120px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                placeholder={locale === "fr" ? "Towel rental, non-alcoholic drinks included, etc." : "Towel rental, non-alcoholic drinks included, etc."}
              />
            </label>
          </div>

          {/* Skipper */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Skipper" : "Skipper"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input id="skipperRequired" name="skipperRequired" type="checkbox" defaultChecked className="h-4 w-4" />
                <label htmlFor="skipperRequired" className="text-sm font-semibold">{locale === "fr" ? "Skipper obligatoire (par défaut)" : "Skipper required (default)"}</label>
              </div>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Prix du skipper (€/jour)" : "Skipper price (€/day)"}</span>
                <input id="skipperPrice" name="skipperPrice" type="number" defaultValue="350" className="h-11 rounded-lg border border-black/15 px-3" />
              </label>
            </div>
          </div>
          {/* Médias */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Médias" : "Media"}</h2>
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Images (une ou plusieurs)" : "Images (one or many)"}</span>
                <input name="imageFiles" id="imageFiles" type="file" multiple accept="image/*" className="h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:hover:bg-blue-700 file:text-white file:cursor-pointer" />
                <p className="text-xs text-black/60">{locale === "fr" ? "La première deviendra l'image principale." : "The first becomes the main image."}</p>
              </label>
              <div id="images-preview" className="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Vidéos" : "Videos"}</span>
                <input name="videoFiles" type="file" multiple accept="video/*" className="h-11 rounded-lg border border-black/15 px-3 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:hover:bg-blue-700 file:text-white file:cursor-pointer" />
                <p className="text-xs text-black/60">{locale === "fr" ? "Formats acceptés: MP4, WebM, OGG (max 100MB par fichier)" : "Accepted formats: MP4, WebM, OGG (max 100MB per file)"}</p>
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === "fr" ? "Photos externes (URLs, virgules ou JSON)" : "External photos (URLs, comma or JSON)"}</span>
                <textarea name="photoUrls" id="photoUrls" className="min-h-[90px] rounded-lg border border-black/15 p-3 text-sm" placeholder="https://...jpg, https://...png" />
              </label>
              <div id="photos-preview" className="grid grid-cols-2 gap-2"></div>
            </div>
          </div>

          {/* Disponibilité */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale === "fr" ? "Disponibilité" : "Availability"}</h2>
            <div className="flex items-center gap-2">
              <input id="available" name="available" type="checkbox" defaultChecked className="h-4 w-4" />
              <label htmlFor="available" className="text-sm">{locale === "fr" ? "Disponible" : "Available"}</label>
            </div>
          </div>
          {/* Options */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-black/70 border-b border-black/10 pb-2">{locale==='fr'? 'Options':'Options'}</h2>
            <p className="text-xs text-black/50">{locale==='fr'? 'Ajoutez des options payantes (ex: Skipper, Carburant, Paddle).':'Add paid options (e.g. Skipper, Fuel, Paddle).'} </p>
            <BoatNewClient locale={locale} />
          </div>
          <div className="flex justify-end gap-2">
            <Link href="/admin/boats" className="rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5">{locale === "fr" ? "Annuler" : "Cancel"}</Link>
            <button className="rounded-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white transition-colors">{locale === "fr" ? "Créer" : "Create"}</button>
          </div>
        </form>
      </main>
      <Footer locale={locale} t={t} />
      <script dangerouslySetInnerHTML={{ __html: `(() => { const filesInput = document.getElementById('imageFiles'); const imagesWrap = document.getElementById('images-preview'); const photosInput = document.getElementById('photoUrls'); const photosWrap = document.getElementById('photos-preview'); const nameInput = document.getElementById('boat-name'); const slugInput = document.getElementById('boat-slug'); const parseList = (s) => { if(!s) return []; s=s.trim(); if(!s) return []; if(s.startsWith('[') && s.endsWith(']')) { try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; } } return s.split(',').map(x=>x.trim()).filter(Boolean); }; const slugify = (str) => str.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); if(nameInput && slugInput){ nameInput.addEventListener('input', ()=>{ slugInput.value = slugify(nameInput.value); }); } if(filesInput){ filesInput.addEventListener('change', ()=>{ imagesWrap.innerHTML=''; const files = filesInput.files; if(!files) return; Array.from(files).forEach((f,i)=>{ if(!f.type.startsWith('image/')) return; const reader=new FileReader(); reader.onload = (ev)=>{ const d=document.createElement('div'); d.className='relative rounded-md overflow-hidden border border-black/10'; const im=document.createElement('img'); im.src=ev.target?.result||''; im.alt='img'+i; im.className='w-full h-32 object-cover'; d.appendChild(im); imagesWrap.appendChild(d); }; reader.readAsDataURL(f); }); }); } if(photosInput){ const updatePhotos=()=>{ const urls = parseList(photosInput.value); photosWrap.innerHTML=''; urls.forEach(u=>{ const d=document.createElement('div'); d.className='rounded-md overflow-hidden border border-black/10'; const im=document.createElement('img'); im.src=u; im.alt='photo'; im.className='w-full h-28 object-cover'; d.appendChild(im); photosWrap.appendChild(d); }); }; photosInput.addEventListener('input', updatePhotos); } })();` }} />
    </div>
  );
}
