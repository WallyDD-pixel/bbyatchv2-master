"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar, { type SearchValues } from "@/components/SearchBar";
import { getBookingPartLabel, parseSearchPart, type SearchPart } from "@/lib/boat-pricing";
import type { Locale } from "@/i18n/messages";

type ChipTone = "slot-full" | "slot-half" | "slot-sunset" | "date" | "city" | "pax";

type FilterChip = {
  id: string;
  label: string;
  shortLabel: string;
  tone: ChipTone;
  removeKeys: string[];
};

const CHIP_STYLES: Record<ChipTone, string> = {
  "slot-full": "bg-sky-50 text-sky-900 border-sky-200 ring-sky-100",
  "slot-half": "bg-emerald-50 text-emerald-900 border-emerald-200 ring-emerald-100",
  "slot-sunset": "bg-violet-50 text-violet-900 border-violet-200 ring-violet-100",
  date: "bg-slate-50 text-slate-800 border-slate-200 ring-slate-100",
  city: "bg-[color:var(--primary)]/10 text-[color:var(--primary)] border-[color:var(--primary)]/25 ring-[color:var(--primary)]/10",
  pax: "bg-amber-50 text-amber-900 border-amber-200 ring-amber-100",
};

function formatChipDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return locale === "en" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

function slotTone(part: SearchPart): ChipTone {
  if (part === "SUNSET") return "slot-sunset";
  if (part === "HALF" || part === "AM" || part === "PM") return "slot-half";
  return "slot-full";
}

function slotShortLabel(part: SearchPart, labels: Record<string, string>): string {
  if (part === "SUNSET") return labels.search_part_sunset?.split("(")[0]?.trim() || "Sunset";
  if (part === "HALF" || part === "AM" || part === "PM") {
    return labels.search_part_half?.split("(")[0]?.trim() || "Demi-journée";
  }
  return labels.search_part_full?.split("(")[0]?.trim() || "Journée";
}

export function RefineFiltersClient({
  labels,
  locale = "fr",
}: {
  labels: Record<string, string>;
  locale?: Locale;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  const city = sp.get("city") || "";
  const pax = sp.get("pax") || "";
  const partRaw = sp.get("part");
  const start = sp.get("start") || "";
  const end = sp.get("end") || "";
  const lang = sp.get("lang");

  const partSel = partRaw ? parseSearchPart(partRaw) : null;

  const navigate = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  };

  const apply = (vals: SearchValues & { part?: string }) => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    if (vals.city?.trim()) params.set("city", vals.city.trim());
    if (vals.passengers) params.set("pax", String(vals.passengers));
    if (vals.startDate) params.set("start", vals.startDate);
    if (vals.endDate && vals.endDate !== vals.startDate) params.set("end", vals.endDate);
    if (vals.part) params.set("part", vals.part);
    navigate(params);
  };

  const removeKeys = (keys: string[]) => {
    const params = new URLSearchParams(sp.toString());
    keys.forEach((key) => params.delete(key));
    navigate(params);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    navigate(params);
    setOpen(false);
  };

  const chips = useMemo((): FilterChip[] => {
    const list: FilterChip[] = [];

    if (partRaw && partSel) {
      list.push({
        id: "part",
        label: getBookingPartLabel(labels, partSel),
        shortLabel: slotShortLabel(partSel, labels),
        tone: slotTone(partSel),
        removeKeys: ["part"],
      });
    }

    if (start) {
      const dateLabel =
        end && end !== start
          ? `${formatChipDate(start, locale)} → ${formatChipDate(end, locale)}`
          : formatChipDate(start, locale);
      list.push({
        id: "date",
        label: `${labels.search_filter_date}: ${dateLabel}`,
        shortLabel: dateLabel,
        tone: "date",
        removeKeys: ["start", "end"],
      });
    }

    if (city) {
      list.push({
        id: "city",
        label: `${labels.search_filter_city}: ${city}`,
        shortLabel: city,
        tone: "city",
        removeKeys: ["city"],
      });
    }

    if (pax) {
      list.push({
        id: "pax",
        label: `≥ ${pax} ${labels.search_filter_min_pax}`,
        shortLabel: `≥ ${pax} pax`,
        tone: "pax",
        removeKeys: ["pax"],
      });
    }

    return list;
  }, [partRaw, partSel, start, end, city, pax, labels, locale]);

  const searchBarKey = `${city}|${start}|${end}|${partRaw}|${pax}`;

  return (
    <section className="mb-8 rounded-2xl border border-black/10 bg-white/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:p-5 border-b border-black/5 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4M12 16h0" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black">{labels.search_filter_active}</p>
              <p className="text-xs text-black/50 truncate">
                {chips.length === 0
                  ? labels.search_filter_none
                  : `${chips.length} ${locale === "fr" ? "critère" : "criteria"}${chips.length > 1 ? (locale === "fr" ? "s" : "") : ""}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chips.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="h-9 px-3 rounded-full text-xs font-semibold text-black/55 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
              >
                {labels.search_filter_clear_all}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="h-9 px-4 rounded-full bg-[color:var(--primary)] text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 active:scale-[.98] transition"
            >
              {open ? labels.search_refine_close : labels.search_filter_edit}
            </button>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip.id}
                className={`inline-flex items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium ring-1 ring-inset ${CHIP_STYLES[chip.tone]}`}
              >
                <span className="truncate" title={chip.label}>
                  <span className="font-semibold opacity-70">
                    {chip.id === "part"
                      ? labels.search_filter_slot
                      : chip.id === "date"
                        ? labels.search_filter_date
                        : chip.id === "city"
                          ? labels.search_filter_city
                          : "Pax"}
                    :
                  </span>{" "}
                  {chip.shortLabel}
                </span>
                <button
                  type="button"
                  aria-label={`${labels.search_filter_remove} — ${chip.label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeKeys(chip.removeKeys);
                  }}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-black/5 hover:bg-black/15 text-black/70 hover:text-black transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-black/45">{labels.search_filter_none}</p>
        )}
      </div>

      {open && (
        <div className="p-4 sm:p-5 bg-white border-t border-black/5">
          <SearchBar
            key={searchBarKey}
            labels={labels}
            locale={locale}
            onSubmit={(v) => {
              apply(v);
              setOpen(false);
            }}
            className="bg-transparent border-0 shadow-none p-0 ring-0"
            initialValues={{
              city,
              startDate: start,
              endDate: end || start,
              passengers: pax ? parseInt(pax, 10) || 2 : 2,
              part:
                partSel === "FULL" || partSel === "HALF" || partSel === "SUNSET"
                  ? partSel
                  : null,
            }}
          />
        </div>
      )}
    </section>
  );
}
