"use client";
import { useState } from 'react';

export default function ExperiencePayButton({ expSlug, boatId, start, end, part, locale, disabled }: { expSlug:string; boatId:number; start:string; end:string; part:string; locale:string; disabled?:boolean; }){
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const go = async ()=>{
    if(disabled||loading) return;
    
    // Récupérer les données du formulaire depuis sessionStorage
    const bookingDataStr = sessionStorage.getItem('experienceBookingData');
    let bookingData: any = {};
    if (bookingDataStr) {
      try {
        bookingData = JSON.parse(bookingDataStr);
      } catch (e) {
        console.error('Error parsing booking data', e);
      }
    }
    
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/checkout/experience', { 
        method:'POST', 
        headers:{ 'Content-Type':'application/json' }, 
        body: JSON.stringify({ 
          expSlug, 
          boatId, 
          start, 
          end, 
          part, 
          locale,
          departurePort: bookingData.departurePort,
          preferredTime: bookingData.preferredTime,
          children: bookingData.children,
          specialRequest: bookingData.specialRequest
        }) 
      });
      const json = await res.json();
      if(!res.ok){ setError(json.error||'error'); setLoading(false); return; }
      if(json.url){ 
        // Nettoyer sessionStorage après envoi réussi
        sessionStorage.removeItem('experienceBookingData');
        window.location.href = json.url; 
        return; 
      }
      setError('no_url'); setLoading(false);
    } catch(e:any){ setError('network'); setLoading(false); }
  };
  const handleClick = () => {
    // Vérifier que le formulaire est valide avant de continuer
    const form = document.getElementById('experience-booking-form') as HTMLFormElement;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Déclencher la soumission du formulaire pour sauvegarder les données
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form?.dispatchEvent(submitEvent);
    // Puis continuer avec le paiement
    go();
  };

  return (
    <div className='mt-5 w-full'>
      <button 
        type="button"
        onClick={handleClick} 
        disabled={disabled||loading} 
        className={`w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center transition ${disabled? 'bg-black/20 text-white/50 cursor-not-allowed':'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800'} ${loading? 'opacity-70':''}`}
      >
        {loading? (locale==='fr'? 'Création du paiement...':'Creating payment...') : (locale==='fr'? 'Continuer vers paiement':'Continue to payment')}
      </button>
      {error && <p className='mt-2 text-[10px] text-red-500'>{locale==='fr'? 'Erreur: ':'Error: '}{error}</p>}
      {disabled && <p className='mt-2 text-[10px] text-black/50'>{locale==='fr'? 'Connectez-vous pour payer':'Log in to pay'}</p>}
    </div>
  );
}
