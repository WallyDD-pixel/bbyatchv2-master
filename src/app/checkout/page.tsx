import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import PayButtonWithTerms from './pay/PayButtonWithTerms';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';

interface BoatOption {
  id: number;
  label: string;
  price: number | null;
}

export default async function CheckoutPage({ searchParams }: { searchParams?: { lang?: string; boat?: string; start?: string; end?: string; part?: string; pax?: string; opts?: string; } } ) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  const { boat: boatSlug, start, end, part, pax, opts } = sp || {};
  const slot = (part==='AM'||part==='PM'||part==='FULL')? part : 'FULL';
  let boat: any = null;
  if (boatSlug) {
    boat = await prisma.boat.findUnique({ where: { slug: boatSlug }, select: { id:true, name:true, slug:true, imageUrl:true, pricePerDay:true, priceAm:true, pricePm:true, capacity:true, options: { select:{ id:true, label:true, price:true } } } });
  }
  // Calcule total
  let nbJours = 1;
  if (slot==='FULL' && start) {
    const s = new Date(start+'T00:00:00');
    const e = new Date(((end)||start)+'T00:00:00');
    const diff = Math.round((e.getTime()-s.getTime())/86400000)+1;
    if (diff>0 && diff<1000) nbJours = diff; else nbJours=1;
  }
  let total: number | null = null;
  if (boat) {
    if (slot==='FULL') total = boat.pricePerDay * nbJours;
    else if (slot==='AM') total = boat.priceAm ?? null;
    else if (slot==='PM') total = boat.pricePm ?? null;
  }
  // Options sélectionnées
  let selectedOptionIds: number[] = [];
  if (opts) {
    selectedOptionIds = opts.split(',').map(x=> Number(x.trim())).filter(x=> !isNaN(x));
  }
  const selectedOptions = (boat?.options||[]).filter((o:any)=> selectedOptionIds.includes(o.id));
  const optionsTotal = selectedOptions.reduce((sum:number,o:any)=> sum + (o.price || 0), 0);
  const grandTotal = total!=null ? total + optionsTotal : null;
  const deposit = grandTotal!=null ? Math.round(grandTotal * 0.2) : null;
  const remaining = grandTotal!=null && deposit!=null ? grandTotal - deposit : null;
  const partLabel = slot==='FULL'? (locale==='fr'? t.search_part_full : t.search_part_full) : slot==='AM'? (locale==='fr'? t.search_part_am : t.search_part_am) : (locale==='fr'? t.search_part_pm : t.search_part_pm);
  async function createDeposit(formData: FormData){
    'use server';
    // future: déporter côté client pour Stripe Checkout (car redirection)
  }
  const session = await getServerSession(auth as any) as any;
  const userRole = (session?.user as any)?.role || 'user';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-10'>
        <h1 className='text-2xl sm:text-3xl font-bold mb-8'>{t.checkout_title}</h1>
        {!boat && (
          <div className='p-6 border rounded-xl bg-white text-sm text-black/60'>Aucun bateau sélectionné.</div>
        )}
        {boat && (
          <div className='grid md:grid-cols-3 gap-8'>
            <div className='md:col-span-2 space-y-8'>
              <section className='rounded-xl border border-black/10 bg-white p-6 shadow-sm'>
                <h2 className='text-lg font-semibold mb-4'>{t.checkout_section_summary}</h2>
                <div className='space-y-3 text-sm'>
                  <div className='flex justify-between'><span>{t.checkout_section_boat}</span><span className='font-medium'>{boat.name}</span></div>
                  <div className='flex justify-between'><span>{t.checkout_dates}</span><span className='font-medium'>{start || '—'}{slot==='FULL' && end && end!==start? ' → '+end: ''}</span></div>
                  <div className='flex justify-between'><span>{t.checkout_part}</span><span className='font-medium'>{partLabel}</span></div>
                  {pax && <div className='flex justify-between'><span>{t.checkout_passengers}</span><span className='font-medium'>{pax}</span></div>}
                  {selectedOptions.length>0 && (
                    <div className='pt-2 border-t border-black/10 space-y-1 text-xs'>
                      <>
                        {selectedOptions.map((o: BoatOption) => (
                          <div key={o.id} className='flex justify-between'>
                            <span>{o.label}</span>
                            <span className='font-medium'>
                              {o.price != null ? o.price.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €' : '—'}
                            </span>
                          </div>
                        ))}
                        <div className='flex justify-between font-semibold text-[11px]'><span>{t.checkout_options_total || 'Total options'}</span><span>{optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                      </>
                    </div>
                  )}
                </div>
              </section>
              <section className='rounded-xl border border-black/10 bg-white p-6 shadow-sm'>
                <h2 className='text-lg font-semibold mb-4'>{userRole==='agency'? t.checkout_agency_info_title : t.checkout_section_terms}</h2>
                {userRole==='agency' ? (
                  <p className='text-sm text-black/70 whitespace-pre-line'>{t.checkout_agency_info_text}</p>
                ) : (
                  <>
                    <p className='text-xs text-black/50 whitespace-pre-line'>{t.checkout_terms_placeholder}</p>
                    <div className='mt-5 border-t pt-4 space-y-2 text-[11px] text-black/60'>
                      <p>{t.checkout_deposit_info}</p>
                      {deposit!=null && remaining!=null && (
                        <p>
                          <strong>{t.checkout_deposit_now}:</strong> {deposit.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € — <strong>{t.checkout_deposit_remaining}:</strong> {remaining.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €
                        </p>
                      )}
                    </div>
                  </>
                )}
                <label className='mt-4 flex items-center gap-2 text-sm'>
                  <input id='acceptTerms' type='checkbox' className='h-4 w-4' />
                  <span>{t.checkout_accept_label}</span>
                </label>
              </section>
            </div>
            <aside className='space-y-6'>
              <section className='rounded-xl border border-black/10 bg-white p-6 shadow-sm'>
                <h2 className='text-lg font-semibold mb-4'>{userRole==='agency'? t.checkout_agency_info_title : t.checkout_section_pricing}</h2>
                {userRole!=='agency' && (
                  <div className='space-y-2 text-sm'>
                    {total!=null ? (
                      <>
                        <div className='flex justify-between'><span>{t.checkout_total}</span><span className='font-bold text-[var(--primary)]'>{grandTotal!=null? grandTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US'): '—'} €</span></div>
                        {optionsTotal>0 && (
                          <div className='flex justify-between text-[11px] text-black/50'><span>{t.checkout_base_total || 'Base'}</span><span>{total.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € + {optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                        )}
                        {deposit!=null && (
                          <div className='flex justify-between text-xs'><span>{t.checkout_deposit_now}</span><span className='font-medium'>{deposit.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                        )}
                        {remaining!=null && (
                          <div className='flex justify-between text-xs'><span>{t.checkout_deposit_remaining}</span><span className='font-medium'>{remaining.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                        )}
                      </>
                    ) : (
                      <div className='text-red-600 text-xs'>{t.checkout_missing_price}</div>
                    )}
                    {slot==='FULL' && nbJours>1 && <div className='text-[11px] text-black/50'>{boat.pricePerDay.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € / j</div>}
                  </div>
                )}
                {grandTotal!=null && start && boatSlug && (
                  <PayButtonWithTerms
                    locale={locale}
                    label={userRole==='agency' ? (t.checkout_request_agency || t.checkout_pay_deposit || t.checkout_proceed) : (t.checkout_pay_deposit || t.checkout_proceed)}
                    boatSlug={boatSlug}
                    start={start}
                    end={slot==='FULL'? end: undefined}
                    part={slot}
                    pax={pax}
                    opts={selectedOptionIds.length? selectedOptionIds.join(','): undefined}
                  />
                )}
                {userRole==='agency' && (!total || !start || !boatSlug) && (
                  <div className='text-xs text-black/50'>{t.checkout_agency_info_text}</div>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
