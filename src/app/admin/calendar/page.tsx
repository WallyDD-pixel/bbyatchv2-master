import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import CalendarClient from './CalendarClient';

export default async function CalendarPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect('/signin');
  if ((session.user as any)?.role !== 'admin') redirect('/dashboard');
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];
  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-7xl mx-auto w-full px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-4'>{locale==='fr'?'Calendrier disponibilité':'Availability calendar'}</h1>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
            <h2 className='font-semibold text-blue-900 mb-2'>📖 Comment utiliser le calendrier</h2>
            <ul className='text-sm text-blue-800 space-y-1.5 list-disc list-inside'>
              <li><strong>Vue globale :</strong> Par défaut, vous voyez toutes les réservations (en rouge) et tous les créneaux disponibles de tous les bateaux.</li>
              <li><strong>Sélectionner un bateau :</strong> Cliquez sur une carte de bateau dans la colonne de droite pour voir uniquement ses créneaux et réservations.</li>
              <li><strong>Ajouter des créneaux :</strong> Sélectionnez un bateau, puis cliquez sur "Ajouter un créneau" pour ouvrir le formulaire. Vous pouvez sélectionner une date unique ou plusieurs dates en cliquant directement sur le calendrier.</li>
              <li><strong>Voir les détails :</strong> Cliquez sur une réservation (bloc rouge) pour voir toutes les informations détaillées.</li>
              <li><strong>Modifier un créneau :</strong> Cliquez sur un créneau disponible (bloc coloré) pour ajouter une note ou le supprimer.</li>
              <li><strong>Code couleur :</strong> Bleu = Journée complète, Vert = Demi-journée, Orange = Sunset, Rouge = Réservations</li>
            </ul>
          </div>
        </div>
        <CalendarClient locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
