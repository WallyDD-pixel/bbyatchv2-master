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

export default async function SearchResultsPage({ searchParams }: { searchParams?: Promise<SearchParamsShape> }) {
  const sp: SearchParamsShape = (await searchParams) || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  const { city, pax, start, end, startTime, endTime, part } = sp;
  // Gérer HALF comme AM (demi-journée = matin)
  let partSel: 'AM' | 'PM' | 'FULL' = 'FULL';
  if (part === 'AM' || part === 'PM' || part === 'FULL') {
    partSel = part;
  } else if (part === 'HALF' || part === 'SUNSET') {
    // HALF et SUNSET sont traités comme AM pour la recherche
    partSel = 'AM';
  }
  console.log('[search] Part from URL:', part, '-> partSel:', partSel);

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
      // Récupérer l'ID de la ville si fourni (une seule fois pour les deux branches)
      let cityId: number | undefined = undefined;
      if (city) {
        // Essayer d'abord avec le nom exact
        let cityRecord = await prisma.city.findUnique({ where: { name: city.trim() }, select: { id: true } });
        // Si pas trouvé, essayer une recherche insensible à la casse
        if (!cityRecord) {
          const allCities = await prisma.city.findMany({ select: { id: true, name: true } });
          const matched = allCities.find(c => c.name.toLowerCase().trim() === city.toLowerCase().trim());
          if (matched) cityRecord = { id: matched.id };
        }
        if (cityRecord) {
          cityId = cityRecord.id;
          console.log('[search] City filter:', city, '-> cityId:', cityId);
        } else {
          console.log('[search] WARNING: City not found in database:', city, '- showing all boats');
        }
      }
      
      // Construire le filtre de bateau avec ville si nécessaire
      // NOTE: On ne filtre PAS par ville au niveau de la requête initiale
      // On récupère tous les bateaux disponibles, puis on filtre par slots disponibles
      // Cela permet d'afficher les bateaux qui ont des slots même s'ils ne sont pas dans la ville recherchée
      // (car un bateau peut être disponible dans plusieurs villes)
      const boatWhere: any = { available: true };
      console.log('[search] No city filter at query level - will filter by available slots only');
      
      // Vérification règle durée FULL (moins de 7 jours)
      if (partSel==='FULL') {
        // Normaliser les dates en UTC pour correspondre au stockage des slots
        const [startYear, startMonth, startDay] = start.split('-').map(Number);
        const endDateStr = end || start;
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const fromDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const toDateUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
        
        const diffDaysFull = Math.round((toDateUTC.getTime() - fromDateUTC.getTime())/86400000)+1;
        if (diffDaysFull>6) {
          // hors règle -> aucun résultat
        } else {
          // Récupérer d'abord les slots normaux pour identifier les bateaux disponibles
          const slots = await (prisma as any).availabilitySlot.findMany({
            where: { date: { gte: fromDateUTC, lte: toDateUTC }, status: 'available' },
            select: { boatId:true, date:true, part:true }
          });
          console.log('[search] FULL - Found slots:', slots.length);
          
          // Récupérer aussi les slots d'événements pour cette période
          const expSlots = await (prisma as any).experienceAvailabilitySlot.findMany({
            where: { 
              date: { gte: fromDateUTC, lte: toDateUTC }, 
              status: 'available',
              boatId: { not: null } // Seulement les slots liés à un bateau spécifique
            },
            select: { boatId:true, date:true, part:true }
          });
          console.log('[search] FULL - Found experience slots:', expSlots.length);
          
          // Récupérer les bateaux qui ont des slots disponibles (normaux ou événements)
          const slotBoatIds = [...new Set([...slots.map((s:any) => s.boatId), ...expSlots.map((s:any) => s.boatId)].filter(Boolean))];
          console.log('[search] FULL - Slot boatIds:', slotBoatIds);
          
          // Récupérer tous les bateaux disponibles qui ont des slots
          const allBoats = await (prisma as any).boat.findMany({ 
            where: { 
              available: true,
              id: { in: slotBoatIds.length > 0 ? slotBoatIds : [] }
            }, 
            select: { id:true, name:true, slug:true, imageUrl:true, capacity:true, pricePerDay:true, priceAm:true, pricePm:true, enginePower:true, lengthM:true, cityId:true } 
          });
          console.log('[search] FULL - Found boats with slots:', allBoats.length);
          if (allBoats.length > 0) {
            console.log('[search] FULL - Boat IDs:', allBoats.map((b:any) => `${b.id}:${b.name} (cityId:${b.cityId})`));
          }
          
          // Organiser les slots normaux par bateau et par date (en UTC)
          const byBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean }>> = {};
          for (const s of slots) {
            const d = new Date(s.date);
            // Utiliser UTC pour extraire la date, comme les slots sont stockés en UTC
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
            (byBoat[s.boatId] ||= {});
            (byBoat[s.boatId][key] ||= {});
            (byBoat[s.boatId][key] as any)[s.part] = true;
          }
          
          // Organiser les slots d'événements par bateau et par date (en UTC)
          const expByBoat: Record<number, Record<string, { AM?: boolean; PM?: boolean; FULL?: boolean }>> = {};
          for (const s of expSlots) {
            if (!s.boatId) continue;
            const d = new Date(s.date);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
            (expByBoat[s.boatId] ||= {});
            (expByBoat[s.boatId][key] ||= {});
            (expByBoat[s.boatId][key] as any)[s.part] = true;
          }
          console.log('[search] FULL - Slots by boat:', Object.keys(byBoat).map(boatId => {
            const boat = allBoats.find((b:any) => b.id === Number(boatId));
            return `${boatId}:${boat?.name || 'unknown'} -> ${JSON.stringify(byBoat[Number(boatId)])}`;
          }));
          
          // Générer la liste des jours requis en UTC
          const requiredDays: string[] = [];
          let currentDate = new Date(fromDateUTC);
          while(currentDate <= toDateUTC) {
            const key = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth()+1).padStart(2,'0')}-${String(currentDate.getUTCDate()).padStart(2,'0')}`;
            requiredDays.push(key);
            currentDate = new Date(currentDate.getTime() + 86400000);
          }
          console.log('[search] FULL - Required days:', requiredDays);
          
          // Inclure TOUS les bateaux qui ont au moins un slot disponible (normal ou événement) pour au moins un jour de la plage
          // On va ajouter une propriété availableParts pour indiquer quels créneaux sont disponibles
          boats = allBoats.map((b:any)=>{
            const days = byBoat[b.id];
            const expDays = expByBoat[b.id];
            
            // Si pas de slots normaux ni d'événements, exclure
            if(!days && !expDays) {
              return null;
            }
            
            // Déterminer les créneaux disponibles pour ce bateau sur la plage de dates
            const availableParts: { FULL?: boolean; AM?: boolean; PM?: boolean; SUNSET?: boolean } = {};
            let hasAnySlot = false;
            let hasOnlyExpSlots = false; // Indique si le bateau n'a QUE des slots d'événements
            
            // Vérifier les slots normaux
            if(days) {
              for(const dayKey of requiredDays) {
                const dayParts = days[dayKey];
                if(dayParts) {
                  hasAnySlot = true;
                  if(dayParts.FULL) availableParts.FULL = true;
                  if(dayParts.AM) availableParts.AM = true;
                  if(dayParts.PM) availableParts.PM = true;
                  if((dayParts as any).SUNSET) availableParts.SUNSET = true;
                }
              }
            }
            
            // Vérifier les slots d'événements
            if(expDays) {
              for(const dayKey of requiredDays) {
                const dayParts = expDays[dayKey];
                if(dayParts) {
                  hasAnySlot = true;
                  // Les slots d'événements sont aussi comptabilisés
                  if(dayParts.FULL) availableParts.FULL = true;
                  if(dayParts.AM) availableParts.AM = true;
                  if(dayParts.PM) availableParts.PM = true;
                  if((dayParts as any).SUNSET) availableParts.SUNSET = true;
                }
              }
            }
            
            // Si le bateau n'a que des slots d'événements (pas de slots normaux)
            if(!days && expDays) {
              hasOnlyExpSlots = true;
            }
            
            if(!hasAnySlot) {
              return null;
            }
            
            // Ajouter les propriétés au bateau
            return { ...b, availableParts, hasOnlyExpSlots };
          }).filter((b:any) => b !== null).sort((a:any,b:any)=> {
            // Trier d'abord par correspondance exacte au critère recherché, puis par prix
            const aMatches = (a.availableParts.FULL || (a.availableParts.AM && a.availableParts.PM));
            const bMatches = (b.availableParts.FULL || (b.availableParts.AM && b.availableParts.PM));
            if(aMatches && !bMatches) return -1;
            if(!aMatches && bMatches) return 1;
            return a.pricePerDay - b.pricePerDay;
          });
          console.log('[search] FULL - After slot filter:', boats.length, 'boats');
          if (pax) { 
            const paxNum = parseInt(pax,10);
            if(!isNaN(paxNum)) {
              const beforePax = boats.length;
              boats = boats.filter(b=> {
                const included = b.capacity>=paxNum;
                if (!included) {
                  console.log('[search] FULL - Boat', b.id, b.name, 'excluded: capacity', b.capacity, '<', paxNum);
                }
                return included;
              });
              console.log('[search] FULL - After pax filter:', boats.length, '(was', beforePax, ')');
            }
          }
        }
      } else {
        // AM ou PM (un seul jour) - normaliser la date en UTC
        const [startYear, startMonth, startDay] = start.split('-').map(Number);
        const fromDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
        const toDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 23, 59, 59, 999));
        
        // Récupérer d'abord les slots normaux
        const slots = await (prisma as any).availabilitySlot.findMany({
          where: { date: { gte: fromDateUTC, lte: toDateUTC }, status: 'available' },
          select: { boatId:true, date:true, part:true }
        });
        console.log('[search] AM/PM - Found slots:', slots.length);
        
        // Récupérer aussi les slots d'événements pour cette date
        const expSlots = await (prisma as any).experienceAvailabilitySlot.findMany({
          where: { 
            date: { gte: fromDateUTC, lte: toDateUTC }, 
            status: 'available',
            boatId: { not: null } // Seulement les slots liés à un bateau spécifique
          },
          select: { boatId:true, date:true, part:true }
        });
        console.log('[search] AM/PM - Found experience slots:', expSlots.length);
        
        // Récupérer les bateaux qui ont des slots disponibles (normaux ou événements)
        const slotBoatIds = [...new Set([...slots.map((s:any) => s.boatId), ...expSlots.map((s:any) => s.boatId)].filter(Boolean))];
        console.log('[search] AM/PM - Slot boatIds:', slotBoatIds);
        
        // Récupérer tous les bateaux disponibles qui ont des slots
        const allBoats = await (prisma as any).boat.findMany({ 
          where: { 
            available: true,
            id: { in: slotBoatIds.length > 0 ? slotBoatIds : [] }
          }, 
          select: { id:true, name:true, slug:true, imageUrl:true, capacity:true, pricePerDay:true, priceAm:true, pricePm:true, enginePower:true, lengthM:true, cityId:true } 
        });
        console.log('[search] AM/PM - Found boats:', allBoats.length, 'slots:', slots.length);
        if (allBoats.length > 0) {
          console.log('[search] AM/PM - Boat IDs:', allBoats.map((b:any) => `${b.id}:${b.name} (cityId:${b.cityId})`));
        }
        if (slots.length > 0) {
          console.log('[search] AM/PM - Slot details:', slots.map((s:any) => `boatId:${s.boatId}, date:${s.date.toISOString()}, part:${s.part}`));
          // Vérifier quels bateaux avec slots ne sont pas dans allBoats
          const missingBoatIds = slotBoatIds.filter(id => !allBoats.find((b:any) => b.id === id));
          if (missingBoatIds.length > 0) {
            console.log('[search] AM/PM - WARNING: Slots exist for boatIds not in filtered boats:', missingBoatIds);
            // Récupérer les infos de ces bateaux pour debug
            const missingBoats = await prisma.boat.findMany({ 
              where: { id: { in: missingBoatIds } }, 
              select: { id: true, name: true, cityId: true, available: true } 
            });
            console.log('[search] AM/PM - Missing boats info:', missingBoats);
            // Si des bateaux sans ville ont des slots, on pourrait les inclure
            if (cityId !== undefined && missingBoats.some(b => b.cityId === null)) {
              console.log('[search] AM/PM - INFO: Some boats without city have slots. Consider including them.');
            }
          }
        }
        const byBoat: Record<number, { AM?: boolean; PM?: boolean; FULL?: boolean; SUNSET?: boolean }> = {};
        for (const s of slots) { (byBoat[s.boatId] ||= {}); (byBoat[s.boatId] as any)[s.part] = true; }
        
        // Organiser aussi les slots d'événements
        const expByBoat: Record<number, { AM?: boolean; PM?: boolean; FULL?: boolean; SUNSET?: boolean }> = {};
        for (const s of expSlots) { 
          if (!s.boatId) continue;
          (expByBoat[s.boatId] ||= {}); 
          (expByBoat[s.boatId] as any)[s.part] = true; 
        }
        console.log('[search] AM/PM - Slots by boat:', Object.keys(byBoat).map(boatId => {
          const boat = allBoats.find((b:any) => b.id === Number(boatId));
          return `${boatId}:${boat?.name || 'unknown'} -> ${JSON.stringify(byBoat[Number(boatId)])}`;
        }));
        console.log('[search] AM/PM - Boats with slots:', Object.keys(byBoat).length, Object.keys(byBoat));
        console.log('[search] AM/PM - partSel:', partSel, 'searching for:', partSel==='AM' ? 'AM or FULL' : 'PM or FULL');
        // Inclure TOUS les bateaux qui ont au moins un slot disponible (normal ou événement) pour cette date
        boats = allBoats.map((b:any)=>{
          const parts = byBoat[b.id];
          const expParts = expByBoat[b.id];
          
          // Si pas de slots normaux ni d'événements, exclure
          if(!parts && !expParts) {
            return null;
          }
          
          // Ajouter la propriété availableParts au bateau
          const availableParts: { FULL?: boolean; AM?: boolean; PM?: boolean; SUNSET?: boolean } = {};
          if(parts) {
            if(parts.FULL) availableParts.FULL = true;
            if(parts.AM) availableParts.AM = true;
            if(parts.PM) availableParts.PM = true;
            if(parts.SUNSET) availableParts.SUNSET = true;
          }
          if(expParts) {
            if(expParts.FULL) availableParts.FULL = true;
            if(expParts.AM) availableParts.AM = true;
            if(expParts.PM) availableParts.PM = true;
            if(expParts.SUNSET) availableParts.SUNSET = true;
          }
          
          // Si le bateau n'a que des slots d'événements (pas de slots normaux)
          const hasOnlyExpSlots = !parts && !!expParts;
          
          return { ...b, availableParts, hasOnlyExpSlots };
        }).filter((b:any) => b !== null).sort((a:any,b:any)=> {
          // Trier d'abord par correspondance exacte au critère recherché, puis par prix
          const aMatches = partSel==='AM' ? !!(a.availableParts.FULL || a.availableParts.AM) : !!(a.availableParts.FULL || a.availableParts.PM);
          const bMatches = partSel==='AM' ? !!(b.availableParts.FULL || b.availableParts.AM) : !!(b.availableParts.FULL || b.availableParts.PM);
          if(aMatches && !bMatches) return -1;
          if(!aMatches && bMatches) return 1;
          return a.pricePerDay - b.pricePerDay;
        });
          console.log('[search] AM/PM - After slot filter:', boats.length, 'boats');
          if (pax) { 
            const paxNum = parseInt(pax,10);
            if(!isNaN(paxNum)) {
              const beforePax = boats.length;
              boats = boats.filter(b=> {
                const included = b.capacity>=paxNum;
                if (!included) {
                  console.log('[search] AM/PM - Boat', b.id, b.name, 'excluded: capacity', b.capacity, '<', paxNum);
                }
                return included;
              });
              console.log('[search] AM/PM - After pax filter:', boats.length, '(was', beforePax, ')');
            }
          }
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
            // Prix à partir de (demi-journée)
            const priceFrom = b.priceAm || b.pricePm || Math.round(b.pricePerDay / 2);
            
            const specs: string[] = [];
            if (b.capacity) specs.push(`${locale === 'fr' ? 'Places max' : 'Max places'}: ${b.capacity}`);
            if (b.enginePower) specs.push(`${locale === 'fr' ? 'Puissance' : 'Power'}: ${b.enginePower} cv`);
            if (b.lengthM) specs.push(`${locale === 'fr' ? 'Taille' : 'Length'}: ${b.lengthM} m`);
            
            // Déterminer le meilleur créneau disponible pour ce bateau
            // Priorité: FULL > AM > PM > SUNSET
            let bestPart = partSel; // Par défaut, utiliser le créneau recherché
            if (b.availableParts) {
              // Si le bateau a le créneau recherché, l'utiliser
              if (partSel === 'FULL' && b.availableParts.FULL) {
                bestPart = 'FULL';
              } else if (partSel === 'AM' && (b.availableParts.FULL || b.availableParts.AM)) {
                bestPart = b.availableParts.FULL ? 'FULL' : 'AM';
              } else if (partSel === 'PM' && (b.availableParts.FULL || b.availableParts.PM)) {
                bestPart = b.availableParts.FULL ? 'FULL' : 'PM';
              } else {
                // Sinon, utiliser le premier créneau disponible (priorité: FULL > AM > PM > SUNSET)
                if (b.availableParts.FULL) bestPart = 'FULL';
                else if (b.availableParts.AM) bestPart = 'AM';
                else if (b.availableParts.PM) bestPart = 'PM';
                // else if (b.availableParts.SUNSET) bestPart = 'SUNSET'; // SUNSET removed to satisfy type ("AM" | "PM" | "FULL")
              }
            }
            
            // Créer les paramètres de requête pour le lien
            const qs = new URLSearchParams();
            if (locale === 'en') qs.set('lang', 'en');
            qs.set('start', start || '');
            if (bestPart==='FULL' && (end || start)) qs.set('end', end || start || '');
            // transmettre le meilleur créneau disponible
            qs.set('part', bestPart);
            if (bestPart==='FULL') {
              qs.set('startTime','08:00');
              qs.set('endTime','18:00');
            } else if (bestPart==='AM') {
              qs.set('startTime','08:00');
              qs.set('endTime','12:00');
            } else if (bestPart==='PM') {
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
                  <span className="text-xs font-medium opacity-90">{locale === 'fr' ? 'À partir de' : 'From'}</span>
                  <span>{priceFrom.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="absolute left-3 bottom-3 text-white font-extrabold text-lg drop-shadow">
                  {b.name}
                </div>
              </div>
              <div className="p-5 text-sm flex flex-col gap-2">
                {specs.length>0 && (
                  <div className="text-black/70 leading-snug">
                    {specs.join(' • ')}
                  </div>
                )}
                {/* Afficher les créneaux disponibles */}
                {b.availableParts && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {b.availableParts.FULL && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        partSel === 'FULL' 
                          ? 'bg-emerald-500 text-white bg-emerald-600' 
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      }`}>
                        {locale === 'fr' ? 'Journée complète' : 'Full day'}
                      </span>
                    )}
                    {b.availableParts.AM && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        partSel === 'AM' 
                          ? 'bg-blue-500 text-white bg-blue-600' 
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>
                        {locale === 'fr' ? 'Matin' : 'Morning'}
                      </span>
                    )}
                    {b.availableParts.PM && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        partSel === 'PM' 
                          ? 'bg-orange-500 text-white bg-orange-600' 
                          : 'bg-orange-100 text-orange-700 border border-orange-300'
                      }`}>
                        {locale === 'fr' ? 'Après-midi' : 'Afternoon'}
                      </span>
                    )}
                    {b.availableParts.SUNSET && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                        {locale === 'fr' ? 'Coucher de soleil' : 'Sunset'}
                      </span>
                    )}
                  </div>
                )}
                {/* Message spécifique si le bateau n'est disponible que pour des événements */}
                {b.hasOnlyExpSlots && (
                  <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1 mt-1">
                    {locale === 'fr' 
                      ? '🎉 Disponible uniquement pour des événements (feux d\'artifice, etc.)' 
                      : '🎉 Available only for events (fireworks, etc.)'}
                  </div>
                )}
                {/* Indication si le bateau ne correspond pas exactement au critère recherché */}
                {!b.hasOnlyExpSlots && b.availableParts && partSel === 'FULL' && !b.availableParts.FULL && !(b.availableParts.AM && b.availableParts.PM) && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    {locale === 'fr' 
                      ? '⚠️ Disponible en demi-journée uniquement pour cette date' 
                      : '⚠️ Available in half-day only for this date'}
                  </div>
                )}
                {!b.hasOnlyExpSlots && b.availableParts && partSel === 'AM' && !b.availableParts.FULL && !b.availableParts.AM && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    {locale === 'fr' 
                      ? '⚠️ Disponible en après-midi uniquement pour cette date' 
                      : '⚠️ Available in afternoon only for this date'}
                  </div>
                )}
                {!b.hasOnlyExpSlots && b.availableParts && partSel === 'PM' && !b.availableParts.FULL && !b.availableParts.PM && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    {locale === 'fr' 
                      ? '⚠️ Disponible en matin uniquement pour cette date' 
                      : '⚠️ Available in morning only for this date'}
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
