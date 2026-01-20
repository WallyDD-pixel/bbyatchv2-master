import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { prisma } from '@/lib/prisma';
import { messages, type Locale } from '@/i18n/messages';
import { notFound } from 'next/navigation';
import Stripe from 'stripe';

interface Props { searchParams?: { lang?: string; res?: string } }

export const dynamic = 'force-dynamic';

export default async function ExperienceSuccessPage({ searchParams }: Props){
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  const resId = sp?.res;
  if(!resId) notFound();
  let reservation = await prisma.reservation.findUnique({ where:{ id: resId }, include:{ boat:true, user:true } });
  if(!reservation) notFound();

  // Vérifier Stripe si pas déjà marqué payé
  if(!reservation.depositPaidAt && reservation.stripeSessionId){
    const settings = await prisma.settings.findFirst({ where:{ id:1 }, select:{ stripeMode:true, stripeTestSk:true, stripeLiveSk:true } });
    const mode = settings?.stripeMode === 'live' ? 'live' : 'test';
    const secretKey = mode==='live' ? settings?.stripeLiveSk : settings?.stripeTestSk;
    if(secretKey){
      try {
        const stripe = new Stripe(secretKey, { apiVersion: '2025-07-30.basil' });
        const session = await stripe.checkout.sessions.retrieve(reservation.stripeSessionId);
        if(session.payment_status === 'paid'){
          reservation = await prisma.reservation.update({
            where:{ id: reservation.id },
            data:{
              depositPaidAt: new Date(),
              status: 'deposit_paid',
              stripePaymentIntentId: typeof session.payment_intent === 'string'? session.payment_intent : (session.payment_intent as any)?.id,
              stripeCustomerId: typeof session.customer === 'string'? session.customer : (session.customer as any)?.id,
            },
            include:{ boat:true, user:true }
          });
        }
      } catch(e){ /* silent */ }
    }
  }

  const paid = !!reservation.depositPaidAt;
  let meta: any = null;
  try { meta = reservation.metadata? JSON.parse(reservation.metadata) : null; } catch {}
  const experienceTitle = locale==='fr'? (meta?.experienceTitleFr || 'Expérience') : (meta?.experienceTitleEn || meta?.experienceTitleFr || 'Experience');

  const start = reservation.startDate.toISOString().slice(0,10);
  const end = reservation.endDate.toISOString().slice(0,10);
  const isMulti = end!==start;
  const part = reservation.part || 'FULL';
  const partLabel = part==='FULL'? (locale==='fr'? 'Journée entière':'Full day') : part==='AM'? (locale==='fr'? 'Matin':'Morning') : (locale==='fr'? 'Après-midi':'Afternoon');
  const deposit = reservation.depositAmount ?? 0;
  const remaining = reservation.remainingAmount ?? 0;

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12'>
        <div className='text-center mb-10'>
          <div className={`mx-auto mb-6 h-20 w-20 rounded-full flex items-center justify-center shadow-md border ${paid? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200':'bg-amber-50 border-amber-200'}`}>
            {paid ? (
              <svg className='h-10 w-10 text-emerald-600' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>
            ) : (
              <svg className='h-10 w-10 text-amber-600 animate-pulse' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
            )}
          </div>
          <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
            {paid? (locale==='fr'? 'Félicitations !':'Congratulations!') : (locale==='fr'? 'Paiement en cours de validation':'Payment processing')}
          </h1>
          <p className='mt-3 text-black/60 text-sm max-w-xl mx-auto'>
            {paid? (locale==='fr'? `Votre acompte pour l'expérience « ${experienceTitle} » est confirmé. Nous vous contacterons pour finaliser les derniers détails.` : `Your deposit for the "${experienceTitle}" experience is confirmed. We will contact you to finalize the remaining details.`)
            : (locale==='fr'? 'Nous vérifions le statut de votre paiement. Cette page se mettra à jour automatiquement une fois confirmé.' : 'We are verifying your payment status. This page will refresh once confirmed.')}
          </p>
        </div>
        <div className='space-y-8'>
          <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold mb-4'>{locale==='fr'? 'Résumé de votre réservation':'Your booking summary'}</h2>
            <div className='grid gap-3 text-sm'>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{locale==='fr'? 'Expérience':'Experience'}</span><span className='font-medium'>{experienceTitle}</span></div>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{locale==='fr'? 'Bateau':'Boat'}</span><span className='font-medium'>{reservation.boat?.name || '—'}</span></div>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{locale==='fr'? 'Dates':'Dates'}</span><span className='font-medium'>{start}{isMulti? ' → '+end:''}</span></div>
              <div className='flex items-center justify-between bg-black/5 rounded-lg px-3 py-2'><span className='text-black/50'>{locale==='fr'? 'Créneau':'Slot'}</span><span className='font-medium'>{partLabel}</span></div>
              <div className='flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2'><span className='text-emerald-700 text-xs'>{locale==='fr'? 'Acompte payé':'Deposit paid'}</span><span className='font-bold text-emerald-700'>{deposit.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
              <div className='flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2'><span className='text-blue-700 text-xs'>{locale==='fr'? 'Reste à régler':'Remaining'}</span><span className='font-semibold text-blue-700'>{remaining.toLocaleString(locale==='fr'? 'fr-FR':'en-US')} €</span></div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${paid? 'bg-emerald-600 text-white':'bg-amber-500 text-white'}`}>
                <span>{paid? (locale==='fr'? 'Acompte confirmé':'Deposit confirmed') : (locale==='fr'? 'En attente de confirmation':'Awaiting confirmation')}</span>
                {!paid && <span className='animate-pulse'>●</span>}
              </div>
            </div>
          </section>
          <section className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
            <h3 className='text-md font-semibold mb-3'>{locale==='fr'? 'Prochaines étapes':'Next steps'}</h3>
            <p className='text-xs text-black/60 leading-relaxed'>
              {paid? (locale==='fr'? 'Notre équipe va maintenant préparer les détails de votre expérience. Vous recevrez un email récapitulatif et nous vous recontacterons si des informations complémentaires sont nécessaires.' : 'Our team will now prepare the details of your experience. You will receive a confirmation email and we will reach out if further information is required.')
              : (locale==='fr'? 'Si la page ne se rafraîchit pas automatiquement dans quelques secondes, vous pouvez la recharger manuellement.' : 'If the page does not update automatically within a few seconds, you can refresh it manually.')}
            </p>
          </section>
          <div className='flex flex-wrap gap-3'>
            <a href={locale==='fr'? '/?lang=fr#experiences' : '/?lang=en#experiences'} className='inline-flex items-center h-11 px-6 rounded-full border border-black/15 bg-white text-sm font-medium hover:bg-black/5'>{locale==='fr'? 'Retour aux expériences':'Back to experiences'}</a>
            <a href='/dashboard' className='inline-flex items-center h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors'>{locale==='fr'? 'Mon tableau de bord':'My dashboard'}</a>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
