import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import { notFound } from 'next/navigation';
import Stripe from 'stripe';

interface Props { searchParams?: { lang?: string; res?: string; session_id?: string } }

export default async function CheckoutSuccessPage({ searchParams }: Props){
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  
  let reservation = null;
  
  // Nouveau système : récupérer via session_id
  if (sp?.session_id) {
    const sessionId = sp.session_id;
    // Trouver la réservation créée par le webhook avec ce session_id
    reservation = await prisma.reservation.findFirst({ 
      where: { stripeSessionId: sessionId }, 
      include: { boat: true, user: true } 
    });
    
    // Si pas encore créée par le webhook, vérifier Stripe et créer si nécessaire
    if (!reservation) {
      const settings = await prisma.settings.findFirst({ where: { id: 1 }, select: { stripeMode: true, stripeTestSk: true, stripeLiveSk: true } });
      const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
      const secretKey = mode === 'live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
      if (secretKey) {
        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          
          if (session.payment_status === 'paid' && session.metadata) {
            const metadata = session.metadata;
            const userId = metadata.userId;
            const boatId = metadata.boatId ? parseInt(metadata.boatId, 10) : null;
            const reference = metadata.reference;
            
            if (userId && boatId && reference) {
              // Vérifier qu'elle n'existe pas déjà
              const existing = await prisma.reservation.findFirst({
                where: { reference },
                select: { id: true }
              });
              
              if (!existing) {
                // Créer la réservation (fallback si webhook n'a pas encore fonctionné)
                const startDate = new Date(metadata.startDate);
                const endDate = new Date(metadata.endDate);
                const totalPrice = parseFloat(metadata.totalPrice || '0');
                const depositAmount = parseFloat(metadata.depositAmount || '0');
                const remainingAmount = parseFloat(metadata.remainingAmount || '0');
                const depositPercent = parseInt(metadata.depositPercent || '20', 10);
                const passengers = metadata.passengers ? parseInt(metadata.passengers, 10) : undefined;
                
                const reservationMetadata = {
                  waterToys: metadata.waterToys === 'true',
                  childrenCount: metadata.childrenCount || undefined,
                  specialNeeds: metadata.specialNeeds || undefined,
                  wantsExcursion: metadata.wantsExcursion === 'true',
                  optionIds: metadata.optionIds ? metadata.optionIds.split(',').map((id: string) => parseInt(id, 10)).filter((id: number) => !isNaN(id)) : [],
                  boatCapacity: parseInt(metadata.boatCapacity || '0', 10),
                  boatLength: metadata.boatLength ? parseFloat(metadata.boatLength) : null,
                  boatSpeed: parseFloat(metadata.boatSpeed || '0'),
                  departurePort: metadata.departurePort || 'Port à définir',
                  bookingDate: metadata.bookingDate || new Date().toISOString(),
                  userRole: metadata.userRole || null,
                  skipperRequired: metadata.skipperRequired === 'true',
                  effectiveSkipperPrice: metadata.effectiveSkipperPrice ? parseFloat(metadata.effectiveSkipperPrice) : null,
                };
                
                reservation = await prisma.reservation.create({
                  data: {
                    userId,
                    boatId,
                    reference,
                    startDate,
                    endDate,
                    part: metadata.part as 'FULL' | 'AM' | 'PM' | 'SUNSET' | null,
                    passengers,
                    totalPrice,
                    depositAmount,
                    remainingAmount,
                    depositPercent,
                    status: 'deposit_paid',
                    depositPaidAt: new Date(),
                    locale: metadata.locale || 'fr',
                    currency: metadata.currency || 'eur',
                    stripeSessionId: sessionId,
                    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
                    stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
                    metadata: JSON.stringify(reservationMetadata),
                  },
                  include: { boat: true, user: true }
                });
              }
            }
          }
        } catch (e) {
          console.error('Error retrieving Stripe session:', e);
        }
      }
    }
  } 
  // Ancien système : récupérer via res (pour compatibilité)
  else if (sp?.res) {
    const resId = sp.res;
    reservation = await prisma.reservation.findUnique({ where: { id: resId }, include: { boat: true, user: true } });
    
    // Vérification manuelle Stripe si pas encore marqué payé
    if (reservation && !reservation.depositPaidAt && reservation.stripeSessionId) {
      const settings = await prisma.settings.findFirst({ where: { id: 1 }, select: { stripeMode: true, stripeTestSk: true, stripeLiveSk: true } });
      const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
      const secretKey = mode === 'live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
      if (secretKey) {
        try {
          const stripe = new Stripe(secretKey, { apiVersion: '2025-07-30.basil' });
          const session = await stripe.checkout.sessions.retrieve(reservation.stripeSessionId);
          if (session.payment_status === 'paid') {
            reservation = await prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                depositPaidAt: new Date(),
                status: 'deposit_paid',
                stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id,
                stripeCustomerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id,
              },
              include: { boat: true, user: true }
            });
          }
        } catch (e) { /* silencieux */ }
      }
    }
  }
  
  if (!reservation) notFound();

  const paid = !!reservation.depositPaidAt;
  const start = reservation.startDate.toISOString().slice(0,10);
  const end = reservation.endDate.toISOString().slice(0,10);
  const isMulti = end!==start;
  const part = reservation.part || 'FULL';
  const partLabel = part==='FULL'? (locale==='fr'? 'Journée entière':'Full day') : part==='AM'? (locale==='fr'? 'Matin':'Morning') : (locale==='fr'? 'Après-midi':'Afternoon');
  const ref = reservation.reference || reservation.id.slice(0,8).toUpperCase();
  const deposit = reservation.depositAmount ?? 0;
  const remaining = reservation.remainingAmount ?? 0;

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12'>
        <div className='text-center mb-10'>
          <div className={`mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center shadow-md border ${paid? 'bg-emerald-50 border-emerald-200':'bg-amber-50 border-amber-200'}`}>
            {paid ? (
              <svg className='h-8 w-8 text-emerald-600' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>
            ) : (
              <svg className='h-8 w-8 text-amber-600 animate-pulse' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
            )}
          </div>
          <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>{paid? t.checkout_success_title : t.checkout_success_pending_title}</h1>
          <p className='mt-2 text-black/60 text-sm'>{paid? t.checkout_success_subtitle : t.checkout_success_pending_desc}</p>
        </div>
        <div className='space-y-8'>
          <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold mb-4'>{t.checkout_success_reference} {ref}</h2>
            <div className='grid gap-3 text-sm'>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{t.checkout_success_boat}</span><span className='font-medium'>{reservation.boat?.name || '—'}</span></div>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{t.checkout_success_dates}</span><span className='font-medium'>{start}{isMulti? ' → '+end:''}</span></div>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{t.checkout_success_part}</span><span className='font-medium'>{partLabel}</span></div>
              <div className='flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2'><span className='text-emerald-700 text-xs'>{t.checkout_success_deposit_paid}</span><span className='font-bold text-emerald-700'>{deposit.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
              <div className='flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2'><span className='text-blue-700 text-xs'>{t.checkout_success_remaining}</span><span className='font-semibold text-blue-700'>{remaining.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${paid? 'bg-emerald-600 text-white':'bg-amber-500 text-white'}`}>
                <span>{paid? t.checkout_success_status_paid : t.checkout_success_status_pending}</span>
                {!paid && <span className='animate-pulse'>●</span>}
              </div>
            </div>
          </section>
          <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
            <h3 className='text-md font-semibold mb-3'>{t.checkout_success_next_steps}</h3>
            <p className='text-xs text-black/60 leading-relaxed'>{t.checkout_success_instructions}</p>
          </section>
          <div className='flex flex-wrap gap-3'>
            <a href='/search' className='inline-flex items-center h-11 px-6 rounded-full border border-black/15 bg-white text-sm font-medium hover:bg-black/5'>{t.checkout_success_back_fleet}</a>
            <a href='/dashboard' className='inline-flex items-center h-11 px-6 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110'>{t.checkout_success_go_dashboard}</a>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
