"use client";

interface ReservationCardProps {
  reservation: any;
  locale: string;
  startDateFormatted: string;
  endDateFormatted: string;
  dayCount: number;
  partLabel: string;
  statusLabel: string;
  statusClass: string;
  totalPriceFormatted: string;
  experienceTitle: string | null;
}

export default function ReservationCard({
  reservation: r,
  locale,
  startDateFormatted,
  endDateFormatted,
  dayCount,
  partLabel,
  statusLabel,
  statusClass,
  totalPriceFormatted,
  experienceTitle,
}: ReservationCardProps) {
  const detailUrl = `/dashboard/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`;
  
  return (
    <div 
      onClick={() => window.location.href = detailUrl}
      className="block rounded-xl border border-black/10 bg-white/70 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="font-semibold text-[color:var(--primary)]">{r.boat?.name || '—'}</div>
          {experienceTitle && (
            <div className="mt-0.5 text-[10px] inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-medium">
              {locale==='fr'? 'Expérience':'Experience'}: {experienceTitle}
            </div>
          )}
          <div className="mt-1 text-xs text-black/60">{startDateFormatted} → {endDateFormatted}</div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-semibold ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-medium text-black/70">{locale==='fr'? 'Jours':'Days'}</div>
          <div className="text-sm font-semibold">{dayCount}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-black/70">{locale==='fr'? 'Partie':'Part'}</div>
          <div className="text-sm font-semibold">{partLabel}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-black/70">{locale==='fr'? 'Acompte':'Deposit'}</div>
          <a href={`/api/invoices/${r.id}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-black/15 px-3 h-7 leading-7 text-[11px] font-medium hover:bg-black/5" onClick={(e) => e.stopPropagation()}>PDF</a>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-black/70">{locale==='fr'? 'Finale':'Final'}</div>
          <a href={`/api/invoices/final/${r.id}`} target="_blank" rel="noopener noreferrer" className={`inline-block rounded-full border border-black/15 px-3 h-7 leading-7 text-[11px] font-medium hover:bg-black/5 ${r.status!=='completed' ? 'pointer-events-none opacity-40' : ''}`} onClick={(e) => e.stopPropagation()}>PDF</a>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm font-semibold">
        <span className="text-black/60">Total</span>
        <span>{totalPriceFormatted}</span>
      </div>
    </div>
  );
}
