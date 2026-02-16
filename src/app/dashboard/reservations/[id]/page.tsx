import { getServerSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function UserReservationDetailPage(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const session = await getServerSession();
  if (!session?.user) redirect('/signin');
  
  const { id } = await params;
  const sp = await (searchParams || Promise.resolve({} as any));
  const langParam = Array.isArray((sp as any).lang) ? (sp as any).lang[0] : (sp as any).lang;
  const locale: Locale = langParam === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  // Récupérer l'utilisateur pour vérifier qu'il est propriétaire de la réservation
  const dbUser = await prisma.user.findUnique({ 
    where: { email: session.user.email! }, 
    select: { id: true } 
  });
  
  if (!dbUser) redirect('/signin');

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      boat: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          capacity: true,
          lengthM: true,
          speedKn: true,
          pricePerDay: true,
          priceAm: true,
          pricePm: true,
          skipperRequired: true,
          skipperPrice: true,
          options: {
            select: {
              id: true,
              label: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!reservation) notFound();
  
  // Vérifier que l'utilisateur est propriétaire de la réservation
  if (reservation.userId !== dbUser.id) {
    redirect('/dashboard');
  }

  const dateFmt = (d: Date) => d.toISOString().slice(0, 10);
  const start = dateFmt(reservation.startDate);
  const end = dateFmt(reservation.endDate);
  const dayCount = Math.round((reservation.endDate.getTime() - reservation.startDate.getTime()) / 86400000) + 1;

  const partLabel = (p: string | null | undefined) =>
    p === 'FULL'
      ? locale === 'fr' ? 'Journée entière' : 'Full day'
      : p === 'AM'
      ? locale === 'fr' ? 'Matin' : 'Morning'
      : p === 'PM'
      ? locale === 'fr' ? 'Après-midi' : 'Afternoon'
      : '—';

  const statusLabel = (s: string) => {
    switch(s){
      case 'pending_deposit': return locale==='fr'? 'Acompte en attente':'Deposit pending';
      case 'deposit_paid': return locale==='fr'? 'Acompte payé':'Deposit paid';
      case 'cancelled': return locale==='fr'? 'Annulée':'Cancelled';
      case 'completed': return locale==='fr'? 'Terminée':'Completed';
      default: return s;
    }
  };

  const statusClass = (s: string) => {
    switch(s){
      case 'deposit_paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending_deposit': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-black/10 text-black/60 border-black/20';
    }
  };

  const fmt = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €';

  // Parser les metadata
  let metadata: any = {};
  if (reservation.metadata) {
    try {
      metadata = JSON.parse(reservation.metadata);
    } catch {}
  }

  // Récupérer les options sélectionnées
  const selectedOptions = reservation.boat?.options.filter(opt => 
    metadata.optionIds && Array.isArray(metadata.optionIds) && metadata.optionIds.includes(opt.id)
  ) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <Link 
            href={`/dashboard${locale === 'en' ? '?lang=en' : ''}`}
            className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-black/80 mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {locale === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard'}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {locale === 'fr' ? 'Détails de la réservation' : 'Reservation details'}
              </h1>
              <p className="mt-1 text-black/60 text-sm">
                {locale === 'fr' ? 'Référence' : 'Reference'}: {reservation.reference || reservation.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${statusClass(reservation.status)}`}>
              {statusLabel(reservation.status)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Colonne principale */}
          <div className="md:col-span-2 space-y-6">
            {/* Informations du bateau */}
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{locale === 'fr' ? 'Bateau réservé' : 'Reserved boat'}</h2>
              <div className="flex gap-4">
                {reservation.boat?.imageUrl && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={reservation.boat.imageUrl}
                      alt={reservation.boat.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Link 
                    href={`/boats/${reservation.boat?.slug || ''}${locale === 'en' ? '?lang=en' : ''}`}
                    className="text-xl font-bold text-[color:var(--primary)] hover:underline"
                  >
                    {reservation.boat?.name || '—'}
                  </Link>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    {reservation.boat?.capacity && (
                      <div>
                        <span className="text-black/60">{locale === 'fr' ? 'Capacité' : 'Capacity'}: </span>
                        <span className="font-medium">{reservation.boat.capacity} {locale === 'fr' ? 'personnes' : 'people'}</span>
                      </div>
                    )}
                    {reservation.boat?.lengthM && (
                      <div>
                        <span className="text-black/60">{locale === 'fr' ? 'Longueur' : 'Length'}: </span>
                        <span className="font-medium">{reservation.boat.lengthM}m</span>
                      </div>
                    )}
                    {reservation.boat?.speedKn && (
                      <div>
                        <span className="text-black/60">{locale === 'fr' ? 'Vitesse' : 'Speed'}: </span>
                        <span className="font-medium">{reservation.boat.speedKn} {locale === 'fr' ? 'nœuds' : 'knots'}</span>
                      </div>
                    )}
                  </div>
                  <Link 
                    href={`/boats/${reservation.boat?.slug || ''}${locale === 'en' ? '?lang=en' : ''}`}
                    className="mt-3 inline-flex items-center text-sm text-[color:var(--primary)] hover:underline"
                  >
                    {locale === 'fr' ? 'Voir les détails du bateau' : 'View boat details'} →
                  </Link>
                </div>
              </div>
            </section>

            {/* Dates et période */}
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{locale === 'fr' ? 'Dates et période' : 'Dates and period'}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-black/5 rounded-lg p-4">
                  <div className="text-xs text-black/60 mb-1">{locale === 'fr' ? 'Date de début' : 'Start date'}</div>
                  <div className="text-lg font-semibold">{start}</div>
                </div>
                <div className="bg-black/5 rounded-lg p-4">
                  <div className="text-xs text-black/60 mb-1">{locale === 'fr' ? 'Date de fin' : 'End date'}</div>
                  <div className="text-lg font-semibold">{end}</div>
                </div>
                <div className="bg-black/5 rounded-lg p-4">
                  <div className="text-xs text-black/60 mb-1">{locale === 'fr' ? 'Nombre de jours' : 'Number of days'}</div>
                  <div className="text-lg font-semibold">{dayCount}</div>
                </div>
                <div className="bg-black/5 rounded-lg p-4">
                  <div className="text-xs text-black/60 mb-1">{locale === 'fr' ? 'Créneau' : 'Time slot'}</div>
                  <div className="text-lg font-semibold">{partLabel(reservation.part)}</div>
                </div>
              </div>
            </section>

            {/* Informations complémentaires */}
            {(metadata.childrenCount || metadata.waterToys !== undefined || metadata.wantsExcursion || metadata.specialNeeds || selectedOptions.length > 0 || metadata.needsSkipper) && (
              <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{locale === 'fr' ? 'Informations complémentaires' : 'Additional information'}</h2>
                <div className="space-y-3">
                  {reservation.passengers && (
                    <div className="flex justify-between py-2 border-b border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Nombre de passagers' : 'Number of passengers'}</span>
                      <span className="font-medium">{reservation.passengers}</span>
                    </div>
                  )}
                  {metadata.childrenCount && (
                    <div className="flex justify-between py-2 border-b border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Nombre d\'enfants' : 'Number of children'}</span>
                      <span className="font-medium">{metadata.childrenCount}</span>
                    </div>
                  )}
                  {metadata.waterToys !== undefined && (
                    <div className="flex justify-between py-2 border-b border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Jeux d\'eau' : 'Water toys'}</span>
                      <span className="font-medium">{metadata.waterToys === 'yes' || metadata.waterToys === true ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {metadata.wantsExcursion && (
                    <div className="flex justify-between py-2 border-b border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Excursion' : 'Excursion'}</span>
                      <span className="font-medium">{locale === 'fr' ? 'Oui' : 'Yes'}</span>
                    </div>
                  )}
                  {metadata.needsSkipper && (
                    <div className="flex justify-between py-2 border-b border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Skipper demandé' : 'Skipper requested'}</span>
                      <span className="font-medium">{locale === 'fr' ? 'Oui' : 'Yes'}</span>
                      {metadata.effectiveSkipperPrice && (
                        <span className="text-black/50 text-sm ml-2">({metadata.effectiveSkipperPrice}€ HT/jour)</span>
                      )}
                    </div>
                  )}
                  {selectedOptions.length > 0 && (
                    <div className="py-2 border-b border-black/10">
                      <div className="text-black/70 mb-2">{locale === 'fr' ? 'Options sélectionnées' : 'Selected options'}</div>
                      <ul className="space-y-1">
                        {selectedOptions.map(opt => (
                          <li key={opt.id} className="text-sm">
                            • {opt.label} {opt.price != null ? `(${fmt(opt.price)})` : `(${locale === 'fr' ? 'Inclus' : 'Included'})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {metadata.specialNeeds && (
                    <div className="py-2">
                      <div className="text-black/70 mb-1">{locale === 'fr' ? 'Besoins spéciaux' : 'Special needs'}</div>
                      <p className="text-sm text-black/80 whitespace-pre-line">{typeof metadata.specialNeeds === 'string' ? (metadata.specialNeeds.includes('%') ? decodeURIComponent(metadata.specialNeeds) : metadata.specialNeeds) : String(metadata.specialNeeds)}</p>
                    </div>
                  )}
                  {metadata.departurePort && String(metadata.departurePort).trim() !== '' && String(metadata.departurePort).trim() !== 'Port à définir' && (
                    <div className="flex justify-between py-2 border-t border-black/10">
                      <span className="text-black/70">{locale === 'fr' ? 'Port de départ' : 'Departure port'}</span>
                      <span className="font-medium">{String(metadata.departurePort).trim()}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Dates importantes */}
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">{locale === 'fr' ? 'Dates importantes' : 'Important dates'}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-black/10">
                  <span className="text-black/70">{locale === 'fr' ? 'Date de création' : 'Created at'}</span>
                  <span className="font-medium">{new Date(reservation.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                </div>
                {reservation.depositPaidAt && (
                  <div className="flex justify-between py-2 border-b border-black/10">
                    <span className="text-black/70">{locale === 'fr' ? 'Acompte payé le' : 'Deposit paid on'}</span>
                    <span className="font-medium">{new Date(reservation.depositPaidAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                  </div>
                )}
                {reservation.completedAt && (
                  <div className="flex justify-between py-2">
                    <span className="text-black/70">{locale === 'fr' ? 'Terminée le' : 'Completed on'}</span>
                    <span className="font-medium">{new Date(reservation.completedAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Colonne latérale - Facturation */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-semibold mb-4">{locale === 'fr' ? 'Facturation' : 'Billing'}</h2>
              <div className="space-y-3">
                {reservation.depositAmount && (
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <div className="text-xs text-emerald-700 mb-1">{locale === 'fr' ? 'Acompte' : 'Deposit'}</div>
                    <div className="text-xl font-bold text-emerald-700">{fmt(reservation.depositAmount)}</div>
                    <a 
                      href={`/api/invoices/${reservation.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-emerald-700 hover:underline"
                    >
                      {locale === 'fr' ? 'Télécharger la facture' : 'Download invoice'} →
                    </a>
                  </div>
                )}
                {reservation.remainingAmount && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-blue-700 mb-1">{locale === 'fr' ? 'Reste à payer' : 'Remaining'}</div>
                    <div className="text-xl font-bold text-blue-700">{fmt(reservation.remainingAmount)}</div>
                  </div>
                )}
                {reservation.totalPrice && (
                  <div className="bg-black/5 rounded-lg p-4 border border-black/10">
                    <div className="text-xs text-black/60 mb-1">{locale === 'fr' ? 'Total' : 'Total'}</div>
                    <div className="text-2xl font-bold">{fmt(reservation.totalPrice)}</div>
                  </div>
                )}
                {reservation.status === 'completed' && (
                  <a 
                    href={`/api/invoices/final/${reservation.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center rounded-lg border border-black/15 bg-white hover:bg-black/5 px-4 h-10 text-sm font-medium transition-colors"
                  >
                    {locale === 'fr' ? 'Facture finale' : 'Final invoice'} →
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
