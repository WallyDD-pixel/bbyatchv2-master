import { getServerSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ReservationDetail {
  id: string;
  reference: string | null;
  startDate: Date;
  endDate: Date;
  part: string | null;
  passengers: number | null;
  status: string;
  totalPrice: number | null;
  depositAmount: number | null;
  remainingAmount: number | null;
  finalFuelAmount: number | null;
  depositPercent: number | null;
  commissionAmount: number | null;
  commissionRate: number | null;
  refundAmount: number | null;
  currency: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeCustomerId: string | null;
  stripeInvoiceId: string | null;
  stripeRefundId: string | null;
  depositPaidAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  cancellationReason: string | null;
  notesInternal: string | null;
  metadata: string | null;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    zip: string | null;
    country: string | null;
  };
  boat: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    capacity: number | null;
    lengthM: number | null;
    speedKn: number | null;
    pricePerDay: number | null;
    priceAm: number | null;
    pricePm: number | null;
    skipperRequired: boolean | null;
    skipperPrice: number | null;
    options: { id: number; label: string; price: number | null }[];
  } | null;
}

export default async function ReservationDetailPage(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const session = await getServerSession();
  if (!session?.user) redirect('/signin');
  const role = (session.user as any)?.role || 'user';
  if (role !== 'admin') redirect('/dashboard');
  
  const { id } = await params;
  const sp = await (searchParams || Promise.resolve({} as any));
  const langParam = Array.isArray((sp as any).lang) ? (sp as any).lang[0] : (sp as any).lang;
  const locale: Locale = langParam === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          city: true,
          zip: true,
          country: true,
        },
      },
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
  }) as ReservationDetail | null;

  if (!reservation) notFound();

  // Parse metadata
  let metadataObj: any = {};
  if (reservation.metadata) {
    try {
      metadataObj = typeof reservation.metadata === 'string' ? JSON.parse(reservation.metadata) : reservation.metadata;
    } catch (e) {
      console.error('Error parsing metadata:', e);
      // Si le parsing échoue, essayer de traiter comme un objet simple
      try {
        metadataObj = JSON.parse(reservation.metadata);
      } catch (e2) {
        console.error('Failed to parse metadata as JSON:', reservation.metadata);
      }
    }
  }
  
  // Debug: afficher les métadonnées dans la console
  if (process.env.NODE_ENV !== 'production') {
    console.log('Reservation metadata:', reservation.metadata);
    console.log('Parsed metadataObj:', metadataObj);
    console.log('Metadata keys:', Object.keys(metadataObj));
  }

  // Format dates
  const start = reservation.startDate ? new Date(reservation.startDate).toISOString().slice(0, 10) : '';
  const end = reservation.endDate ? new Date(reservation.endDate).toISOString().slice(0, 10) : start;
  const dateDisplay = start + (end && end !== start ? ' → ' + end : '');
  const dayCount = start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1 : 1;

  // Format money
  const money = (v: number | null | undefined) =>
    v == null ? '—' : (v / 1).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US') + ' €';

  // Status label
  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending_deposit':
        return locale === 'fr' ? 'Acompte en attente' : 'Deposit pending';
      case 'deposit_paid':
        return locale === 'fr' ? 'Acompte payé' : 'Deposit paid';
      case 'completed':
        return locale === 'fr' ? 'Terminée' : 'Completed';
      case 'cancelled':
        return locale === 'fr' ? 'Annulée' : 'Cancelled';
      default:
        return s;
    }
  };

  const statusBadgeClass = (s: string) => {
    switch (s) {
      case 'deposit_paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending_deposit':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-black/10 text-black/60';
    }
  };

  const partLabel = (p: string | null) =>
    p === 'FULL'
      ? locale === 'fr'
        ? 'Journée entière'
        : 'Full day'
      : p === 'AM'
      ? locale === 'fr'
        ? 'Matin'
        : 'Morning'
      : p === 'PM'
      ? locale === 'fr'
        ? 'Après-midi'
        : 'Afternoon'
      : '—';

  const userName =
    (reservation.user.firstName || '') + (reservation.user.lastName ? ' ' + reservation.user.lastName : '') ||
    reservation.user.name ||
    reservation.user.email ||
    '';

  // Calculate payment status
  // Si la réservation existe, c'est qu'il y a eu au moins un acompte
  const hasPaidDeposit = !!reservation.depositPaidAt || reservation.status === 'deposit_paid' || reservation.status === 'completed';
  const isFullyPaid = reservation.status === 'completed' && (reservation.remainingAmount === 0 || reservation.remainingAmount === null);
  const paymentStatus = isFullyPaid
    ? locale === 'fr'
      ? 'Entièrement payé'
      : 'Fully paid'
    : hasPaidDeposit
    ? locale === 'fr'
      ? 'Acompte payé'
      : 'Deposit paid'
    : // Si la réservation existe mais pas de statut de paiement, on considère qu'il y a eu un acompte
    locale === 'fr'
    ? 'Acompte payé'
    : 'Deposit paid';

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-6xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between gap-4 flex-wrap mb-6'>
          <h1 className='text-2xl font-bold'>{locale === 'fr' ? 'Détails de la réservation' : 'Reservation details'}</h1>
          <Link
            href={`/admin/reservations${locale === 'en' ? '?lang=en' : ''}`}
            className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'
          >
            ← {locale === 'fr' ? 'Retour' : 'Back'}
          </Link>
        </div>

        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Colonne gauche : Informations principales */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Informations de base */}
            <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
              <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Informations de base' : 'Basic information'}</h2>
              <div className='grid gap-4 text-sm'>
                <div className='grid gap-1'>
                  <span className='text-black/50'>{locale === 'fr' ? 'Référence' : 'Reference'}</span>
                  <code className='text-xs bg-black/5 rounded px-2 py-1'>{reservation.reference || reservation.id}</code>
                </div>
                <div className='grid gap-1'>
                  <span className='text-black/50'>{locale === 'fr' ? 'Dates' : 'Dates'}</span>
                  <span className='font-medium'>{dateDisplay}</span>
                  <span className='text-xs text-black/50'>
                    {dayCount} {locale === 'fr' ? 'jour(s)' : 'day(s)'} • {partLabel(reservation.part)}
                  </span>
                </div>
                <div className='grid gap-1'>
                  <span className='text-black/50'>{locale === 'fr' ? 'Réservation créée le' : 'Reservation created on'}</span>
                  <span className='font-medium'>
                    {new Date(reservation.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: locale === 'en'
                    })}
                  </span>
                </div>
                {reservation.passengers && (
                  <div className='grid gap-1'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Passagers' : 'Passengers'}</span>
                    <span>{reservation.passengers}</span>
                  </div>
                )}
                <div className='grid gap-1'>
                  <span className='text-black/50'>{locale === 'fr' ? 'Statut' : 'Status'}</span>
                  <span>
                    <span className={`inline-flex text-xs px-2 h-6 rounded-full border border-black/15 ${statusBadgeClass(reservation.status)}`}>
                      {statusLabel(reservation.status)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Informations du client */}
            <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
              <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Informations du client' : 'Client information'}</h2>
              <div className='grid gap-4 text-sm'>
                {(reservation.user.firstName || reservation.user.lastName) && (
                  <>
                    {reservation.user.firstName && (
                      <div className='grid gap-1'>
                        <span className='text-black/50'>{locale === 'fr' ? 'Prénom' : 'First name'}</span>
                        <span className='font-medium'>{reservation.user.firstName}</span>
                      </div>
                    )}
                    {reservation.user.lastName && (
                      <div className='grid gap-1'>
                        <span className='text-black/50'>{locale === 'fr' ? 'Nom' : 'Last name'}</span>
                        <span className='font-medium'>{reservation.user.lastName}</span>
                      </div>
                    )}
                  </>
                )}
                {!reservation.user.firstName && !reservation.user.lastName && (
                  <div className='grid gap-1'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Nom' : 'Name'}</span>
                    <span className='font-medium'>{userName}</span>
                  </div>
                )}
                <div className='grid gap-1'>
                  <span className='text-black/50'>Email</span>
                  <a href={`mailto:${reservation.user.email}`} className='text-blue-600 hover:underline'>
                    {reservation.user.email}
                  </a>
                </div>
                {reservation.user.phone && (
                  <div className='grid gap-1'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Téléphone' : 'Phone'}</span>
                    <a href={`tel:${reservation.user.phone}`} className='text-blue-600 hover:underline'>
                      {reservation.user.phone}
                    </a>
                  </div>
                )}
                {!reservation.user.phone && (
                  <div className='grid gap-1'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Téléphone' : 'Phone'}</span>
                    <span className='text-black/40 italic'>{locale === 'fr' ? 'Non renseigné' : 'Not provided'}</span>
                  </div>
                )}
                {(reservation.user.address || reservation.user.city || reservation.user.zip || reservation.user.country) && (
                  <div className='grid gap-1'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Adresse' : 'Address'}</span>
                    <div className='text-black/70'>
                      {reservation.user.address && <div>{reservation.user.address}</div>}
                      {(reservation.user.city || reservation.user.zip) && (
                        <div>
                          {reservation.user.zip} {reservation.user.city}
                        </div>
                      )}
                      {reservation.user.country && <div>{reservation.user.country}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informations complémentaires */}
            <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
              <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Informations complémentaires' : 'Additional information'}</h2>
              {reservation.metadata && Object.keys(metadataObj).length > 0 ? (
                <div className='bg-black/5 rounded-lg p-4 space-y-3 text-xs'>
                  {/* Nombre d'enfants - toujours afficher */}
                  <div>
                    <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Nombre d\'enfants' : 'Number of children'}: </span>
                    <span>
                      {metadataObj.childrenCount !== undefined && metadataObj.childrenCount !== null
                        ? metadataObj.childrenCount > 0
                          ? metadataObj.childrenCount
                          : (locale === 'fr' ? 'Aucun enfant' : 'No children')
                        : metadataObj.children !== undefined && metadataObj.children !== null
                        ? metadataObj.children > 0
                          ? metadataObj.children
                          : (locale === 'fr' ? 'Aucun enfant' : 'No children')
                        : (locale === 'fr' ? 'Aucun enfant' : 'No children')}
                    </span>
                  </div>
                  {metadataObj.waterToys !== undefined && metadataObj.waterToys !== null && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Jeux d\'eau' : 'Water toys'}: </span>
                      <span>{metadataObj.waterToys === 'yes' || metadataObj.waterToys === true || metadataObj.waterToys === '1' ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {metadataObj.wantsExcursion !== undefined && metadataObj.wantsExcursion !== null && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Excursion' : 'Excursion'}: </span>
                      <span>{metadataObj.wantsExcursion === true || metadataObj.wantsExcursion === '1' ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {metadataObj.excursion !== undefined && metadataObj.excursion !== null && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Excursion' : 'Excursion'}: </span>
                      <span>{metadataObj.excursion === '1' || metadataObj.excursion === true ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {metadataObj.specialNeeds && (
                    <div>
                      <span className='font-semibold text-black/70 block mb-1'>{locale === 'fr' ? 'Besoins spéciaux / Demandes spécifiques' : 'Special needs / Specific requests'}: </span>
                      <p className='text-black/70 whitespace-pre-line bg-white/50 rounded p-2 border border-black/10'>
                        {typeof metadataObj.specialNeeds === 'string' ? (metadataObj.specialNeeds.includes('%') ? decodeURIComponent(metadataObj.specialNeeds) : metadataObj.specialNeeds) : String(metadataObj.specialNeeds)}
                      </p>
                    </div>
                  )}
                  {metadataObj.optionIds && Array.isArray(metadataObj.optionIds) && metadataObj.optionIds.length > 0 && (
                    <div>
                      <span className='font-semibold text-black/70 block mb-1'>{locale === 'fr' ? 'Options sélectionnées' : 'Selected options'}: </span>
                      <ul className='list-disc list-inside space-y-0.5 text-black/60'>
                        {metadataObj.optionIds.map((optId: number) => {
                          const option = reservation.boat?.options?.find((o: any) => o.id === optId);
                          if (!option) return <li key={optId}>Option ID: {optId}</li>;
                          
                          // Nettoyer le label pour enlever les mentions FR/EN
                          let cleanLabel = option.label || '';
                          // Supprimer les patterns comme " (FR)", " (EN)", " - FR", " - EN", etc.
                          cleanLabel = cleanLabel.replace(/\s*\(?\s*(FR|EN|fr|en)\s*\)?\s*$/gi, '').trim();
                          cleanLabel = cleanLabel.replace(/\s*-\s*(FR|EN|fr|en)\s*$/gi, '').trim();
                          cleanLabel = cleanLabel.replace(/\s*\[(FR|EN|fr|en)\]\s*$/gi, '').trim();
                          
                          return (
                            <li key={optId}>
                              {cleanLabel} {option.price != null ? `(${option.price.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} €)` : (locale === 'fr' ? '(Inclus)' : '(Included)')}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {metadataObj.needsSkipper !== undefined && metadataObj.needsSkipper !== null && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Skipper requis' : 'Skipper required'}: </span>
                      <span>{metadataObj.needsSkipper === true || metadataObj.needsSkipper === '1' ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {metadataObj.skipperRequired !== undefined && metadataObj.skipperRequired !== null && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Skipper requis' : 'Skipper required'}: </span>
                      <span>{metadataObj.skipperRequired === true || metadataObj.skipperRequired === '1' ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No')}</span>
                    </div>
                  )}
                  {(metadataObj.departurePort || metadataObj.departurePort === 'Port à définir') && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Port de départ' : 'Departure port'}: </span>
                      <span>{metadataObj.departurePort === 'Port à définir' ? (locale === 'fr' ? 'À définir' : 'To be determined') : metadataObj.departurePort}</span>
                    </div>
                  )}
                  {metadataObj.bookingDate && (
                    <div>
                      <span className='font-semibold text-black/70'>{locale === 'fr' ? 'Date de réservation' : 'Booking date'}: </span>
                      <span>{new Date(metadataObj.bookingDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                    </div>
                  )}
                  {/* Informations sur l'expérience si présente */}
                  {metadataObj.experienceId && (
                    <div className='pt-2 border-t border-black/10'>
                      <span className='font-semibold text-black/70 block mb-1'>{locale === 'fr' ? 'Expérience' : 'Experience'}:</span>
                      <div className='space-y-1 text-black/60'>
                        {metadataObj.experienceTitleFr && (
                          <div>
                            <span className='font-medium'>{locale === 'fr' ? 'Titre (FR)' : 'Title (FR)'}: </span>
                            {metadataObj.experienceTitleFr}
                          </div>
                        )}
                        {metadataObj.experienceTitleEn && (
                          <div>
                            <span className='font-medium'>{locale === 'fr' ? 'Titre (EN)' : 'Title (EN)'}: </span>
                            {metadataObj.experienceTitleEn}
                          </div>
                        )}
                        {metadataObj.expSlug && (
                          <div>
                            <span className='font-medium'>{locale === 'fr' ? 'Slug' : 'Slug'}: </span>
                            {metadataObj.expSlug}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Afficher toutes les autres clés du metadata (sauf celles déjà affichées) */}
                  {Object.keys(metadataObj).filter(key => 
                    !['childrenCount', 'children', 'waterToys', 'wantsExcursion', 'excursion', 'specialNeeds', 
                      'optionIds', 'needsSkipper', 'skipperRequired', 'bookingDate', 'departurePort',
                      'experienceId', 'expSlug', 'experienceTitleFr', 'experienceTitleEn'].includes(key)
                  ).length > 0 && (
                    <div className='pt-2 border-t border-black/10'>
                      <span className='font-semibold text-black/70 block mb-1'>{locale === 'fr' ? 'Autres informations' : 'Other information'}:</span>
                      <ul className='space-y-1 text-black/60'>
                        {Object.keys(metadataObj).filter(key => 
                          !['childrenCount', 'children', 'waterToys', 'wantsExcursion', 'excursion', 'specialNeeds', 
                            'optionIds', 'needsSkipper', 'skipperRequired', 'bookingDate', 'departurePort',
                            'experienceId', 'expSlug', 'experienceTitleFr', 'experienceTitleEn'].includes(key)
                        ).map(key => {
                          let displayValue = metadataObj[key];
                          // Formater les valeurs selon leur type
                          if (typeof displayValue === 'boolean') {
                            displayValue = displayValue ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No');
                          } else if (typeof displayValue === 'object') {
                            displayValue = JSON.stringify(displayValue);
                          } else if (key.includes('Date') || key.includes('date')) {
                            try {
                              displayValue = new Date(displayValue).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB');
                            } catch {}
                          }
                          return (
                            <li key={key}>
                              <span className='font-medium'>{key}:</span> {String(displayValue)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className='bg-black/5 rounded-lg p-4 text-xs text-black/50 italic'>
                  {locale === 'fr' ? 'Aucune information complémentaire disponible' : 'No additional information available'}
                  {reservation.metadata && (
                    <div className='mt-2 text-[10px] text-black/40'>
                      {locale === 'fr' ? 'Métadonnées brutes:' : 'Raw metadata:'} {reservation.metadata.substring(0, 100)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Bateau et paiements */}
          <div className='space-y-6'>
            {/* Informations du bateau */}
            {reservation.boat && (
              <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
                <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Bateau' : 'Boat'}</h2>
                <div className='space-y-4'>
                  {reservation.boat.imageUrl && (
                    <img
                      src={reservation.boat.imageUrl}
                      alt={reservation.boat.name}
                      className='w-full h-48 object-cover rounded-lg'
                    />
                  )}
                  <div className='grid gap-2 text-sm'>
                    <div>
                      <Link
                        href={`/boats/${reservation.boat.slug}`}
                        className='text-lg font-semibold text-blue-600 hover:underline'
                      >
                        {reservation.boat.name}
                      </Link>
                    </div>
                    {reservation.boat.capacity && (
                      <div>
                        <span className='text-black/50'>{locale === 'fr' ? 'Capacité' : 'Capacity'}: </span>
                        <span>{reservation.boat.capacity} {locale === 'fr' ? 'personnes' : 'people'}</span>
                      </div>
                    )}
                    {reservation.boat.lengthM && (
                      <div>
                        <span className='text-black/50'>{locale === 'fr' ? 'Longueur' : 'Length'}: </span>
                        <span>{reservation.boat.lengthM}m</span>
                      </div>
                    )}
                    {reservation.boat.speedKn && (
                      <div>
                        <span className='text-black/50'>{locale === 'fr' ? 'Vitesse' : 'Speed'}: </span>
                        <span>{reservation.boat.speedKn} {locale === 'fr' ? 'nœuds' : 'knots'}</span>
                      </div>
                    )}
                    {reservation.boat.skipperRequired && (
                      <div>
                        <span className='text-black/50'>{locale === 'fr' ? 'Skipper requis' : 'Skipper required'}: </span>
                        <span>{locale === 'fr' ? 'Oui' : 'Yes'}</span>
                        {reservation.boat.skipperPrice && (
                          <span className='ml-2 text-black/50'>({reservation.boat.skipperPrice}€ HT/jour)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Paiements et factures */}
            <div className='rounded-2xl border border-black/10 bg-white p-6 shadow-sm'>
              <h2 className='text-lg font-semibold mb-4'>{locale === 'fr' ? 'Paiements et factures' : 'Payments and invoices'}</h2>
              <div className='space-y-4 text-sm'>
                <div className='grid gap-2 pb-3 border-b border-black/10'>
                  <div className='flex justify-between'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Montant total (bateau + options + skipper)' : 'Total amount (boat + options + skipper)'}</span>
                    <span className='font-semibold text-lg'>{money(reservation.totalPrice)}</span>
                  </div>
                  {reservation.depositAmount && (
                    <div className='flex justify-between'>
                      <span className='text-black/50'>{locale === 'fr' ? 'Acompte (20% sur bateau + options)' : 'Deposit (20% on boat + options)'}</span>
                      <span className='font-medium'>{money(reservation.depositAmount)}</span>
                    </div>
                  )}
                  {reservation.remainingAmount !== null && (
                    <div className='flex justify-between'>
                      <span className='text-black/50'>{locale === 'fr' ? 'Reste à payer (bateau + options)' : 'Remaining (boat + options)'}</span>
                      <span className='font-medium'>{money(reservation.remainingAmount)}</span>
                    </div>
                  )}
                  {reservation.boat?.skipperRequired && reservation.boat?.skipperPrice && (
                    <div className='flex justify-between pt-2 border-t border-black/5'>
                      <span className='text-black/50'>{locale === 'fr' ? 'Skipper (payé sur place)' : 'Skipper (paid on site)'}</span>
                      <span className='font-medium text-blue-600'>{money(reservation.boat.skipperPrice * (dayCount || 1))}</span>
                    </div>
                  )}
                  {reservation.finalFuelAmount && (
                    <div className='flex justify-between pt-2 border-t border-black/5'>
                      <span className='text-black/50'>{locale === 'fr' ? 'Carburant (payé sur place)' : 'Fuel (paid on site)'}</span>
                      <span className='font-medium text-blue-600'>{money(reservation.finalFuelAmount)}</span>
                    </div>
                  )}
                  {!reservation.finalFuelAmount && (
                    <div className='flex justify-between pt-2 border-t border-black/5'>
                      <span className='text-black/50'>{locale === 'fr' ? 'Carburant (payé sur place)' : 'Fuel (paid on site)'}</span>
                      <span className='font-medium text-blue-600'>{locale === 'fr' ? 'À définir' : 'To be determined'}</span>
                    </div>
                  )}
                </div>
                
                {/* Note explicative */}
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800'>
                  <p className='font-semibold mb-1'>{locale === 'fr' ? 'ℹ️ Information importante' : 'ℹ️ Important information'}</p>
                  <p className='mb-1'>
                    {locale === 'fr' 
                      ? "L'acompte de 20% s'applique uniquement sur le prix du bateau et des options."
                      : "The 20% deposit applies only to the boat price and options."}
                  </p>
                  <p>
                    {locale === 'fr' 
                      ? "Le skipper et le carburant sont payés séparément sur place le jour de l'embarquement."
                      : "The skipper and fuel are paid separately on site on the day of boarding."}
                  </p>
                </div>

                <div className='grid gap-2'>
                  <div className='flex justify-between items-center'>
                    <span className='text-black/50'>{locale === 'fr' ? 'Statut de paiement' : 'Payment status'}</span>
                    <span className={`font-medium ${hasPaidDeposit ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {paymentStatus}
                    </span>
                  </div>
                  {(reservation.depositPaidAt || hasPaidDeposit) && (
                    <div className='text-xs text-black/50'>
                      {locale === 'fr' ? 'Acompte payé le' : 'Deposit paid on'}:{' '}
                      {reservation.depositPaidAt
                        ? new Date(reservation.depositPaidAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')
                        : reservation.createdAt
                        ? new Date(reservation.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')
                        : locale === 'fr'
                        ? 'Date non disponible'
                        : 'Date not available'}
                    </div>
                  )}
                  {reservation.completedAt && (
                    <div className='text-xs text-black/50'>
                      {locale === 'fr' ? 'Terminée le' : 'Completed on'}:{' '}
                      {new Date(reservation.completedAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')}
                    </div>
                  )}
                </div>

                <div className='pt-3 border-t border-black/10 space-y-2'>
                  <h3 className='text-xs font-semibold text-black/60 uppercase tracking-wide'>
                    {locale === 'fr' ? 'Factures' : 'Invoices'}
                  </h3>
                  <div className='flex flex-col gap-2'>
                    <a
                      href={`/api/invoices/${reservation.id}`}
                      target='_blank'
                      className='inline-flex items-center justify-center rounded-lg border border-black/15 px-4 h-9 text-sm hover:bg-black/5 transition-colors'
                    >
                      📄 {locale === 'fr' ? 'Facture acompte' : 'Deposit invoice'} (PDF)
                    </a>
                    {reservation.status === 'completed' && (
                      <a
                        href={`/api/invoices/final/${reservation.id}`}
                        target='_blank'
                        className='inline-flex items-center justify-center rounded-lg border border-black/15 px-4 h-9 text-sm hover:bg-black/5 transition-colors'
                      >
                        📄 {locale === 'fr' ? 'Facture finale' : 'Final invoice'} (PDF)
                      </a>
                    )}
                  </div>
                </div>

                {reservation.stripePaymentIntentId && (
                  <div className='pt-3 border-t border-black/10'>
                    <div className='text-xs text-black/50'>
                      {locale === 'fr' ? 'Stripe Payment Intent' : 'Stripe Payment Intent'}:{' '}
                      <code className='text-xs bg-black/5 rounded px-1'>{reservation.stripePaymentIntentId}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
