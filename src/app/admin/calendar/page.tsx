import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { messages, type Locale } from '@/i18n/messages';
import CalendarClient from './CalendarClient';
import AdminInstructions from '@/components/AdminInstructions';

export default async function CalendarPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = await getServerSession() as any;
  if (!session?.user) redirect('/signin');
  if ((session.user as any)?.role !== 'admin') redirect('/dashboard');
  const sp = (await searchParams) || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  return (
    <div className='min-h-screen flex flex-col'>
      <main className='flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8'>
        <div className='mb-4 sm:mb-6'>
          <h1 className='text-xl sm:text-2xl font-bold mb-3 sm:mb-4'>{locale==='fr'?'Calendrier disponibilité':'Availability calendar'}</h1>
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment utiliser le calendrier':'How to use the calendar'}
            instructions={[
              {
                title: locale==='fr'?'Vue globale':'Global view',
                description: locale==='fr'?'Par défaut, vous voyez toutes les réservations (en rouge) et tous les créneaux disponibles de tous les bateaux.':'By default, you see all reservations (in red) and all available slots for all boats.'
              },
              {
                title: locale==='fr'?'Sélectionner un bateau':'Select a boat',
                description: locale==='fr'?'Cliquez sur une carte de bateau dans la colonne de droite pour voir uniquement ses créneaux et réservations.':'Click on a boat card in the right column to see only its slots and reservations.'
              },
              {
                title: locale==='fr'?'Ajouter des créneaux':'Add slots',
                description: locale==='fr'?'Sélectionnez un bateau, puis cliquez sur "Définir des disponibilités" pour ouvrir le formulaire. Vous pouvez sélectionner une date unique ou plusieurs dates en cliquant directement sur le calendrier.':'Select a boat, then click on "Define availability" to open the form. You can select a single date or multiple dates by clicking directly on the calendar.'
              },
              {
                title: locale==='fr'?'Voir les détails':'View details',
                description: locale==='fr'?'Cliquez sur une réservation (bloc rouge) pour voir toutes les informations détaillées.':'Click on a reservation (red block) to see all detailed information.'
              },
              {
                title: locale==='fr'?'Modifier un créneau':'Modify a slot',
                description: locale==='fr'?'Cliquez sur un créneau disponible (bloc coloré) pour voir les détails et ajouter une note.':'Click on an available slot (colored block) to see details and add a note.'
              },
              {
                title: locale==='fr'?'Code couleur':'Color code',
                description: locale==='fr'?'Bleu = Journée complète, Vert = Demi-journée, Violet = Sunset, Orange = Réservations agence, Rouge = Réservations':'Blue = Full day, Green = Half-day, Violet = Sunset, Orange = Agency requests, Red = Reservations'
              }
            ]}
          />
        </div>
        <CalendarClient locale={locale} />
      </main>
    </div>
  );
}
