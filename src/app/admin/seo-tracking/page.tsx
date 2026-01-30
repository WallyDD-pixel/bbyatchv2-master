import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import SEOTrackingForm from './SEOTrackingForm';
import AdminInstructions from '@/components/AdminInstructions';

export default async function SEOTrackingPage({ searchParams }: { searchParams?: Promise<{ lang?: string }> }) {
  const session = await getServerSession() as any;
  if (!session?.user) redirect('/signin');
  if ((session.user as any)?.role !== 'admin') redirect('/dashboard');
  
  // Next.js 15: searchParams is a Promise
  const sp = searchParams ? await searchParams : {};
  const locale: Locale = sp?.lang === 'en' ? 'en' : 'fr';
  const t = messages[locale];

  const settings = await prisma.settings.findFirst();

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-4xl mx-auto px-4 py-10 w-full'>
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
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
          <AdminInstructions
            locale={locale}
            title={locale==='fr'?'Comment configurer le SEO et le tracking':'How to configure SEO and tracking'}
            instructions={[
              {
                title: locale==='fr'?'Facebook Pixel':'Facebook Pixel',
                description: locale==='fr'?'Ajoutez votre ID Facebook Pixel pour suivre les conversions et les événements sur votre site.':'Add your Facebook Pixel ID to track conversions and events on your site.'
              },
              {
                title: locale==='fr'?'Google Analytics':'Google Analytics',
                description: locale==='fr'?'Ajoutez votre ID de mesure Google Analytics (G-XXXXXXXXXX) pour suivre le trafic et le comportement des visiteurs.':'Add your Google Analytics measurement ID (G-XXXXXXXXXX) to track traffic and visitor behavior.'
              },
              {
                title: locale==='fr'?'Meta Title et Description':'Meta Title and Description',
                description: locale==='fr'?'Définissez le titre et la description par défaut qui apparaîtront dans les résultats de recherche et les réseaux sociaux.':'Set the default title and description that will appear in search results and social networks.'
              },
              {
                title: locale==='fr'?'Sauvegarder':'Save',
                description: locale==='fr'?'N\'oubliez pas de cliquer sur "Enregistrer" après avoir modifié les paramètres pour qu\'ils soient pris en compte.':'Don\'t forget to click "Save" after modifying settings for them to take effect.'
              }
            ]}
          />
        </div>

        <SEOTrackingForm settings={settings} locale={locale} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}





