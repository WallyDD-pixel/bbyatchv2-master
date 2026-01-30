"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Props {
  locale: string;
  label: string;
  boatSlug: string;
  start: string;
  end?: string;
  part: string;
  pax?: string;
  disabled?: boolean;
  opts?: string; // ids options sélectionnées
  waterToys?: string;
  children?: string;
  specialNeeds?: string;
  excursion?: string;
  departurePort?: string;
}

export default function ClientPayButton({ locale, label, boatSlug, start, end, part, pax, disabled, opts, waterToys, children, specialNeeds, excursion, departurePort }: Props){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const searchParams = useSearchParams();
  
  // Construire l'URL de retour vers la page checkout avec tous les paramètres
  const buildReturnUrl = () => {
    const params = new URLSearchParams();
    if (boatSlug) params.set('boat', boatSlug);
    if (start) params.set('start', start);
    if (end) params.set('end', end || '');
    if (part) params.set('part', part);
    if (pax) params.set('pax', pax);
    if (opts) params.set('opts', opts);
    if (waterToys) params.set('waterToys', waterToys);
    if (children) params.set('children', children);
    if (specialNeeds) params.set('specialNeeds', specialNeeds);
    if (excursion) params.set('excursion', excursion);
    const lang = searchParams.get('lang');
    if (lang) params.set('lang', lang);
    return `/checkout?${params.toString()}`;
  };
  
  const returnUrl = buildReturnUrl();

  const handleClick = async () => {
    if(disabled || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatSlug, start, end, part, pax, locale, opts, waterToys, children, specialNeeds, excursion, departurePort })
      });
      if(!res.ok){
        const data = await res.json().catch(()=>({ error:'unknown' }));
        setError(data.error||'error');
      } else {
        const data = await res.json();
        if(data.url){
          window.location.href = data.url;
          return;
        } else if(data.status === 'agency_request_created'){
          // Redirige vers page dashboard ou confirmation simple
          window.location.href = '/agency';
          return;
        }
      }
    } catch(e:any){
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className={`w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors`}
        style={{ backgroundColor: loading || disabled ? '#93c5fd' : '#2563eb' }}
      >
        {loading && <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />}
        <span>{label}</span>
      </button>
      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error === 'unauthenticated' ? (
            <p>
              {locale === 'fr' 
                ? 'Veuillez vous connecter ou créer un compte avant de pouvoir réserver. ' 
                : 'Please sign in or create an account before booking. '}
              <Link href={`/signin?callbackUrl=${encodeURIComponent(returnUrl)}`} className="text-[var(--primary)] underline font-semibold">
                {locale === 'fr' ? "S'authentifier" : "Sign in"}
              </Link>
            </p>
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
