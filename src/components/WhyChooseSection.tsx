"use client";
import React from "react";

interface WhyChooseSettings {
  whyChooseTitleFr?: string | null;
  whyChooseTitleEn?: string | null;
  whyChooseSubtitleFr?: string | null;
  whyChooseSubtitleEn?: string | null;
  whyChooseList?: string | null; // JSON array string
}

export default function WhyChooseSection({ settings }: { settings?: WhyChooseSettings | null }) {
  if (!settings) return null;
  let items: string[] = [];
  if (settings.whyChooseList) {
    try {
      const parsed = JSON.parse(settings.whyChooseList);
      if (Array.isArray(parsed)) items = parsed.filter((x) => typeof x === "string" && x.trim().length > 0);
    } catch {
      // ignore JSON error
    }
  }
  if (items.length === 0) return null; // rien à afficher

  // Choix langue très simple (peut être amélioré avec i18n existant)
  const locale = typeof navigator !== "undefined" && navigator.language.startsWith("en") ? "en" : "fr";
  const title = locale === "en" ? settings.whyChooseTitleEn || settings.whyChooseTitleFr : settings.whyChooseTitleFr || settings.whyChooseTitleEn;
  const subtitle = locale === "en" ? settings.whyChooseSubtitleEn || settings.whyChooseSubtitleFr : settings.whyChooseSubtitleFr || settings.whyChooseSubtitleEn;

  return (
    <section className="w-full py-12 md:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {title && <h2 className="text-2xl md:text-3xl font-bold mb-3 text-slate-800 dark:text-slate-100">{title}</h2>}
        {subtitle && <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-6 max-w-3xl">{subtitle}</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <li key={i} className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-sm md:text-base text-slate-700 dark:text-slate-200">
              {it}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
