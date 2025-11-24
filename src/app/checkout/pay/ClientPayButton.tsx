"use client";
import { useState } from 'react';

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
}

export default function ClientPayButton({ locale, label, boatSlug, start, end, part, pax, disabled, opts, waterToys, children, specialNeeds, excursion }: Props){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const handleClick = async () => {
    if(disabled || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatSlug, start, end, part, pax, locale, opts, waterToys, children, specialNeeds, excursion })
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
        className={`w-full h-11 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2`}
      >
        {loading && <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />}
        <span>{label}</span>
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
