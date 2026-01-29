"use client";

import Link from "next/link";
import { type Locale } from "@/i18n/messages";

interface ReservationRowProps {
  reservation: any;
  locale: Locale;
  startDateFormatted: string;
  endDateFormatted: string;
  dayCount: number;
  partLabel: string;
  statusLabel: string;
  statusClass: string;
  totalPriceFormatted: string;
  experienceTitle: string | null;
}

export default function ReservationRow({
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
}: ReservationRowProps) {
  const detailUrl = `/dashboard/reservations/${r.id}${locale === 'en' ? '?lang=en' : ''}`;
  
  return (
    <tr className="border-t border-black/5 hover:bg-[color:var(--primary)]/5 transition group cursor-pointer" onClick={() => window.location.href = detailUrl}>
      <td className="py-2.5 pl-3 pr-4 whitespace-nowrap align-top">
        <Link href={detailUrl} className="text-[color:var(--primary)] hover:underline font-medium group-hover:text-[color:var(--primary)] block">
          {r.boat?.name || '—'}
        </Link>
        {experienceTitle && (
          <div className="mt-0.5 text-[10px] inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-medium tracking-wide">
            {locale==='fr'? 'Expérience':'Experience'}: {experienceTitle}
          </div>
        )}
        <div className="text-[10px] text-black/50 mt-0.5">{locale === 'fr' ? 'Cliquer pour voir les détails' : 'Click to view details'}</div>
      </td>
      <td className="py-2.5 px-4 whitespace-nowrap">{startDateFormatted}</td>
      <td className="py-2.5 px-4 whitespace-nowrap">{endDateFormatted}</td>
      <td className="py-2.5 px-4 whitespace-nowrap text-center hidden md:table-cell">{dayCount}</td>
      <td className="py-2.5 px-4 whitespace-nowrap hidden lg:table-cell">{partLabel}</td>
      <td className="py-2.5 px-4 whitespace-nowrap">
        <span className={`inline-flex items-center rounded-full px-2.5 h-6 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
      </td>
      <td className="py-2.5 px-4 whitespace-nowrap hidden md:table-cell">
        <a href={`/api/invoices/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center rounded-full border border-black/15 px-3 h-7 hover:bg-black/5" onClick={(e) => e.stopPropagation()}>
          {locale==='fr'? 'Voir':'View'}
        </a>
      </td>
      <td className="py-2.5 px-4 whitespace-nowrap hidden lg:table-cell">
        <a href={`/api/invoices/final/${r.id}`} target="_blank" rel="noopener noreferrer" className={`text-xs inline-flex items-center rounded-full border border-black/15 px-3 h-7 hover:bg-black/5 ${r.status!=='completed' ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={r.status!=='completed'} onClick={(e) => e.stopPropagation()}>
          {locale==='fr'? 'Voir':'View'}
        </a>
      </td>
      <td className="py-2.5 pl-4 pr-3 text-right whitespace-nowrap font-medium">{totalPriceFormatted}</td>
    </tr>
  );
}
