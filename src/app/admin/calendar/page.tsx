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
        <h1 className='text-2xl font-bold mb-6'>{locale==='fr'?'Calendrier disponibilité':'Availability calendar'}</h1>
        <CalendarClient locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
