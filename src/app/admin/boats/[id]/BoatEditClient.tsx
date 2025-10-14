"use client";
import { useMemo, useState, useCallback, useRef } from "react";

export default function BoatEditClient({ boat, locale }: { boat: any; locale: "fr" | "en" }) {
  const [form, setForm] = useState({ ...boat, videoUrls: boat.videoUrls ?? [] });
  const initialPhotos: string[] = Array.isArray(boat.photoUrls) ? boat.photoUrls : [];
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [videoInput, setVideoInput] = useState(() => {
    if (!boat.videoUrls) return "";
    if (Array.isArray(boat.videoUrls)) return boat.videoUrls.join(", ");
    return typeof boat.videoUrls === "string" ? boat.videoUrls : JSON.stringify(boat.videoUrls);
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videosList, setVideosList] = useState<string[]>(() => Array.isArray(boat.videoUrls) ? boat.videoUrls : []);
  const [options, setOptions] = useState<any[]>(() => (boat.options || []).map((o:any)=> ({ ...o, _key: 'db-'+o.id })));
  const [experiences, setExperiences] = useState<any[]>(() => boat.allExperiences || []);
  const [boatExperiences, setBoatExperiences] = useState<any[]>(() => (boat.boatExperiences||[]).map((be:any)=> ({ experienceId: be.experienceId, price: be.price ?? '', _key:'be-'+be.experienceId })));

  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const t = {
    fr: {
      save: "Enregistrer",
      saving: "Enregistrement…",
      updated: "Mise à jour effectuée",
      failed: "Échec",
      delete: "Supprimer le bateau",
      deleted: "Bateau supprimé",
      videos: "Vidéos (séparées par des virgules ou JSON)",
      preview: "Prévisualisation",
      photos: "Photos",
      uploadNew: "Ajouter des images",
      uploading: "Téléversement…",
      moveUp: "Monter",
      moveDown: "Descendre",
      remove: "Supprimer",
      setMain: "Définir principale",
      main: "Principale",
      orderSaved: "Ordre enregistré",
      priceAm: "Prix matin (€)",
      pricePm: "Prix après-midi (€)",
      partialNote: "Optionnel: si laissés vides on dérive automatiquement à partir du prix/jour.",
    },
    en: {
      save: "Save",
      saving: "Saving…",
      updated: "Updated",
      failed: "Failed",
      delete: "Delete boat",
      deleted: "Boat deleted",
      videos: "Videos (comma separated or JSON array)",
      preview: "Preview",
      photos: "Photos",
      uploadNew: "Add images",
      uploading: "Uploading…",
      moveUp: "Up",
      moveDown: "Down",
      remove: "Delete",
      setMain: "Set main",
      main: "Main",
      orderSaved: "Order saved",
      priceAm: "Morning price (€)",
      pricePm: "Afternoon price (€)",
      partialNote: "Optional: if empty they are derived from day price.",
    },
  }[locale];

  const slugify = (str: string) => str.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-');

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((f: any) => {
      if (name === 'name') {
        return { ...f, name: value, slug: slugify(value) };
      }
      return ({ ...f, [name]: type === "checkbox" ? checked : value });
    });
  };

  const parseVideos = (txt: string) => {
    const s = txt.trim();
    if (!s) return [] as string[];
    if (s.startsWith("[") && s.endsWith("]")) {
      try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    return s.split(",").map(x => x.trim()).filter(Boolean);
  };

  const videos = useMemo(() => parseVideos(videoInput), [videoInput]);

  // Réorganisation
  const movePhoto = (index: number, dir: -1 | 1) => {
    setPhotos(p => {
      const np = [...p];
      const ni = index + dir;
      if (ni < 0 || ni >= np.length) return p;
      const tmp = np[index];
      np[index] = np[ni];
      np[ni] = tmp;
      return np;
    });
  };
  const removePhoto = (index: number) => {
    if (!confirm('Supprimer cette image ?')) return;
    setPhotos(p => p.filter((_, i) => i !== index));
    // Si imageUrl supprimée, réattribuer
    setForm((f: typeof form) => {
      if (index === 0 && pHasMain(f.imageUrl)) {
      return { ...f, imageUrl: undefined };
      }
      if (f.imageUrl && index >= 0) {
      // si l'imageUrl correspond à la photo supprimée
      return { ...f, imageUrl: f.imageUrl };
      }
      return f;
    });
  };
  const pHasMain = (url?: string) => !!url;
  interface BoatOption {
    id?: number;
    label: string;
    price: number | null;
    _key: string;
  }

  interface BoatExperience {
    experienceId: number;
    price: string | number | null;
    _key: string;
  }

  interface Experience {
    id: number;
    titleFr: string;
    titleEn: string;
  }

  interface Boat {
    id: number;
    name?: string;
    slug?: string;
    city?: string;
    pricePerDay?: number;
    priceAm?: number;
    pricePm?: number;
    capacity?: number;
    speedKn?: number;
    enginePower?: number;
    fuel?: number;
    available?: boolean;
    imageUrl?: string;
    photoUrls?: string[];
    videoUrls?: string[] | string;
    options?: BoatOption[];
    allExperiences?: Experience[];
    boatExperiences?: { experienceId: number; price?: number | string | null }[];
  }

  const setMain = (url: string) => setForm((f: typeof form) => ({ ...f, imageUrl: url }));

  // Upload nouvelles images
  const onUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      // Conserver ordre courant (sera fusionné côté serveur en préfixant uploads ou Set). Pour garder ordre + nouvelles à la fin, on envoie la liste.
      fd.append('photoUrls', JSON.stringify(photos));
      // Ajout champs simples indispensables
      fd.append('slug', form.slug || '');
      fd.append('name', form.name || '');
      if (form.city) fd.append('city', form.city);
      if (form.pricePerDay != null) fd.append('pricePerDay', String(form.pricePerDay));
      if (form.priceAm != null) fd.append('priceAm', String(form.priceAm));
      if (form.pricePm != null) fd.append('pricePm', String(form.pricePm));
      if (form.capacity != null) fd.append('capacity', String(form.capacity));
      if (form.speedKn != null) fd.append('speedKn', String(form.speedKn));
      if (form.enginePower != null) fd.append('enginePower', String(form.enginePower));
      if (form.fuel != null) fd.append('fuel', String(form.fuel));
      if (form.available != null) fd.append('available', form.available ? 'true' : 'false');
      if (form.imageUrl) fd.append('imageUrl', form.imageUrl);
      if (videos.length) fd.append('videoUrls', JSON.stringify(videos));
      Array.from(files).forEach(f => fd.append('imageFiles', f));

      const res = await fetch(`/api/admin/boats/${boat.id}`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error('upload_failed');
      const data = await res.json();
      if (Array.isArray(data.photoUrls)) setPhotos(data.photoUrls);
      if (data.imageUrl) setForm((f: typeof form) => ({ ...f, imageUrl: data.imageUrl }));
    } catch (err) {
      alert(t.failed);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Sauvegarde ordre / meta (sans nouvel upload)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanedOptions = options.map(o=> ({ id: o.id, label: o.label, price: o.price }));
      const cleanedExperiences = boatExperiences.map(be=> ({ experienceId: be.experienceId, price: be.price===''? null: Number(be.price) }));
      const payload = { ...form, videoUrls: videosList, photoUrls: photos, options: cleanedOptions, experiences: cleanedExperiences };
      const res = await fetch(`/api/admin/boats/${boat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("bad");
      alert(t.updated);
    } catch (e) {
      alert(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Are you sure?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/boats/${boat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad");
      alert(t.deleted);
      window.location.href = "/admin/boats";
    } catch (e) {
      alert(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragLeave = (index: number) => () => {
    if (dragOverIndex === index) setDragOverIndex(null);
  };
  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) {
      dragIndex.current = null; setDragOverIndex(null); return;
    }
    setPhotos(p => {
      const arr = [...p];
      const from = dragIndex.current as number;
      const to = index;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    dragIndex.current = null;
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { dragIndex.current = null; setDragOverIndex(null); };

  // Upload image principale
  const onChangeMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      // Exclure ancienne image principale des photos (elle reviendra si toujours dedans côté serveur)
      const photosWithoutMain = photos.filter(p => p !== form.imageUrl);
      fd.append('photoUrls', JSON.stringify(photosWithoutMain));
      fd.append('slug', form.slug || '');
      fd.append('name', form.name || '');
      if (form.city) fd.append('city', form.city);
      if (form.pricePerDay != null) fd.append('pricePerDay', String(form.pricePerDay));
      if (form.priceAm != null) fd.append('priceAm', String(form.priceAm));
      if (form.pricePm != null) fd.append('pricePm', String(form.pricePm));
      if (videos.length) fd.append('videoUrls', JSON.stringify(videos));
      fd.append('imageFile', file);
      const res = await fetch(`/api/admin/boats/${boat.id}`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error('upload_failed');
      const data = await res.json();
      if (Array.isArray(data.photoUrls)) setPhotos(data.photoUrls);
      if (data.imageUrl) setForm((f: typeof form) => ({ ...f, imageUrl: data.imageUrl }));
    } catch (err) {
      alert(t.failed);
    } finally {
      setUploading(false);
      e.target.value='';
    }
  };

  const addVideosUrlsFromText = () => {
    const arr = parseVideos(videoInput);
    if (arr.length) setVideosList(v => Array.from(new Set([...v, ...arr])));
    setVideoInput('');
  };

  const onUploadVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photoUrls', JSON.stringify(photos));
      fd.append('slug', form.slug || '');
      fd.append('name', form.name || '');
      if (form.city) fd.append('city', form.city);
      if (form.pricePerDay != null) fd.append('pricePerDay', String(form.pricePerDay));
      if (form.priceAm != null) fd.append('priceAm', String(form.priceAm));
      if (form.pricePm != null) fd.append('pricePm', String(form.pricePm));
      if (form.fuel != null) fd.append('fuel', String(form.fuel));
      if (form.available != null) fd.append('available', form.available ? 'true' : 'false');
      if (form.imageUrl) fd.append('imageUrl', form.imageUrl);
      if (videosList.length) fd.append('videoUrls', JSON.stringify(videosList));
      Array.from(files).forEach(f => fd.append('videoFiles', f));
      const res = await fetch(`/api/admin/boats/${boat.id}`, { method: 'PUT', body: fd });
      if (!res.ok) throw new Error('upload_failed');
      const data = await res.json();
      if (Array.isArray(data.videoUrls)) setVideosList(data.videoUrls);
    } catch (e) { alert(t.failed); } finally { setUploading(false); e.target.value=''; }
  };

  const removeVideo = (url: string) => {
    if (!confirm('Supprimer cette vidéo ?')) return;
    setVideosList(v => v.filter(x => x !== url));
  };

  const toggleExperience = (id:number) => {
    setBoatExperiences(list=>{
      if(list.some(e=>e.experienceId===id)) return list.filter(e=>e.experienceId!==id);
      return [...list, { experienceId:id, price:'', _key:'new-'+id }];
    });
  };
  const setExpPrice = (id:number, val:string) => {
    setBoatExperiences(list=> list.map(e=> e.experienceId===id? { ...e, price: val }: e));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Lignes name / slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Nom" : "Name"}</span>
          <input name="name" value={form.name || ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Slug</span>
          <input name="slug" value={form.slug || ""} readOnly className="h-11 rounded-lg border border-black/15 px-3 bg-black/5" />
        </label>
      </div>
      {/* Lignes ville / prix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Ville" : "City"}</span>
          <select name="city" value={form.city || ''} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3 bg-white">
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
          <input name="pricePerDay" type="number" value={form.pricePerDay ?? ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
      </div>
      {/* Prix partiels AM / PM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="grid gap-1 text-sm">
          <span>{t.priceAm}</span>
          <input name="priceAm" type="number" value={form.priceAm ?? ''} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{t.pricePm}</span>
          <input name="pricePm" type="number" value={form.pricePm ?? ''} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
      </div>
      <p className="text-xs text-black/50 -mt-2">{t.partialNote}</p>
      {/* Capacités */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Capacité" : "Capacity"}</span>
          <input name="capacity" type="number" value={form.capacity ?? ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Vitesse (kn)" : "Speed (kn)"}</span>
          <input name="speedKn" type="number" value={form.speedKn ?? ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{locale === "fr" ? "Puissance (cv)" : "Power (hp)"}</span>
          <input name="enginePower" type="number" value={form.enginePower ?? ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
      </div>
      {/* Fuel */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
        <label className="grid gap-1 text-sm">
          <span>Fuel</span>
          <input name="fuel" type="number" value={form.fuel ?? ""} onChange={onChange} className="h-11 rounded-lg border border-black/15 px-3" />
        </label>
      </div>
      {/* Prévisualisation image principale */}
      {form.imageUrl ? (
        <div className="rounded-lg border border-black/10 overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-black/60 bg-black/5">
            <span>{t.preview}</span>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="rounded-full bg-[color:var(--primary)] text-white px-3 h-7 inline-flex items-center text-[11px]">{uploading ? (locale==='fr'?'Chargement…':'Uploading…') : (locale==='fr'? 'Changer':'Change')}</span>
              <input type="file" accept="image/*" onChange={onChangeMainImage} disabled={uploading} className="hidden" />
            </label>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.imageUrl} alt="preview" className="w-full h-52 object-cover" />
        </div>
      ) : null}

      {/* Photos gestion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.photos}</h2>
          <label className="text-sm inline-flex items-center gap-2 cursor-pointer">
            <span className="rounded-full bg-[color:var(--primary)] text-white px-4 h-9 inline-flex items-center">{uploading ? t.uploading : t.uploadNew}</span>
            <input type="file" multiple accept="image/*" disabled={uploading} onChange={onUploadNew} className="hidden" />
          </label>
        </div>
        {photos.length === 0 && <p className="text-sm text-black/50">{locale === 'fr' ? 'Aucune image.' : 'No images.'}</p>}
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.filter(p => p !== form.imageUrl).map((url, i) => (
              <li
                key={url + i}
                className={`group relative border border-black/10 rounded-lg overflow-hidden transition outline-none ${dragOverIndex===i ? 'ring-2 ring-[color:var(--primary)] scale-[1.02]' : ''}`}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDragLeave={handleDragLeave(i)}
                onDrop={handleDrop(i)}
                onDragEnd={handleDragEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={"photo " + (i+1)} className="w-full h-32 object-cover select-none pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => movePhoto(i, -1)} disabled={i===0} className="text-[10px] px-2 py-1 bg-white/80 rounded disabled:opacity-30">{t.moveUp}</button>
                  <button type="button" onClick={() => movePhoto(i, 1)} disabled={i===photos.length-1} className="text-[10px] px-2 py-1 bg-white/80 rounded disabled:opacity-30">{t.moveDown}</button>
                  <button type="button" onClick={() => setMain(url)} className={`text-[10px] px-2 py-1 rounded ${form.imageUrl===url ? 'bg-green-500 text-white' : 'bg-white/80'}`}>{form.imageUrl===url ? t.main : t.setMain}</button>
                  <button type="button" onClick={() => removePhoto(i)} className="text-[10px] px-2 py-1 bg-red-600 text-white rounded">{t.remove}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vidéos */}
      <div className="space-y-2">
        <label className="grid gap-1 text-sm">
          <span>{t.videos}</span>
          <div className="flex gap-2">
            <input
              ref={videoInputRef}
              type="text"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              className="flex-1 h-11 rounded-lg border border-black/15 px-3 text-sm"
              placeholder="https://...mp4, https://...webm"
            />
            <button type="button" onClick={addVideosUrlsFromText} className="h-11 px-4 rounded-lg bg-[color:var(--primary)] text-white text-sm">+ URL</button>
            <label className="h-11 px-4 rounded-lg bg-[color:var(--primary)] text-white text-sm inline-flex items-center cursor-pointer">
              {uploading ? t.uploading : '+ File'}
              <input type="file" multiple accept="video/mp4,video/webm,video/ogg" onChange={onUploadVideos} className="hidden" />
            </label>
          </div>
        </label>
        {videosList.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videosList.map(v => (
              <li key={v} className="relative border border-black/10 rounded overflow-hidden bg-black/5">
                <video controls className="w-full max-h-48 bg-black">
                  <source src={v} />
                </video>
                <button type="button" onClick={() => removeVideo(v)} className="absolute top-1 right-1 text-[10px] bg-red-600 text-white px-2 py-1 rounded">{t.remove}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Disponibilité */}
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="available" checked={!!form.available} onChange={onChange} className="h-4 w-4" />
        <span>{locale === "fr" ? "Disponible" : "Available"}</span>
      </label>

      {/* Options */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{locale==='fr'? 'Options':'Options'}</h2>
        <p className="text-xs text-black/50">{locale==='fr'? 'Gérez les options et leurs prix. Laissez prix vide si gratuit.':'Manage options and their prices. Leave price empty if free.'}</p>
        <table className="w-full text-xs border border-black/10 rounded-lg overflow-hidden">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left p-2">{locale==='fr'? 'Libellé':'Label'}</th>
              <th className="text-left p-2 w-32">€</th>
              <th className="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {options.length===0 && (
              <tr><td colSpan={3} className="p-3 text-black/50">{locale==='fr'? 'Aucune option':'No options'}</td></tr>
            )}
            {options.map((opt,i)=>(
              <tr key={opt._key} className="border-t border-black/10">
                <td className="p-2">
                  <input value={opt.label} onChange={e => setOptions(o=> o.map((x,xi)=> xi===i? {...x, label:e.target.value}: x))} className="w-full h-8 rounded border border-black/15 px-2" />
                </td>
                <td className="p-2">
                  <input type="number" min="0" value={opt.price ?? ''} onChange={e => setOptions(o=> o.map((x,xi)=> xi===i? {...x, price: e.target.value===''? null:Number(e.target.value)}: x))} className="w-full h-8 rounded border border-black/15 px-2" />
                </td>
                <td className="p-2 text-center">
                  <button type="button" onClick={() => setOptions(o=> o.filter((_,xi)=> xi!==i))} className="h-8 w-8 rounded bg-red-50 text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={()=> setOptions(o=> [...o, { label:'', price: null, _key: 'new-'+Date.now()+'-'+Math.random().toString(36).slice(2) }])} className="h-8 px-3 rounded-full bg-black/5 hover:bg-black/10 text-xs font-medium">+ {locale==='fr'? 'Ajouter':'Add'}</button>
      </div>

      {/* Expériences */}
      <div className="border-t border-black/10 pt-6 mt-8">
        <h2 className="text-sm font-semibold mb-2">{locale==='fr'? 'Expériences':'Experiences'}</h2>
        <p className="text-xs text-black/50 mb-3">{locale==='fr'? 'Associez des expériences et définissez un prix spécifique (laisser vide = prix bateau normal).':'Associate experiences and set a specific price (leave blank = use boat standard price).'} </p>
        <div className="space-y-2">
          {experiences.map(exp=>{
            const linked = boatExperiences.some(be=>be.experienceId===exp.id);
            const current = boatExperiences.find(be=>be.experienceId===exp.id);
            return (
              <div key={exp.id} className="flex items-center gap-3 p-2 rounded-lg border border-black/10 bg-black/[0.02]">
                <label className="flex items-center gap-2 flex-1">
                  <input type="checkbox" checked={linked} onChange={()=>toggleExperience(exp.id)} className="h-4 w-4" />
                  <span className="text-sm font-medium">{locale==='fr'? exp.titleFr: exp.titleEn}</span>
                </label>
                {linked && (
                  <input type="number" min="0" value={current?.price} onChange={e=> setExpPrice(exp.id, e.target.value)} placeholder={locale==='fr'? 'Prix €':'Price €'} className="h-9 w-32 rounded-md border border-black/20 px-2 text-xs" />
                )}
              </div>
            );
          })}
          {experiences.length===0 && <div className="text-xs text-black/50">{locale==='fr'? 'Aucune expérience.':'No experiences.'}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center rounded-full bg-[color:var(--primary)] text-white h-10 px-5 font-medium disabled:opacity-60">
          {saving ? t.saving : t.save}
        </button>
        <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center rounded-full bg-red-600 text-white h-10 px-5 font-medium disabled:opacity-60">
          {t.delete}
        </button>
      </div>
    </form>
  );
}
