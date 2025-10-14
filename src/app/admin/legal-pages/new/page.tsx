import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';

export default async function AdminLegalNew({ searchParams }: { searchParams?: { lang?: string } }){
  const session = await getServerSession(auth as any) as any;
  if(!session?.user) redirect('/signin');
  if((session.user as any).role !== 'admin') redirect('/dashboard');
  const locale: Locale = searchParams?.lang==='en'? 'en':'fr';
  const t = messages[locale];

  return (
    <div className='min-h-screen flex flex-col'>
      <HeaderBar initialLocale={locale} />
      <main className='flex-1 max-w-3xl mx-auto px-4 py-10 w-full'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>{locale==='fr'? 'Nouvelle page légale':'New legal page'}</h1>
          <a href='/admin/legal-pages' className='text-sm rounded-full border border-black/15 px-3 h-9 inline-flex items-center hover:bg-black/5'>← {locale==='fr'? 'Retour':'Back'}</a>
        </div>
        <div className='mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm'>
          <form action='/api/admin/legal-pages' method='post' className='grid gap-4'>
            <label className='grid gap-1 text-sm'><span>Slug *</span><input name='slug' required className='h-11 rounded-lg border border-black/15 px-3' placeholder='conditions-paiement-location' /></label>
            <label className='grid gap-1 text-sm'><span>Titre (FR) *</span><input name='titleFr' required className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Titre (EN) *</span><input name='titleEn' required className='h-11 rounded-lg border border-black/15 px-3' /></label>
            <label className='grid gap-1 text-sm'><span>Intro (FR)</span><textarea name='introFr' rows={3} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Intro (EN)</span><textarea name='introEn' rows={3} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Infos générales (FR)</span><textarea name='contentFr' rows={5} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Infos générales (EN)</span><textarea name='contentEn' rows={5} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Annulation (FR)</span><textarea name='cancellationFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Annulation (EN)</span><textarea name='cancellationEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Paiement (FR)</span><textarea name='paymentFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Paiement (EN)</span><textarea name='paymentEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Carburant & Dépôt (FR)</span><textarea name='fuelDepositFr' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <label className='grid gap-1 text-sm'><span>Fuel & Deposit (EN)</span><textarea name='fuelDepositEn' rows={4} className='rounded-lg border border-black/15 px-3 py-2' /></label>
            <div className='flex justify-end gap-2'>
              <a href='/admin/legal-pages' className='rounded-full h-10 px-4 border border-black/15 bg-white hover:bg-black/5'>{locale==='fr'? 'Annuler':'Cancel'}</a>
              <button type='submit' className='rounded-full h-10 px-6 bg-[color:var(--primary)] text-white font-semibold hover:opacity-90'>{locale==='fr'? 'Créer':'Create'}</button>
            </div>
          </form>
        </div>
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
