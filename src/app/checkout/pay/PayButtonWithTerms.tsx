"use client";
import { useEffect, useState } from 'react';
import ClientPayButton from './ClientPayButton';

interface Props {
  locale: string;
  label: string;
  boatSlug: string;
  start: string;
  end?: string;
  part: string;
  pax?: string;
  opts?: string; // ids d'options sélectionnées
  waterToys?: string;
  children?: string;
  specialNeeds?: string;
  excursion?: string;
}

export default function PayButtonWithTerms(props: Props){
  const [accepted, setAccepted] = useState(false);
  useEffect(()=>{
    const cb = document.getElementById('acceptTerms') as HTMLInputElement | null;
    if(!cb) return;
    const handler = ()=> setAccepted(!!cb.checked);
    handler();
    cb.addEventListener('change', handler);
    return ()=> cb.removeEventListener('change', handler);
  },[]);
  return <ClientPayButton {...props} disabled={!accepted} />;
}
