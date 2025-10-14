"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchBar, { type SearchValues } from '@/components/SearchBar';

const PART_LABEL: Record<string,string> = { FULL: 'Journée entière', AM: 'Matin', PM: 'Après-midi' };

export function RefineFiltersClient({ labels }: { labels: Record<string,string> }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const city = sp.get('city') || '';
  const pax = sp.get('pax') || '';
  const part = sp.get('part') || 'FULL';
  const start = sp.get('start') || '';
  const end = sp.get('end') || '';

  const apply = (vals: SearchValues & { part?: string }) => {
    const params = new URLSearchParams();
    if (vals.city) params.set('city', vals.city);
    if (vals.passengers) params.set('pax', String(vals.passengers));
    if (vals.startDate) params.set('start', vals.startDate);
    if (vals.endDate) params.set('end', vals.endDate);
    if (vals.part) params.set('part', vals.part);
    router.push(`/search?${params.toString()}`);
  };

  const remove = (key: string) => {
    const params = new URLSearchParams(sp.toString());
    params.delete(key);
    router.push(`/search?${params.toString()}`);
  };

  const chips: { key: string; label: string; paramKey: string }[] = [];
  if (city) chips.push({ key: 'city', label: `${labels.search_filter_city}: ${city}`, paramKey: 'city' });
  if (pax) chips.push({ key: 'pax', label: `≥ ${pax} ${labels.search_filter_min_pax}`, paramKey: 'pax' });
  if (part) {
    const pLabel = part==='FULL'? (labels.search_part_full||PART_LABEL.FULL) : part==='AM'? (labels.search_part_am||PART_LABEL.AM) : (labels.search_part_pm||PART_LABEL.PM);
    chips.push({ key: 'part', label: pLabel, paramKey: 'part' });
  }
  if (start) chips.push({ key: 'start', label: `${labels.search_filter_start}: ${start}`, paramKey: 'start' });
  if (end && end !== start) chips.push({ key: 'end', label: `${labels.search_filter_end}: ${end}`, paramKey: 'end' });

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setOpen(o=>!o)} type="button" className="h-10 px-5 rounded-full bg-white shadow-sm border border-black/10 text-sm font-medium hover:shadow transition">
          {open ? (labels.search_refine_close||'Fermer') : (labels.search_refine_open||'Modifier la recherche')}
        </button>
        {chips.length === 0 && <span className="text-xs text-black/50">{labels.search_filter_none}</span>}
        {chips.map(c => (
          <span key={c.key} className="group inline-flex items-center gap-1 h-9 pl-3 pr-2 rounded-full bg-white border border-black/10 shadow-sm text-xs font-medium">
            {c.label}
            <button aria-label={labels.search_filter_remove||'Retirer'} onClick={() => remove(c.paramKey)} type="button" className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-black/10 text-black/60">
              ×
            </button>
          </span>
        ))}
      </div>
      {open && (
        <div className="mt-5 p-4 rounded-2xl bg-white/80 backdrop-blur border border-black/10 shadow-sm">
          <SearchBar
            labels={labels}
            onSubmit={(v) => { apply(v); setOpen(false); }}
            className="bg-transparent border-0 p-0"
          />
        </div>
      )}
    </div>
  );
}
