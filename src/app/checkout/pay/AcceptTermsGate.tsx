"use client";
import { useEffect, useState } from 'react';

// Renders children as function with accepted:boolean depending on #acceptTerms checkbox
export default function AcceptTermsGate({ children }: { children: (accepted:boolean)=>React.ReactNode }){
  const [accepted,setAccepted]=useState(false);
  useEffect(()=>{
    const cb = document.getElementById('acceptTerms') as HTMLInputElement | null;
    if(!cb) return;
    const handler = ()=> setAccepted(!!cb.checked);
    handler();
    cb.addEventListener('change', handler);
    return ()=> cb.removeEventListener('change', handler);
  },[]);
  return <>{children(accepted)}</>;
}
