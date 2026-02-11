import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import PayButtonWithTerms from './pay/PayButtonWithTerms';
import { getServerSession } from '@/lib/auth';

interface BoatOption {
  id: number;
  label: string;
  price: number | null;
}

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<{ lang?: string; boat?: string; start?: string; end?: string; part?: string; pax?: string; opts?: string; waterToys?: string; children?: string; specialNeeds?: string; excursion?: string; departurePort?: string; }> } ) {
  const sp = (await searchParams) || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  const { boat: boatSlug, start, end, part, pax, opts, waterToys, children, specialNeeds, excursion, departurePort } = sp;
  const slot = (part==='AM'||part==='PM'||part==='FULL'||part==='SUNSET') ? part : 'FULL';
  let boat: any = null;
  if (boatSlug) {
    boat = await (prisma as any).boat.findUnique({ 
      where: { slug: boatSlug }, 
      select: { 
        id:true, name:true, slug:true, imageUrl:true, 
        pricePerDay:true, priceAm:true, pricePm:true, priceSunset:true,
        priceAgencyPerDay:true, priceAgencyAm:true, priceAgencyPm:true, priceAgencySunset:true,
        capacity:true, skipperRequired:true, skipperPrice:true, 
        options: { select:{ id:true, label:true, price:true } } 
      } 
    });
  }
  // Calcule total selon rôle (agence ou normal)
  let nbJours = 1;
  if ((slot==='FULL' || slot==='SUNSET') && start) {
    const s = new Date(start+'T00:00:00');
    const e = new Date(((end)||start)+'T00:00:00');
    const diff = Math.round((e.getTime()-s.getTime())/86400000)+1;
    if (diff>0 && diff<1000) nbJours = diff; else nbJours=1;
  }
  // Calcul du skipper (minimum 1 jour)
  const session = await getServerSession() as any;
  const userRole = (session?.user as any)?.role || 'user';
  const isAgency = userRole === 'agency';
  const skipperDays = (slot==='FULL' || slot==='SUNSET') ? Math.max(nbJours, 1) : 1;
  
  // Récupérer le prix par défaut du skipper depuis Settings
  const settings = await prisma.settings.findFirst() as any;
  const defaultSkipperPrice = settings?.defaultSkipperPrice || 350;
  
  // Utiliser le prix du bateau s'il existe, sinon le prix par défaut
  const effectiveSkipperPrice = boat?.skipperPrice ?? defaultSkipperPrice;
  // Calculer le skipper si requis (même si le prix du bateau n'est pas défini, on utilise le prix par défaut)
  const skipperTotal = boat?.skipperRequired ? (effectiveSkipperPrice * skipperDays) : 0;
  
  // Calcul du prix agence : prix public - 20% sur la coque nue (hors taxe)
  const calculateAgencyPrice = (publicPrice: number): number => {
    return Math.round(publicPrice * 0.8); // -20% sur la coque nue
  };
  
  let total: number | null = null;
  if (boat) {
    if (isAgency) {
      // Prix agence : utiliser prix agence défini ou calculer automatiquement (-20%)
      if (slot==='FULL') {
        total = boat.priceAgencyPerDay ? boat.priceAgencyPerDay * nbJours : calculateAgencyPrice(boat.pricePerDay) * nbJours;
      } else if (slot==='AM') {
        total = boat.priceAgencyAm ?? (boat.priceAm ? calculateAgencyPrice(boat.priceAm) : calculateAgencyPrice(Math.round(boat.pricePerDay / 2)));
      } else if (slot==='PM') {
        total = boat.priceAgencyPm ?? (boat.pricePm ? calculateAgencyPrice(boat.pricePm) : calculateAgencyPrice(Math.round(boat.pricePerDay / 2)));
      } else if (slot==='SUNSET') {
        total = boat.priceAgencySunset ?? (boat.priceSunset ? calculateAgencyPrice(boat.priceSunset) : null);
      }
    } else {
      // Prix normal
      if (slot==='FULL') total = boat.pricePerDay * nbJours;
      else if (slot==='AM') total = boat.priceAm ?? null;
      else if (slot==='PM') total = boat.pricePm ?? null;
      else if (slot==='SUNSET') total = boat.priceSunset ?? null;
    }
  }
  // Options sélectionnées
  let selectedOptionIds: number[] = [];
  if (opts) {
    selectedOptionIds = opts.split(',').map(x=> Number(x.trim())).filter(x=> !isNaN(x));
  }
  const selectedOptions = (boat?.options||[]).filter((o:any)=> selectedOptionIds.includes(o.id));
  const optionsTotal = selectedOptions.reduce((sum:number,o:any)=> sum + (o.price || 0), 0);
  // Grand total = base + options + skipper
  const grandTotal = total!=null ? total + optionsTotal + skipperTotal : null;
  const deposit = grandTotal!=null ? Math.round(grandTotal * 0.2) : null;
  const remaining = grandTotal!=null && deposit!=null ? grandTotal - deposit : null;
  const partLabel = slot==='FULL'? (locale==='fr'? t.search_part_full : t.search_part_full) 
    : slot==='AM'? (locale==='fr'? t.search_part_am : t.search_part_am) 
    : slot==='PM'? (locale==='fr'? t.search_part_pm : t.search_part_pm)
    : (locale==='fr'? t.search_part_sunset : t.search_part_sunset);
  async function createDeposit(formData: FormData){
    'use server';
    // future: déporter côté client pour Stripe Checkout (car redirection)
  }

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
                <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Récapitulatif de réservation' : 'Booking Summary'}</h2>
                <div className='space-y-3 text-sm'>
                  {/* Informations de base */}
                  <div className='space-y-2 pb-3 border-b border-black/10'>
                    <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide'>{locale === 'fr' ? 'Informations de base' : 'Basic Information'}</h3>
                    <div className='flex justify-between'><span>{t.checkout_section_boat}</span><span className='font-medium'>{boat.name}</span></div>
                    <div className='flex justify-between'><span>{t.checkout_dates}</span><span className='font-medium'>{start || '—'}{(slot==='FULL' || slot==='SUNSET') && end && end!==start? ' → '+end: ''}</span></div>
                    <div className='flex justify-between'><span>{t.checkout_part}</span><span className='font-medium'>{partLabel}</span></div>
                    {pax && <div className='flex justify-between'><span>{t.checkout_passengers}</span><span className='font-medium'>{pax}</span></div>}
                    {children && <div className='flex justify-between'><span>{locale === 'fr' ? 'Nombre d\'enfants' : 'Number of children'}</span><span className='font-medium'>{children}</span></div>}
                  </div>

                  {/* Options sélectionnées */}
                  {selectedOptions.length>0 && (
                    <div className='pt-3 border-t border-black/10 space-y-1'>
                      <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide mb-2'>{locale === 'fr' ? 'Options sélectionnées' : 'Selected Options'}</h3>
                      {selectedOptions.map((o: BoatOption) => (
                        <div key={o.id} className='flex justify-between text-xs'>
                          <span>{o.label}</span>
                          <span className='font-medium'>
                            {o.price != null ? o.price.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €' : (locale === 'fr' ? 'Inclus' : 'Included')}
                          </span>
                        </div>
                      ))}
                      <div className='flex justify-between font-semibold text-xs pt-1 border-t border-black/5'><span>{t.checkout_options_total || 'Total options'}</span><span>{optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                    </div>
                  )}

                  {/* Excursions */}
                  {excursion === '1' && (
                    <div className='pt-3 border-t border-black/10'>
                      <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide mb-2'>{locale === 'fr' ? 'Excursions' : 'Excursions'}</h3>
                      <div className='flex justify-between'><span>{locale === 'fr' ? 'Excursion souhaitée' : 'Excursion requested'}</span><span className='font-medium text-[var(--primary)]'>{locale === 'fr' ? 'Oui' : 'Yes'}</span></div>
                    </div>
                  )}

                  {/* Water Toys */}
                  {waterToys === '1' && (
                    <div className='pt-3 border-t border-black/10'>
                      <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide mb-2'>{locale === 'fr' ? 'Jeux d\'eau' : 'Water Toys'}</h3>
                      <div className='flex justify-between'><span>{locale === 'fr' ? 'Réservation de jeux d\'eau' : 'Water toys reservation'}</span><span className='font-medium text-[var(--primary)]'>{locale === 'fr' ? 'Oui (prix non inclus)' : 'Yes (price not included)'}</span></div>
                    </div>
                  )}

                  {/* Besoin supplémentaire */}
                  {specialNeeds && (
                    <div className='pt-3 border-t border-black/10'>
                      <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide mb-2'>{locale === 'fr' ? 'Demande spéciale' : 'Special Request'}</h3>
                      <p className='text-xs text-black/70 whitespace-pre-line leading-relaxed'>{decodeURIComponent(specialNeeds)}</p>
                    </div>
                  )}

                  {/* Détail du tarif */}
                  <div className='pt-3 border-t-2 border-[var(--primary)]/20 space-y-2'>
                    <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide mb-2'>{locale === 'fr' ? 'Détail du tarif' : 'Price Details'}</h3>
                    {total != null && (
                      <>
                        <div className='flex justify-between text-xs'>
                          <span>{isAgency ? (locale === 'fr' ? 'Location bateau (Prix agence)' : 'Boat rental (Agency price)') : (locale === 'fr' ? 'Location bateau' : 'Boat rental')}</span>
                          <span className='font-medium'>{total.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                        </div>
                        {optionsTotal > 0 && (
                          <div className='flex justify-between text-xs'>
                            <span>{locale === 'fr' ? 'Options' : 'Options'}</span>
                            <span className='font-medium'>+{optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                          </div>
                        )}
                        {skipperTotal > 0 && (
                          <div className='flex justify-between text-xs'>
                            <span>{locale === 'fr' ? 'Skipper obligatoire' : 'Required skipper'}</span>
                            <span className='font-medium'>
                              +{skipperTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € {isAgency ? '(HT)' : ''}
                              {slot==='FULL' && nbJours>1 && ` (${effectiveSkipperPrice}€ × ${skipperDays}j)`}
                            </span>
                          </div>
                        )}
                        <div className='flex justify-between text-xs pt-2 border-t border-black/10 font-semibold'>
                          <span>{locale === 'fr' ? 'Total hors carburant' : 'Total excluding fuel'}</span>
                          <span className='text-[var(--primary)]'>{grandTotal?.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                        </div>
                        <p className='text-[10px] text-black/50 italic'>{locale === 'fr' ? 'Carburant non inclus dans le tarif, à régler en fonction de la consommation à la fin de la location.' : 'Fuel not included in the rate, to be paid according to consumption at the end of the rental.'}</p>
                      </>
                    )}
                  </div>
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
                <div className='space-y-2 text-sm'>
                  {grandTotal!=null ? (
                    <>
                      {total != null && (
                        <div className='flex justify-between text-xs text-black/70'>
                          <span>{isAgency ? (locale === 'fr' ? 'Location bateau (Prix agence)' : 'Boat rental (Agency price)') : (locale === 'fr' ? 'Location bateau' : 'Boat rental')}</span>
                          <span>{total.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                        </div>
                      )}
                      {optionsTotal > 0 && (
                        <div className='flex justify-between text-xs text-black/70'>
                          <span>{locale === 'fr' ? 'Options' : 'Options'}</span>
                          <span>+{optionsTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                        </div>
                      )}
                      {skipperTotal > 0 && (
                        <div className='flex justify-between text-xs text-black/70'>
                          <span>{locale === 'fr' ? 'Skipper obligatoire' : 'Required skipper'}</span>
                          <span>
                            +{skipperTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} € {isAgency ? '(HT)' : ''}
                            {slot==='FULL' && nbJours>1 && ` (${effectiveSkipperPrice}€ × ${skipperDays}j)`}
                          </span>
                        </div>
                      )}
                      <div className='pt-2 border-t border-black/10 mt-2'>
                        <div className='flex justify-between items-center'>
                          <span className='font-semibold'>{locale === 'fr' ? 'Total hors carburant' : 'Total excluding fuel'}</span>
                          <span className='font-bold text-xl text-[var(--primary)]'>{grandTotal.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span>
                        </div>
                        {isAgency && skipperTotal > 0 && (
                          <p className='text-[10px] text-black/50 mt-1'>{locale === 'fr' ? 'Prix skipper HT (sans TVA)' : 'Skipper price HT (no VAT)'}</p>
                        )}
                      </div>
                      {!isAgency && deposit!=null && (
                        <>
                          <div className='pt-2 border-t border-black/10 space-y-1'>
                            <div className='flex justify-between text-xs'><span>{t.checkout_deposit_now}</span><span className='font-medium'>{deposit.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                            {remaining!=null && (
                              <div className='flex justify-between text-xs'><span>{t.checkout_deposit_remaining}</span><span className='font-medium'>{remaining.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className='text-red-600 text-xs'>{t.checkout_missing_price}</div>
                  )}
                </div>
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
                    waterToys={waterToys}
                    children={children}
                    specialNeeds={specialNeeds}
                    excursion={excursion}
                    departurePort={departurePort}
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
