"use client";
import { useEffect, useState } from 'react';

export default function MappingForm(){
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [baseSlug, setBaseSlug] = useState('');
  const [termsSlug, setTermsSlug] = useState('');
  const [privacySlug, setPrivacySlug] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{(async()=>{
    try{
      const [p,s] = await Promise.all([
        fetch('/api/admin/legal-pages').then(r=>r.json()),
        fetch('/api/admin/legal-pages/settings').then(r=>r.json()),
      ]);
      setPages(p.pages||[]);
      const st = s.settings||{};
      setBaseSlug(st.legalBaseSlug||'conditions-paiement-location');
      setTermsSlug(st.legalTermsSlug||'terms');
      setPrivacySlug(st.legalPrivacySlug||'privacy');
    }finally{ setLoading(false); }
  })();},[]);

  async function save(e: React.FormEvent){
    e.preventDefault(); setSaving(true);
    const fd = new FormData();
    fd.append('legalBaseSlug', baseSlug);
    fd.append('legalTermsSlug', termsSlug);
    fd.append('legalPrivacySlug', privacySlug);
    await fetch('/api/admin/legal-pages/settings', { method:'POST', body: fd });
    setSaving(false);
  }

  if(loading) return <div className='rounded-xl border border-black/10 bg-white p-4 text-sm'>Chargement…</div>;
  return (
    <form onSubmit={save} className='rounded-xl border border-black/10 bg-white p-4 text-sm grid gap-3'>
      <div className='font-semibold'>Associer les liens du footer</div>
      <div className='grid sm:grid-cols-3 gap-3'>
        <label className='grid gap-1'>
          <span>Conditions & Paiement</span>
          <select className='h-9 border rounded px-2' value={baseSlug} onChange={e=>setBaseSlug(e.target.value)}>
            <option value=''>—</option>
            {pages.map(p=> <option key={p.id} value={p.slug}>{p.slug}</option>)}
          </select>
        </label>
        <label className='grid gap-1'>
          <span>CGU / Mentions</span>
          <select className='h-9 border rounded px-2' value={termsSlug} onChange={e=>setTermsSlug(e.target.value)}>
            <option value=''>—</option>
            {pages.map(p=> <option key={p.id} value={p.slug}>{p.slug}</option>)}
          </select>
        </label>
        <label className='grid gap-1'>
          <span>Confidentialité</span>
          <select className='h-9 border rounded px-2' value={privacySlug} onChange={e=>setPrivacySlug(e.target.value)}>
            <option value=''>—</option>
            {pages.map(p=> <option key={p.id} value={p.slug}>{p.slug}</option>)}
          </select>
        </label>
      </div>
      <div className='flex justify-end'>
        <button disabled={saving} className='h-9 px-4 rounded-full bg-[color:var(--primary)] text-white text-sm disabled:opacity-50'>Enregistrer</button>
      </div>
    </form>
  );
}
