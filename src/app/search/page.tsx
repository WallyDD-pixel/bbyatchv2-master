import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { messages, type Locale } from "@/i18n/messages";
import HeaderBar from "@/components/HeaderBar";
import Footer from "@/components/Footer";
import { RefineFiltersClient } from './RefineFiltersClient';

// Page résultats de recherche de bateaux
interface SearchParamsShape {
  lang?: string;
  city?: string;
  start?: string;
  end?: string;
  startTime?: string;
  endTime?: string;
  pax?: string;
  part?: string;
}

export default async function SearchResultsPage({ searchParams }: { searchParams?: SearchParamsShape }) {
  const sp: SearchParamsShape = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  const { city, pax, start, end, startTime, endTime, part } = sp || {};
  const partSel = (part === 'AM' || part === 'PM' || part === 'FULL') ? part : 'FULL';

  // Calcul nombre de jours sélectionnés
  let nbJours = 0;
  if (start) {
    try {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(((end && partSel==='FULL')? end : start) + 'T00:00:00');
      const diff = Math.round((e.getTime() - s.getTime())/86400000) + 1;
      if (diff > 0 && diff < 1000) nbJours = diff;
    } catch {}
  }
  // Règle: moins de 7 jours pour FULL => nbJours <=6
  if (partSel==='FULL' && nbJours>6) nbJours = 0; // invalide, forcera aucun résultat

  // Si dates et part présents -> calcul disponibilité interne sans fetch externe
  let boats:any[] = [];
  if (start && partSel) {
    const fromDate = new Date(start + 'T00:00:00');
    const toDate = new Date((partSel==='FULL' ? (end || start) : start) + 'T23:59:59');
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && fromDate <= toDate) {
      // Vérification règle durée FULL (moins de 7 jours)
      if (partSel==='FULL') {
        const diffDaysFull = Math.round(( (new Date((end||start)+'T00:00:00')).getTime() - fromDate.getTime())/86400000)+1;
        if (diffDaysFull>6) {
          // hors règle -> aucun résultat
        } else {
          const [allBoats, slots] = await Promise.all([
            (prisma as any).boat.findMany({ where: { available: true }, select: { id:true, name:true, slug:true, imageUrl:true, capacity:true, pricePerDay:true, priceAm:true, pricePm:true, enginePower:true, speedKn:true, fuel:true } }),
            (prisma as any).availabilitySlot.findMany({
              where: { date: { gte: fromDate, lte: toDate }, status: 'available' },
              select: { boatId:true, date:true, part:true }
            })
          ]);
          const byBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean }>> = {};
          for (const s of slots) {
            const d = new Date(s.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            (byBoat[s.boatId] ||= {});
            (byBoat[s.boatId][key] ||= {});
            (byBoat[s.boatId][key] as any)[s.part] = true;
          }
          const requiredDays: string[] = [];
          { let cur = new Date(fromDate); while (cur <= toDate) { const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`; requiredDays.push(key); cur = new Date(cur.getTime()+86400000);} }
          boats = allBoats.filter((b:any)=>{
            const days = byBoat[b.id]; if(!days) return false; const startDayKey = requiredDays[0]; const startParts = days[startDayKey]; if(!startParts) return false;
            if (partSel==='FULL') {
              // Besoin d'un slot FULL le jour de départ uniquement
              if (!startParts.FULL) return false;
              if (requiredDays.length>6) return false; // sécurité
              return true;
            }
            return false; // ne devrait pas arriver ici (FULL seulement)
          }).sort((a:any,b:any)=> a.pricePerDay - b.pricePerDay);
          if (pax) { const paxNum = parseInt(pax,10); if(!isNaN(paxNum)) boats = boats.filter(b=> b.capacity>=paxNum); }
        }
      } else {
        // AM ou PM (un seul jour)
        const [allBoats, slots] = await Promise.all([
          (prisma as any).boat.findMany({ where: { available: true }, select: { id:true, name:true, slug:true, imageUrl:true, capacity:true, pricePerDay:true, priceAm:true, pricePm:true, enginePower:true, speedKn:true, fuel:true } }),
          (prisma as any).availabilitySlot.findMany({
            where: { date: { gte: fromDate, lte: toDate }, status: 'available' },
            select: { boatId:true, date:true, part:true }
          })
        ]);
        const byBoat: Record<number, { AM?: boolean; PM?: boolean; FULL?: boolean }> = {};
        for (const s of slots) { (byBoat[s.boatId] ||= {}); (byBoat[s.boatId] as any)[s.part] = true; }
        boats = allBoats.filter((b:any)=>{
          const parts = byBoat[b.id]; if(!parts) return false;
          if (partSel==='AM') return !!(parts.FULL || parts.AM);
          if (partSel==='PM') return !!(parts.FULL || parts.PM);
          return false;
        }).sort((a:any,b:any)=> a.pricePerDay - b.pricePerDay);
        if (pax) { const paxNum = parseInt(pax,10); if(!isNaN(paxNum)) boats = boats.filter(b=> b.capacity>=paxNum); }
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,#eef1f6,#fdfdfc_60%)]">
      <HeaderBar initialLocale={locale} />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-20 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/?lang=${locale}`}
            className="group inline-flex items-center gap-2 text-sm font-medium rounded-full border border-[var(--primary)]/30 bg-white/90 px-4 py-2 text-[var(--primary)] shadow-sm hover:bg-[var(--primary)] hover:text-white hover:shadow-md active:scale-[.97] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            aria-label={t.back_home || 'Accueil'}
          >
            <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
            <span>{t.back_home || 'Accueil'}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-black">{t.search_results_title || "Résultats de recherche"}</h1>
          <div />
        </div>
        <RefineFiltersClient labels={{...t, search_part: t.search_part || 'Créneau'}} />
        {start && (
          <div className="mb-6 mt-4 text-xs text-black/60">
            {partSel==='FULL' ? (
              <>Période sélectionnée: <span className="font-semibold text-black">{nbJours} jour{nbJours>1? 's':''}</span></>
            ) : (
              <>Créneau sélectionné: <span className="font-semibold text-black">{partSel==='AM'? 'Matin':'Après-midi'} {start}</span></>
            )}
          </div>
        )}
        {(!boats || boats.length === 0) && (
          <div className="p-10 text-center bg-white rounded-xl border border-black/10 shadow-sm">
            {start ? (t.search_no_results || "Aucun bateau trouvé avec ces critères.") : 'Sélectionnez des dates et un créneau.'}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boats.map((b) => {
            // Tarification : FULL multi jours -> pricePerDay * nbJours, demi-journée -> prix partiel si dispo sinon fallback
            let total = 0;
            if (partSel==='FULL') {
              total = (nbJours>0 ? nbJours : 1) * b.pricePerDay;
            } else if (partSel==='AM') {
              total = (b.priceAm ?? Math.round(b.pricePerDay/2));
            } else if (partSel==='PM') {
              total = (b.pricePm ?? Math.round(b.pricePerDay/2));
            }
            const perDay = b.pricePerDay;
            const specs: string[] = [];
            if (b.enginePower) specs.push(`⚙️ ${b.enginePower} cv`);
            if (b.speedKn) specs.push(`🚀 ${b.speedKn} nds`);
            if (b.fuel) specs.push(`🛢️ ${b.fuel} L`);
            if (b.capacity) specs.push(`🧍 ${b.capacity} pax`);
            const qs = new URLSearchParams({ lang: locale });
            qs.set('start', start || '');
            if (partSel==='FULL' && (end || start)) qs.set('end', end || start || '');
            // transmettre part & times
            qs.set('part', partSel);
            if (partSel==='FULL') {
              qs.set('startTime','08:00');
              qs.set('endTime','18:00');
            } else if (partSel==='AM') {
              qs.set('startTime','08:00');
              qs.set('endTime','12:00');
            } else if (partSel==='PM') {
              qs.set('startTime','13:00');
              qs.set('endTime','18:00');
            }
            const href = `/boats/${b.slug}?${qs.toString()}`;
            return (
            <Link
              href={href}
              key={b.id}
              className="group rounded-2xl bg-white shadow-lg border border-black/10 overflow-hidden hover:shadow-xl transition-all duration-300 relative"
            >
              <div className="relative h-44 sm:h-52">
                {b.imageUrl && (
                  <Image src={b.imageUrl} alt={b.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute left-3 top-3 bg-[var(--primary)] text-white px-4 py-2 rounded-xl shadow font-extrabold text-lg flex flex-col items-start leading-tight">
                  <span>{total.toLocaleString('fr-FR')} €</span>
                  {partSel==='FULL' && <span className="text-[10px] font-medium opacity-90">{nbJours} j</span>}
                  {partSel==='AM' && <span className="text-[10px] font-medium opacity-90">Matin</span>}
                  {partSel==='PM' && <span className="text-[10px] font-medium opacity-90">Après-midi</span>}
                </div>
                {partSel==='FULL' && nbJours>1 && (
                  <div className="absolute right-3 top-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[11px] font-medium shadow text-black/70">
                    {perDay.toLocaleString('fr-FR')} €/j
                  </div>
                )}
                {partSel!=='FULL' && (
                  <div className="absolute right-3 top-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[11px] font-medium shadow text-black/70">
                    {perDay.toLocaleString('fr-FR')} €/j (journée)
                  </div>
                )}
                <div className="absolute left-3 bottom-3 text-white font-extrabold text-lg drop-shadow">
                  {b.name}
                </div>
              </div>
              <div className="p-5 text-sm flex flex-col gap-1">
                {specs.length>0 && (
                  <div className="text-black/70 leading-snug">
                    {specs.join(' • ')}
                  </div>
                )}
                <div className="pt-3 mt-2 border-t border-black/10 text-[var(--primary)] font-medium cursor-pointer group-hover:translate-x-1 transition-transform">
                  {t.boats_details_cta || "Détails"} →
                </div>
              </div>
            </Link>
          );})}
        </div>
        {start && partSel==='FULL' && nbJours>1 && (
          <div className="mb-3 -mt-2 text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded px-3 py-2">
            Règle assouplie: seuls les slots du premier jour sont vérifiés pour cette plage (moins de 7 jours). Les jours suivants seront à confirmer.
          </div>
        )}
      </div>
      <Footer locale={locale} t={t} />
    </div>
  );
}
