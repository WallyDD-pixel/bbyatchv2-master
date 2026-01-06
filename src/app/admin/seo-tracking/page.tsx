import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import SEOTrackingForm from './SEOTrackingForm';

export default async function SEOTrackingPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) redirect('/signin');
  if ((session.user as any)?.role !== 'admin') redirect('/dashboard');
  
  const locale: Locale = searchParams?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const settings = await prisma.settings.findFirst();

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-4xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-2xl font-bold'>SEO & Tracking</h1>
            <p className='text-sm text-black/60 mt-1'>
              Configurez les outils de suivi (Facebook Pixel, Google Analytics) et les paramètres SEO
            </p>
          </div>
          <a href='/admin' className='text-sm rounded-full border border-blue-400/30 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700'>
            ← Retour
          </a>
        </div>

        <SEOTrackingForm settings={settings} locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}

