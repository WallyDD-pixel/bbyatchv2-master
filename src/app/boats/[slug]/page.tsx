import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Image from 'next/image';
import Link from 'next/link';
import BoatSlider from '@/components/BoatSlider';
import RequestBookingButton from '@/components/RequestBookingButton';
import BoatOptionsAndBooking from '@/components/BoatOptionsAndBooking';

interface Props { params: { slug: string }; searchParams?: { lang?: string; start?: string; end?: string; startTime?: string; endTime?: string; part?: string; } }

export default async function BoatDetailPage({ params, searchParams }: Props){
  const { slug } = params;
  const sp = searchParams || {};
  const { start, end, part: rawPart } = sp || {};
  const part = (rawPart==='AM' || rawPart==='PM' || rawPart==='FULL') ? rawPart : 'FULL';
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  type BoatType = {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
    photoUrls: string | null;
    pricePerDay: number;
    priceAm: number | null;
    pricePm: number | null;
    capacity: number;
    speedKn: number;
    enginePower: number | null;
    fuel: string | null;
    available: boolean;
    city?: string | null;
    options: { id: number; boatId: number; createdAt: Date; label: string; price: number | null; }[];
  };

  const boat = await prisma.boat.findUnique({
    where: { slug },
    include: { options: true }
  }) as BoatType | null;
  if(!boat){
    return <div className='min-h-screen flex flex-col'><HeaderBar initialLocale={locale} /><div className='flex-1 flex items-center justify-center p-10 text-sm text-black/50'>{t.boat_not_found}</div><Footer locale={locale} t={t} /></div>;
  }
  // Calcul nombre de jours (FULL) ou 1 créneau demi-journée
  let nbJours = 1;
  if (part==='FULL' && start){
    try {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(((end)|| start) + 'T00:00:00');
      const diff = Math.round((e.getTime() - s.getTime())/86400000) + 1;
      if(diff > 0 && diff < 1000) nbJours = diff; else nbJours = 1;
    } catch { /* ignore */ }
  }
  // Total selon part (sans fallback moitié)
  let total: number | null = null;
  if (part==='FULL') {
    total = boat.pricePerDay * nbJours;
  } else if (part==='AM') {
    total = boat.priceAm != null ? boat.priceAm : null;
  } else if (part==='PM') {
    total = boat.pricePm != null ? boat.pricePm : null;
  }
  // Validation cohérence (option 1)
  const mismatch = boat.priceAm!=null && boat.pricePm!=null && (boat.priceAm + boat.pricePm !== boat.pricePerDay);
  let photos: string[] = [];
  try { if(boat.photoUrls) photos = JSON.parse(boat.photoUrls); } catch {}
  const boatOptions = Array.isArray((boat as any).options) ? (boat as any).options as { id:number; label:string; price:number|null }[] : [];
  // URL retour avec conservation dates + part
  const backQuery = new URLSearchParams();
  backQuery.set('lang', locale);
  if(start) backQuery.set('start', start);
  if (part==='FULL' && end) backQuery.set('end', end || start!);
  if (part) backQuery.set('part', part);
  const backHref = `/search?${backQuery.toString()}`;
  // Libellé total
  const totalLabel = part==='FULL' ? (nbJours>1 ? `${nbJours} jours` : '1 jour') : (part==='AM' ? (locale==='fr'? 'Matin' : 'Morning') : (locale==='fr'? 'Après‑midi' : 'Afternoon'));
  const needDates = !start; // si aucune date passée

  // --- Validation anti-manipulation URL ---
  let invalidDates = false;
  let invalidSlot = false;
  if (start) {
    // Vérifier format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || (end && !dateRegex.test(end))) invalidDates = true;
    else {
      const sD = new Date(start + 'T00:00:00');
      const eD = new Date((end||start) + 'T00:00:00');
      if (isNaN(sD.getTime()) || isNaN(eD.getTime()) || eD < sD) invalidDates = true;
      // contrainte FULL: moins de 7 jours (diff <=6 inclusif selon règle actuelle)
      if (part==='FULL') {
        const diff = Math.round((eD.getTime()-sD.getTime())/86400000)+1;
        if (diff>6) invalidDates = true;
      } else if ((part === 'AM' || part === 'PM') && end && end !== start) {
        // demi-journée doit être sur un seul jour
        invalidDates = true;
      }
    }
    // Vérifier existence d'un slot correspondant pour le jour de départ
    if (!invalidDates) {
      const sD = new Date(start+'T00:00:00');
      const slots = await prisma.availabilitySlot.findMany({
        where: { date: { gte: sD, lte: sD }, boat: { slug }, status: 'available' },
        select: { part: true }
      });
      const parts = new Set(slots.map(s=>s.part));
      if (part==='FULL') {
        if (!parts.has('FULL')) invalidSlot = true; // règle: besoin d'un slot FULL
      } else if (part==='AM') {
        if (!(parts.has('AM') || parts.has('FULL'))) invalidSlot = true;
      } else if (part==='PM') {
        if (!(parts.has('PM') || parts.has('FULL'))) invalidSlot = true;
      }
    }
  }

  const disabledAction = invalidDates || invalidSlot;
  const disabledMessage = disabledAction ? (invalidDates ? t.boat_invalid_dates : t.boat_invalid_slot) : undefined;

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-8'>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <Link
            href={backHref}
            className="group inline-flex items-center gap-2 text-sm font-medium rounded-full border border-[var(--primary)]/30 bg-white/90 px-4 py-2 text-[var(--primary)] shadow-sm hover:bg-[var(--primary)] hover:text-white hover:shadow-md active:scale-[.97] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            aria-label={t.back_search || 'Retour résultats'}
          >
            <span className='transition-transform group-hover:-translate-x-0.5'>←</span>
            <span>{t.back_search || 'Retour résultats'}</span>
          </Link>
          <div className='hidden md:flex items-center text-[11px] text-black/50'>
            {totalLabel}
          </div>
        </div>
        <div className='mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
          <h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>{boat.name}</h1>
          <div className='flex gap-3 text-sm'>
            <div className='px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium'>{t.boat_field_capacity} {boat.capacity}</div>
            <div className='px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium'>{boat.speedKn} kn</div>
            {boat.city && <div className='px-3 py-1 rounded-full bg-black/5 text-black/70 font-medium'>{boat.city}</div>}
          </div>
        </div>

        {/* Slider principal */}
        <div className='mt-8'>
          <BoatSlider images={photos.length? photos : (boat.imageUrl? [boat.imageUrl] : [])} />
        </div>

        <div className='mt-10 grid gap-10 lg:grid-cols-3'>
          {(invalidDates || invalidSlot) && (
            <div className='lg:col-span-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3'>
              {invalidDates? t.boat_invalid_dates : t.boat_invalid_slot}
            </div>
          )}
          {/* Colonne gauche: infos */}
          <div className='lg:col-span-2 space-y-10'>
            {/* Détails techniques */}
            <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
              <h2 className='text-xl font-bold mb-4'>{t.boat_info_tech}</h2>
              <div className='grid sm:grid-cols-2 gap-4 text-sm'>
                {boat.city && <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_city}</span><span className='font-semibold'>{boat.city}</span></div>}
                <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_capacity}</span><span className='font-semibold'>{boat.capacity} pax</span></div>
                <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_speed}</span><span className='font-semibold'>{boat.speedKn} kn</span></div>
                {boat.enginePower!=null && <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_engine}</span><span className='font-semibold'>{boat.enginePower} cv</span></div>}
                {boat.fuel!=null && <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_fuel}</span><span className='font-semibold'>{boat.fuel}</span></div>}
                <div className='flex items-start justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/60'>{t.boat_field_day_price}</span><span className='font-semibold'>{boat.pricePerDay} €</span></div>
                {(boat.priceAm!=null || boat.pricePm!=null) && (
                  <div className='flex flex-col gap-2 sm:col-span-2'>
                    {boat.priceAm!=null && <div className='flex items-start justify-between bg-blue-50 rounded-lg px-3 py-2'><span className='text-blue-700 text-xs'>{t.boat_field_morning}</span><span className='font-semibold text-blue-700'>{boat.priceAm} €</span></div>}
                    {boat.pricePm!=null && <div className='flex items-start justify-between bg-purple-50 rounded-lg px-3 py-2'><span className='text-purple-700 text-xs'>{t.boat_field_afternoon}</span><span className='font-semibold text-purple-700'>{boat.pricePm} €</span></div>}
                  </div>
                )}
                {mismatch && <div className='sm:col-span-2 text-[11px] rounded-lg px-3 py-2 bg-amber-100 text-amber-900 font-medium'>{t.boat_price_mismatch}</div>}
                <div className='flex items-start justify-between bg-emerald-50 rounded-lg px-3 py-2 sm:col-span-2'><span className='text-emerald-700 text-xs'>{t.boat_total} {totalLabel}</span><span className='font-bold text-emerald-700'>{total!=null? total.toLocaleString('fr-FR')+' €' : '—'}</span></div>
              </div>
            </section>
          </div>

          {/* Colonne droite: options & action */}
          <BoatOptionsAndBooking
            t={t as any}
            locale={locale}
            baseTotal={total}
            baseTotalLabel={totalLabel}
            pricePerDay={boat.pricePerDay}
            part={part as any}
            nbJours={nbJours}
            options={boatOptions}
            disabled={disabledAction}
            disabledMessage={disabledMessage}
            slug={boat.slug}
            startDate={start}
            endDate={end}
          />
        </div>
      </main>
      {/* Modal supprimé: géré côté client dans RequestBookingButton */}
      <Footer locale={locale} t={t} />
    </div>
  );
}
