"use client";
import { useState } from 'react';

export default function ExperiencePayButton({ expSlug, boatId, start, end, part, locale, disabled }: { expSlug:string; boatId:number; start:string; end:string; part:string; locale:string; disabled?:boolean; }){
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const go = async ()=>{
    if(disabled||loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/checkout/experience', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ expSlug, boatId, start, end, part, locale }) });
      const json = await res.json();
      if(!res.ok){ setError(json.error||'error'); setLoading(false); return; }
      if(json.url){ window.location.href = json.url; return; }
      setError('no_url'); setLoading(false);
    } catch(e:any){ setError('network'); setLoading(false); }
  };
  return (
    <div className='mt-5 w-full'>
      <button onClick={go} disabled={disabled||loading} className={`w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center transition ${disabled? 'bg-black/20 text-white/50 cursor-not-allowed':'bg-[var(--primary)] text-white hover:brightness-110 active:brightness-95'} ${loading? 'opacity-70':''}`}>
        {loading? (locale==='fr'? 'Création du paiement...':'Creating payment...') : (locale==='fr'? 'Continuer vers paiement':'Continue to payment')}
      </button>
      {error && <p className='mt-2 text-[10px] text-red-500'>{locale==='fr'? 'Erreur: ':'Error: '}{error}</p>}
      {disabled && <p className='mt-2 text-[10px] text-black/50'>{locale==='fr'? 'Connectez-vous pour payer':'Log in to pay'}</p>}
    </div>
  );
}
